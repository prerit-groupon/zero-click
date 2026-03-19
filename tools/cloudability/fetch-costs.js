#!/usr/bin/env node
/**
 * Cloud Cost Fetcher — Cloudability by IBM
 *
 * Fetches unified GCP + AWS costs from Cloudability API, runs anomaly
 * detection, and generates the daily cost digest consumed by the
 * /cloud-cost-optimizer skill.
 *
 * Usage:
 *   node fetch-costs.js --mode daily      # Full digest (costs + CUDs + anomalies)
 *   node fetch-costs.js --mode costs      # Raw cost data only
 *   node fetch-costs.js --mode accounts   # List all linked accounts
 *   node fetch-costs.js --mode cuds       # CUD portfolio + expiry alerts (GCP only)
 *   node fetch-costs.js --mode recommend  # Ranked savings recommendations
 *
 * Prerequisites:
 *   npm install node-fetch dotenv
 *
 * Credentials:
 *   Set CLOUDABILITY_API_TOKEN in tools/cloudability/.env
 *
 * Cloudability REST API reference:
 *   https://help.apptio.com/en-us/cloudability/api/v3/
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const BASE_URL = 'https://api.cloudability.com';
const API_TOKEN = process.env.CLOUDABILITY_API_TOKEN;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

const mode = process.argv.find(a => a.startsWith('--mode='))?.split('=')[1]
  || (process.argv.includes('--mode') && process.argv[process.argv.indexOf('--mode') + 1])
  || 'daily';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Cloudability API Client ─────────────────────────────────────────────────

function assertToken() {
  if (!API_TOKEN || API_TOKEN === 'your_token_here') {
    console.error('Error: CLOUDABILITY_API_TOKEN is not set in tools/cloudability/.env');
    console.error('Generate a token at: https://app.cloudability.com/settings/api');
    process.exit(1);
  }
}

async function cloudabilityGet(path, params = {}) {
  const { default: fetch } = await import('node-fetch');
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudability API ${res.status}: ${body}`);
  }

  return res.json();
}

// ─── Fetch: Linked Accounts ───────────────────────────────────────────────────

async function fetchAccounts() {
  assertToken();
  const data = await cloudabilityGet('/v3/accounts');
  return data.result || data;
}

// ─── Fetch: Daily Costs by Project/Account/Service/Region ────────────────────
//
// Cloudability cost report — groups by vendor, account, service, region for
// the requested date range.
// Docs: GET /v3/reporting/cost/run
//
// Key dimensions:
//   vendor_account_identifier — GCP project ID or AWS account ID
//   vendor_account_name       — human-readable project/account name
//   service_name              — GCP service / AWS service
//   region_name               — region
//   date                      — usage date (YYYY-MM-DD)
//
// Key metrics:
//   unblended_cost            — gross cost before discounts
//   amortized_cost            — cost after CUD/RI amortisation
//   net_amortized_cost        — amortized cost after credits/refunds

async function fetchDailyCosts(dateFrom = yesterday(), dateTo = yesterday()) {
  assertToken();

  const data = await cloudabilityGet('/v3/reporting/cost/run', {
    start_date: dateFrom,
    end_date: dateTo,
    dimensions: 'vendor,vendor_account_identifier,vendor_account_name,service_name,region_name,date',
    metrics: 'unblended_cost,amortized_cost,net_amortized_cost',
    sort: '-unblended_cost',
    limit: 1000,
  });

  return data.result || data.results || data;
}

// ─── Fetch: 7-Day Trend (for anomaly detection) ───────────────────────────────

async function fetch7DayTrend() {
  assertToken();

  const data = await cloudabilityGet('/v3/reporting/cost/run', {
    start_date: daysAgo(8),
    end_date: yesterday(),
    dimensions: 'vendor,vendor_account_identifier,service_name,date',
    metrics: 'net_amortized_cost',
    sort: 'date',
    limit: 5000,
  });

  return data.result || data.results || data;
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

function detectAnomalies(trendData, threshold = 0.20) {
  if (!trendData || !trendData.length) return [];

  const buckets = {};
  for (const row of trendData) {
    const key = `${row.vendor}::${row.vendor_account_identifier}::${row.service_name}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push({ date: row.date, cost: Number(row.net_amortized_cost || 0) });
  }

  const anomalies = [];
  for (const [key, entries] of Object.entries(buckets)) {
    entries.sort((a, b) => a.date > b.date ? 1 : -1);
    if (entries.length < 2) continue;

    const latest = entries[entries.length - 1];
    const prior = entries.slice(0, -1);
    const avg = prior.reduce((s, e) => s + e.cost, 0) / prior.length;
    if (avg === 0) continue;

    const delta = (latest.cost - avg) / avg;
    if (Math.abs(delta) > threshold) {
      const [vendor, accountId, service] = key.split('::');
      anomalies.push({
        vendor,
        account_id: accountId,
        service,
        today_cost: latest.cost,
        avg_7d: avg,
        delta_pct: (delta * 100).toFixed(1),
        severity: Math.abs(delta) > 0.40 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct));
}

// ─── CUD Expiry Alerts (GCP — from billing export reference) ─────────────────
//
// Source: tools/cloudability/.env + .claude/skills/cloud-cost-optimizer/references/cud-portfolio.md
// Update this list each time the CUD portfolio changes.

function getCUDExpiryAlerts() {
  const today = new Date();
  const cuds = [
    // EXPIRING SOON
    { name: '2025-04-11_cloud-sql',   type: 'Cloud SQL CUD',          amount: '$7.50/hr',  expiry: '2026-04-11', region: 'us-central1' },
    { name: '2025-04-11_memorystore', type: 'Memorystore Redis CUD',   amount: '$12.00/hr', expiry: '2026-04-11', region: 'global' },
    // ACTIVE (long-dated)
    { name: 'spend-cloud-sql-2025-11-24',        type: 'Cloud SQL CUD',         amount: '$13.40/hr', expiry: '2028-11-24', region: 'us-central1' },
    { name: 'compute-flexible-2025-11-24',       type: 'Compute Flexible CUD',  amount: '$38.00/hr', expiry: '2028-11-24', region: 'global' },
    { name: 'compute-flexible-2025-12-23-3y',    type: 'Compute Flexible CUD',  amount: '$31.00/hr', expiry: '2028-12-23', region: 'global' },
    // Resource-based (sample — all expire 2026-11/12)
    { name: 'resource-conveyor-prod-e2-2025-12',     type: 'E2 Resource CUD', amount: '400 vCPU / 3000 GB', expiry: '2026-12-16', region: 'us-central1' },
    { name: 'resource-janus-e2-2025-11-19',          type: 'E2 Resource CUD', amount: '249 vCPU / 1414 GB', expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-ingestion-e2-2025-11-19',      type: 'E2 Resource CUD', amount: '136 vCPU / 724 GB',  expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-pipelines-2025-11-19',         type: 'E2 Resource CUD', amount: '300 vCPU / 1500 GB', expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-data-comp-n1-2025-11-19',      type: 'N1 Resource CUD', amount: '96 vCPU / 470 GB',   expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-janus-n1-2025-11-19',          type: 'N1 Resource CUD', amount: '63 vCPU / 297 GB',   expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-data-comp-n2-2025-11-19',      type: 'N2 Resource CUD', amount: '240 vCPU / 1715 GB', expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-tableau-n2-2025-11-19',        type: 'N2 Resource CUD', amount: '102 vCPU / 819 GB',  expiry: '2026-11-20', region: 'us-central1' },
    { name: 'resource-mta-net-prod-e2-eu-2025-12',   type: 'E2 Resource CUD', amount: '203 vCPU / 812 GB',  expiry: '2026-12-24', region: 'europe-west1' },
  ];

  return cuds.map(c => {
    const daysLeft = Math.round((new Date(c.expiry) - today) / 86400000);
    return { ...c, days_left: daysLeft, alert: daysLeft <= 90 };
  });
}

// ─── Savings Recommendations ─────────────────────────────────────────────────

function getSavingsRecommendations() {
  return [
    { priority: 'P0', cloud: 'GCP', resource: 'Cloud SQL CUD (2025-04-11_cloud-sql)',   action: 'Renew $7.50/hr before 2026-04-11',       savings_mo: 'Risk: ~$5,475/mo if missed' },
    { priority: 'P0', cloud: 'GCP', resource: 'Memorystore CUD (2025-04-11_memorystore)', action: 'Renew $12.00/hr before 2026-04-11',    savings_mo: 'Risk: ~$8,760/mo if missed' },
    { priority: 'P1', cloud: 'GCP', resource: 'Cloud SQL (us-central1)',                action: 'Increase spend CUD coverage',             savings_mo: '$954.42' },
    { priority: 'P1', cloud: 'GCP', resource: 'N1 Cores (us-central1) — 159 vCPU gap', action: 'Add resource CUD for uncovered N1 vCPUs', savings_mo: '$608.89' },
    { priority: 'P1', cloud: 'GCP', resource: 'N1 Memory (us-central1) — 767 GB gap',  action: 'Add resource CUD for uncovered N1 RAM',   savings_mo: '$239.24' },
    { priority: 'P2', cloud: 'GCP', resource: 'C2D Cores (us-central1) — minor gap',   action: 'Increase C2D CUD slightly',               savings_mo: '$14.99' },
  ];
}

// ─── Report Formatting ────────────────────────────────────────────────────────

function formatSummaryTable(costs) {
  if (!costs || !costs.length) return '> No billing data available — check CLOUDABILITY_API_TOKEN';

  const byVendor = {};
  for (const row of costs) {
    const v = row.vendor || 'Unknown';
    byVendor[v] = (byVendor[v] || 0) + Number(row.net_amortized_cost || row.unblended_cost || 0);
  }

  const total = Object.values(byVendor).reduce((s, v) => s + v, 0);
  const lines = [
    `| Cloud | Net Cost |`,
    `|-------|----------|`,
  ];
  for (const [v, c] of Object.entries(byVendor).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${v} | $${c.toFixed(2)} |`);
  }
  lines.push(`| **Total** | **$${total.toFixed(2)}** |`);
  return lines.join('\n');
}

function formatTopProjects(costs, topN = 8) {
  if (!costs || !costs.length) return '';

  const byProject = {};
  for (const row of costs) {
    const key = `[${row.vendor}] ${row.vendor_account_name || row.vendor_account_identifier}`;
    byProject[key] = (byProject[key] || 0) + Number(row.net_amortized_cost || row.unblended_cost || 0);
  }

  const sorted = Object.entries(byProject).sort((a, b) => b[1] - a[1]).slice(0, topN);
  const lines = [`| Project / Account | Net Cost |`, `|-------------------|----------|`];
  sorted.forEach(([p, c]) => lines.push(`| ${p} | $${c.toFixed(2)} |`));
  return lines.join('\n');
}

function formatReport(data) {
  const { costs, anomalies, cudAlerts, recommendations } = data;
  const date = new Date().toISOString().split('T')[0];

  const totalToday = costs && costs.length
    ? costs.reduce((s, r) => s + Number(r.net_amortized_cost || r.unblended_cost || 0), 0).toFixed(2)
    : 'N/A';

  const expiringCUDs = cudAlerts.filter(c => c.alert);
  const highAnomalies = anomalies.filter(a => a.severity === 'HIGH');

  const lines = [
    `## Cloud Cost Digest — ${date}`,
    '',
    '### Summary',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Spend Today | $${totalToday} |`,
    `| CUD Expiry Alerts (≤90d) | ${expiringCUDs.length} |`,
    `| Cost Anomalies (≥20% swing) | ${anomalies.length} (${highAnomalies.length} HIGH) |`,
    `| Addressable Monthly Savings | ~$1,817/mo (~$21,810/yr) |`,
    '',
    '### Cost by Cloud',
    formatSummaryTable(costs),
    '',
    '### Top Projects / Accounts by Cost',
    formatTopProjects(costs),
    '',
  ];

  if (expiringCUDs.length) {
    lines.push('### ⚠️ CUD Expiry Alerts');
    expiringCUDs
      .sort((a, b) => a.days_left - b.days_left)
      .forEach(c => {
        const urgency = c.days_left <= 30 ? '🔴' : c.days_left <= 60 ? '🟡' : '🟢';
        lines.push(`- ${urgency} **${c.name}** (${c.type}, ${c.amount}) — expires **${c.expiry}** (${c.days_left}d)`);
      });
    lines.push('');
  }

  if (anomalies.length) {
    lines.push('### 🚨 Cost Anomalies (vs 7-day avg)');
    anomalies.slice(0, 8).forEach(a => {
      const sign = Number(a.delta_pct) > 0 ? '+' : '';
      lines.push(`- **[${a.severity}]** [${a.vendor}] ${a.account_id} / ${a.service}: ${sign}${a.delta_pct}% ($${Number(a.today_cost).toFixed(2)} today)`);
    });
    lines.push('');
  }

  lines.push('### Ranked Savings Recommendations');
  recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. **[${r.priority}] [${r.cloud}]** ${r.resource} — ${r.action} → ${r.savings_mo}`);
  });

  lines.push('');
  lines.push('### Action Items');
  lines.push('- [ ] **Cloud team**: Renew `2025-04-11_cloud-sql` ($7.50/hr) before 2026-04-11');
  lines.push('- [ ] **Cloud team**: Renew `2025-04-11_memorystore` ($12.00/hr) before 2026-04-11');
  lines.push('- [ ] **FinOps review**: Evaluate N1 CUD top-up ($608.89 + $239.24/mo savings)');
  lines.push('');
  lines.push('---');
  lines.push(`_Generated by /cloud-cost-optimizer | ${new Date().toISOString()}_`);

  return lines.join('\n');
}

// ─── Slack Posting (optional) ─────────────────────────────────────────────────

async function postToSlack(text) {
  if (!SLACK_WEBHOOK) return;
  const { default: fetch } = await import('node-fetch');
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cudAlerts = getCUDExpiryAlerts();
  const recommendations = getSavingsRecommendations();

  if (mode === 'cuds') {
    console.log(JSON.stringify({ cudAlerts, recommendations }, null, 2));
    return;
  }

  if (mode === 'recommend') {
    console.log(JSON.stringify(recommendations, null, 2));
    return;
  }

  if (mode === 'accounts') {
    const accounts = await fetchAccounts();
    console.log(JSON.stringify(accounts, null, 2));
    return;
  }

  let costs = [];
  let trendData = [];
  let anomalies = [];

  if (mode === 'costs' || mode === 'daily') {
    try {
      [costs, trendData] = await Promise.all([
        fetchDailyCosts(),
        fetch7DayTrend(),
      ]);
      anomalies = detectAnomalies(trendData);
    } catch (err) {
      console.error(`Cloudability API error: ${err.message}`);
      console.error('Ensure CLOUDABILITY_API_TOKEN is set in tools/cloudability/.env');
      if (mode === 'costs') process.exit(1);
      // For daily mode: continue with CUD/recommendation data even if API fails
    }
  }

  if (mode === 'costs') {
    console.log(JSON.stringify({ costs, trendData, anomalies }, null, 2));
    return;
  }

  const report = formatReport({ costs, anomalies, cudAlerts, recommendations });
  console.log(report);

  // Post to Slack if webhook is configured
  if (SLACK_WEBHOOK) {
    await postToSlack(`\`\`\`\n${report.slice(0, 3000)}\n\`\`\``);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
