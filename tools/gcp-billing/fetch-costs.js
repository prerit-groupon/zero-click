#!/usr/bin/env node
/**
 * GCP Billing Cost Fetcher
 * Service Account: grpn-sa-billing-cost-mgmt@prj-grp-central-sa-prod-0b25.iam.gserviceaccount.com
 *
 * Usage:
 *   node fetch-costs.js --mode daily      # Full daily digest (costs + CUDs + recommendations)
 *   node fetch-costs.js --mode costs      # BigQuery billing costs only
 *   node fetch-costs.js --mode cuds       # CUD portfolio status via Billing API
 *   node fetch-costs.js --mode recommend  # GCP CUD recommendations
 *
 * Prerequisites:
 *   npm install @google-cloud/bigquery @google-cloud/billing dotenv
 *
 * Credentials:
 *   Set GOOGLE_APPLICATION_CREDENTIALS in tools/gcp-billing/.env
 *   pointing to the service account JSON key file.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { CloudBillingClient } from '@google-cloud/billing';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

// Always resolve key file relative to this script's directory
const KEY_FILE = resolve(__dirname, 'service-account-key.json');

const BILLING_PROJECT = process.env.GCP_BILLING_PROJECT;
const BILLING_DATASET = process.env.GCP_BILLING_DATASET;
const BILLING_ACCOUNT_NAME = process.env.GCP_BILLING_ACCOUNT_NAME || 'GCP Landing Zone';

const mode = process.argv.find(a => a.startsWith('--mode='))?.split('=')[1]
  || (process.argv.includes('--mode') && process.argv[process.argv.indexOf('--mode') + 1])
  || 'daily';

// ─── BigQuery: Daily cost by project and service ─────────────────────────────

async function fetchDailyCosts(daysBack = 1) {
  if (!BILLING_PROJECT || !BILLING_DATASET) {
    console.error('Error: GCP_BILLING_PROJECT and GCP_BILLING_DATASET must be set in .env');
    process.exit(1);
  }

  const bq = new BigQuery({ projectId: BILLING_PROJECT, keyFilename: KEY_FILE });

  const query = `
    SELECT
      project.id AS project_id,
      project.name AS project_name,
      service.description AS service,
      location.region AS region,
      DATE(usage_start_time) AS usage_date,
      SUM(cost) AS gross_cost,
      SUM(credits.amount) AS credits,
      SUM(cost + credits.amount) AS net_cost
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack + 1} DAY)
      AND DATE(usage_start_time) < CURRENT_DATE()
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY net_cost DESC
    LIMIT 500
  `;

  const [rows] = await bq.query({ query });
  return rows;
}

// ─── BigQuery: 7-day trend for anomaly detection ─────────────────────────────

async function fetch7DayTrend() {
  if (!BILLING_PROJECT || !BILLING_DATASET) return [];

  const bq = new BigQuery({ projectId: BILLING_PROJECT, keyFilename: KEY_FILE });

  const query = `
    SELECT
      DATE(usage_start_time) AS usage_date,
      project.id AS project_id,
      service.description AS service,
      SUM(cost + credits.amount) AS net_cost
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY)
      AND DATE(usage_start_time) < CURRENT_DATE()
    GROUP BY 1, 2, 3
    ORDER BY 1 DESC, 4 DESC
  `;

  const [rows] = await bq.query({ query });
  return rows;
}

// ─── BigQuery: CUD coverage ratio by project ─────────────────────────────────

async function fetchCUDCoverage() {
  if (!BILLING_PROJECT || !BILLING_DATASET) return [];

  const bq = new BigQuery({ projectId: BILLING_PROJECT, keyFilename: KEY_FILE });

  const query = `
    SELECT
      project.id AS project_id,
      service.description AS service,
      SUM(CASE WHEN cost_type = 'regular' THEN cost ELSE 0 END) AS on_demand_cost,
      SUM(CASE WHEN cost_type = 'committed' THEN cost ELSE 0 END) AS committed_cost,
      SUM(cost + credits.amount) AS net_cost,
      SAFE_DIVIDE(
        SUM(CASE WHEN cost_type = 'committed' THEN ABS(cost) ELSE 0 END),
        SUM(ABS(cost))
      ) AS cud_coverage_ratio
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      AND (service.description LIKE '%Compute Engine%'
        OR service.description LIKE '%Cloud SQL%'
        OR service.description LIKE '%Memorystore%')
    GROUP BY 1, 2
    ORDER BY on_demand_cost DESC
  `;

  const [rows] = await bq.query({ query });
  return rows;
}

// ─── Cloud Billing API: List active commitments ───────────────────────────────

async function fetchCUDs() {
  try {
    const billingClient = new CloudBillingClient({ keyFilename: KEY_FILE });
    const billingAccountId = await resolveBillingAccount(billingClient);
    if (!billingAccountId) {
      console.warn('Warning: Could not resolve billing account. Falling back to portfolio reference.');
      return null;
    }

    // List subscriptions (CUDs) via Cloud Billing API
    const [subscriptions] = await billingClient.listSubscriptions({
      parent: `billingAccounts/${billingAccountId}`,
    });

    return subscriptions;
  } catch (err) {
    console.warn(`Warning: Cloud Billing API error: ${err.message}`);
    return null;
  }
}

async function resolveBillingAccount(client) {
  try {
    const [accounts] = await client.listBillingAccounts();
    const match = accounts.find(a =>
      a.displayName === BILLING_ACCOUNT_NAME || a.name.includes('GCP_Landing_Zone')
    );
    return match?.name?.replace('billingAccounts/', '') || null;
  } catch {
    return null;
  }
}

// ─── Anomaly Detection ────────────────────────────────────────────────────────

function detectAnomalies(trendData, threshold = 0.15) {
  const byProjectService = {};

  for (const row of trendData) {
    const key = `${row.project_id}::${row.service}`;
    if (!byProjectService[key]) byProjectService[key] = [];
    byProjectService[key].push({ date: row.usage_date.value || row.usage_date, cost: Number(row.net_cost) });
  }

  const anomalies = [];

  for (const [key, entries] of Object.entries(byProjectService)) {
    entries.sort((a, b) => a.date > b.date ? 1 : -1);
    if (entries.length < 2) continue;

    const today = entries[entries.length - 1];
    const prior = entries.slice(0, -1);
    const avg7d = prior.reduce((s, e) => s + e.cost, 0) / prior.length;

    if (avg7d === 0) continue;
    const delta = (today.cost - avg7d) / avg7d;

    if (Math.abs(delta) > threshold) {
      const [projectId, service] = key.split('::');
      anomalies.push({
        project_id: projectId,
        service,
        today_cost: today.cost,
        avg_7d: avg7d,
        delta_pct: (delta * 100).toFixed(1),
        severity: Math.abs(delta) > 0.25 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  return anomalies.sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct));
}

// ─── CUD Expiry Alerts (from local reference data) ────────────────────────────

function getCUDExpiryAlerts() {
  const today = new Date();
  const known = [
    { name: '2025-04-11_cloud-sql', type: 'Cloud SQL CUD', amount: '$7.50/hr', expiry: '2026-04-11', region: 'us-central1' },
    { name: '2025-04-11_memorystore', type: 'Memorystore Redis CUD', amount: '$12.00/hr', expiry: '2026-04-11', region: 'global' },
    { name: 'spend-cloud-sql-2025-11-24', type: 'Cloud SQL CUD', amount: '$13.40/hr', expiry: '2028-11-24', region: 'us-central1' },
    { name: 'compute-flexible-2025-11-24', type: 'Compute Flexible CUD', amount: '$38.00/hr', expiry: '2028-11-24', region: 'global' },
    { name: 'compute-flexible-2025-12-23-3y', type: 'Compute Flexible CUD', amount: '$31.00/hr', expiry: '2028-12-23', region: 'global' },
  ];

  return known.map(c => {
    const expiryDate = new Date(c.expiry);
    const daysLeft = Math.round((expiryDate - today) / (1000 * 60 * 60 * 24));
    return { ...c, days_left: daysLeft, alert: daysLeft <= 45 };
  }).filter(c => c.alert);
}

// ─── Savings Recommendations ─────────────────────────────────────────────────

function getSavingsRecommendations() {
  return [
    { priority: 'P0', resource: 'Cloud SQL CUD (2025-04-11)', action: 'Renew before 2026-04-11', savings_mo: 'Risk: ~$5,475/mo if missed' },
    { priority: 'P0', resource: 'Memorystore Redis CUD (2025-04-11)', action: 'Renew before 2026-04-11', savings_mo: 'Risk: ~$8,760/mo if missed' },
    { priority: 'P1', resource: 'Cloud SQL (us-central1)', action: 'Increase spend commitment coverage', savings_mo: '$954.42' },
    { priority: 'P1', resource: 'N1 Cores (us-central1)', action: 'Add CUD for 159 vCPU gap', savings_mo: '$608.89' },
    { priority: 'P1', resource: 'N1 Memory (us-central1)', action: 'Add CUD for 767 GB gap', savings_mo: '$239.24' },
    { priority: 'P2', resource: 'C2D Cores (us-central1)', action: 'Minor coverage gap', savings_mo: '$14.99' },
  ];
}

// ─── Report Formatting ────────────────────────────────────────────────────────

function formatReport(data) {
  const { costs, expiryAlerts, recommendations, anomalies } = data;
  const date = new Date().toISOString().split('T')[0];

  const totalToday = costs
    ? costs.reduce((s, r) => s + Number(r.net_cost), 0).toFixed(2)
    : 'N/A (BigQuery not configured)';

  const topProjects = costs
    ? Object.entries(
        costs.reduce((acc, r) => {
          acc[r.project_id] = (acc[r.project_id] || 0) + Number(r.net_cost);
          return acc;
        }, {})
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    : [];

  const lines = [
    `## GCP Daily Cost Digest — ${date}`,
    '',
    '### Summary',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Spend Today | $${totalToday} |`,
    `| CUD Expiry Alerts | ${expiryAlerts.length} commitments expiring ≤45 days |`,
    `| Cost Anomalies | ${anomalies.length} detected |`,
    `| Total Addressable Savings | ~$1,817/mo (~$21,810/yr) |`,
    '',
  ];

  if (topProjects.length) {
    lines.push('### Top Projects by Cost (Today)');
    lines.push('| Project | Net Cost |');
    lines.push('|---------|----------|');
    topProjects.forEach(([p, c]) => lines.push(`| ${p} | $${Number(c).toFixed(2)} |`));
    lines.push('');
  }

  if (expiryAlerts.length) {
    lines.push('### ⚠️ CUD Expiry Alerts');
    expiryAlerts.forEach(a => {
      lines.push(`- **${a.name}** (${a.type}, ${a.amount}) expires in **${a.days_left} days** on ${a.expiry}`);
    });
    lines.push('');
  }

  if (anomalies.length) {
    lines.push('### 🚨 Cost Anomalies');
    anomalies.slice(0, 5).forEach(a => {
      const sign = a.delta_pct > 0 ? '+' : '';
      lines.push(`- **[${a.severity}]** ${a.project_id} / ${a.service}: ${sign}${a.delta_pct}% vs 7-day avg ($${Number(a.today_cost).toFixed(2)} today)`);
    });
    lines.push('');
  }

  lines.push('### Ranked Savings Recommendations');
  recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. **[${r.priority}]** ${r.resource} — ${r.action} → ${r.savings_mo}`);
  });
  lines.push('');
  lines.push('---');
  lines.push(`_Generated by gcp-cost-optimizer skill | ${new Date().toISOString()}_`);

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const expiryAlerts = getCUDExpiryAlerts();
  const recommendations = getSavingsRecommendations();

  if (mode === 'cuds') {
    const liveCUDs = await fetchCUDs();
    console.log(JSON.stringify({ expiryAlerts, recommendations, liveCUDs }, null, 2));
    return;
  }

  if (mode === 'recommend') {
    console.log(JSON.stringify(recommendations, null, 2));
    return;
  }

  let costs = null;
  let trend = [];
  let cudCoverage = [];
  let anomalies = [];

  if (mode === 'costs' || mode === 'daily') {
    try {
      [costs, trend, cudCoverage] = await Promise.all([
        fetchDailyCosts(1),
        fetch7DayTrend(),
        fetchCUDCoverage(),
      ]);
      anomalies = detectAnomalies(trend);
    } catch (err) {
      console.error(`BigQuery error: ${err.message}`);
      console.error('Ensure GCP_BILLING_PROJECT and GCP_BILLING_DATASET are set and the SA has BigQuery access.');
    }
  }

  if (mode === 'costs') {
    console.log(JSON.stringify({ costs, trend, cudCoverage, anomalies }, null, 2));
    return;
  }

  // daily: full report
  const report = formatReport({ costs, trend, cudCoverage, expiryAlerts, recommendations, anomalies });
  console.log(report);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
