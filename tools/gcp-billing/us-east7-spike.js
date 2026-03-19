#!/usr/bin/env node
/**
 * us-east7 cost spike investigation
 * Queries billing export for last 30 days, grouped by project/service/resource_type
 * to identify what drove the recent jump in us-east7 spend.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const KEY_FILE = resolve(__dirname, 'service-account-key.json');
const BILLING_PROJECT = process.env.GCP_BILLING_PROJECT;
const BILLING_DATASET = process.env.GCP_BILLING_DATASET;

if (!BILLING_PROJECT || !BILLING_DATASET) {
  console.error('Missing GCP_BILLING_PROJECT or GCP_BILLING_DATASET');
  process.exit(1);
}

// Jobs run in the SA's home project (has bigquery.jobs.create), data is in BILLING_PROJECT
const SA_PROJECT = 'prj-grp-central-sa-prod-0b25';
const bq = new BigQuery({ projectId: SA_PROJECT, keyFilename: KEY_FILE });

// 1. Daily spend in us-east7 — last 30 days (trend)
const trendQuery = `
  SELECT
    DATE(usage_start_time) AS usage_date,
    SUM(cost) AS gross_cost,
    SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
  FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
  WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    AND DATE(usage_start_time) < CURRENT_DATE()
    AND location.region = 'us-east7'
  GROUP BY 1
  ORDER BY 1 ASC
`;

// 2. Top cost drivers in us-east7 — last 14 days vs prior 14 days
const driversQuery = `
  WITH recent AS (
    SELECT
      billing_account_id,
      project.id AS project_id,
      project.name AS project_name,
      service.description AS service,
      sku.description AS sku,
      resource.name AS resource_name,
      resource.type AS resource_type,
      SUM(cost) AS gross_cost,
      SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
      AND DATE(usage_start_time) < CURRENT_DATE()
      AND location.region = 'us-east7'
    GROUP BY 1, 2, 3, 4, 5, 6, 7
  ),
  prior AS (
    SELECT
      billing_account_id,
      project.id AS project_id,
      service.description AS service,
      sku.description AS sku,
      SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
      AND DATE(usage_start_time) < DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
      AND location.region = 'us-east7'
    GROUP BY 1, 2, 3, 4
  )
  SELECT
    r.billing_account_id,
    r.project_id,
    r.project_name,
    r.service,
    r.sku,
    r.resource_type,
    ROUND(r.net_cost, 2) AS net_cost_last14d,
    ROUND(IFNULL(p.net_cost, 0), 2) AS net_cost_prior14d,
    ROUND(r.net_cost - IFNULL(p.net_cost, 0), 2) AS delta,
    ROUND(SAFE_DIVIDE(r.net_cost - IFNULL(p.net_cost, 0), NULLIF(ABS(IFNULL(p.net_cost, 0)), 0)) * 100, 1) AS pct_change
  FROM recent r
  LEFT JOIN prior p USING (billing_account_id, project_id, service, sku)
  ORDER BY delta DESC
  LIMIT 30
`;

// 3. Project-level rollup in us-east7 — last 14 vs prior 14
const projectRollupQuery = `
  WITH recent AS (
    SELECT
      billing_account_id,
      project.id AS project_id,
      project.name AS project_name,
      SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
      AND DATE(usage_start_time) < CURRENT_DATE()
      AND location.region = 'us-east7'
    GROUP BY 1, 2, 3
  ),
  prior AS (
    SELECT
      billing_account_id,
      project.id AS project_id,
      SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost
    FROM \`${BILLING_PROJECT}.${BILLING_DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
      AND DATE(usage_start_time) < DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
      AND location.region = 'us-east7'
    GROUP BY 1, 2
  )
  SELECT
    r.billing_account_id,
    r.project_id,
    r.project_name,
    ROUND(r.net_cost, 2) AS net_cost_last14d,
    ROUND(IFNULL(p.net_cost, 0), 2) AS net_cost_prior14d,
    ROUND(r.net_cost - IFNULL(p.net_cost, 0), 2) AS delta,
    ROUND(SAFE_DIVIDE(r.net_cost - IFNULL(p.net_cost, 0), NULLIF(ABS(IFNULL(p.net_cost, 0)), 0)) * 100, 1) AS pct_change
  FROM recent r
  LEFT JOIN prior p USING (billing_account_id, project_id)
  ORDER BY delta DESC
  LIMIT 20
`;

async function run() {
  console.log('=== us-east7 Cost Spike Investigation ===\n');
  console.log(`Billing project : ${BILLING_PROJECT}`);
  console.log(`Dataset         : ${BILLING_DATASET}`);
  console.log(`Analysis date   : ${new Date().toISOString().split('T')[0]}\n`);

  // Trend
  console.log('--- Daily Spend Trend (us-east7, last 30 days) ---');
  try {
    const [trend] = await bq.query({ query: trendQuery });
    if (!trend.length) {
      console.log('  No data found for us-east7 in the last 30 days.\n');
    } else {
      console.log('  Date          Gross Cost   Net Cost');
      for (const r of trend) {
        const d = r.usage_date?.value ?? r.usage_date;
        console.log(`  ${d}    $${Number(r.gross_cost).toFixed(2).padStart(10)}   $${Number(r.net_cost).toFixed(2).padStart(10)}`);
      }
      const last = trend[trend.length - 1];
      const prev = trend[trend.length - 2];
      if (prev) {
        const delta = Number(last.net_cost) - Number(prev.net_cost);
        const pct = (delta / Math.abs(Number(prev.net_cost)) * 100).toFixed(1);
        console.log(`\n  Day-over-day: ${delta >= 0 ? '+' : ''}$${delta.toFixed(2)} (${pct}%)`);
      }
    }
  } catch (err) {
    console.error(`  Trend query failed: ${err.message}`);
  }

  // Project rollup
  console.log('\n--- Project-Level Rollup (us-east7, last 14d vs prior 14d) ---');
  try {
    const [projects] = await bq.query({ query: projectRollupQuery });
    if (!projects.length) {
      console.log('  No project data for us-east7.\n');
    } else {
      console.log('  Billing Account               Project ID                        Project Name               Last 14d     Prior 14d     Delta      %');
      console.log('  ' + '-'.repeat(160));
      for (const r of projects) {
        const pct = r.pct_change !== null ? `${r.pct_change}%` : 'new';
        const sign = r.delta > 0 ? '+' : '';
        console.log(`  ${String(r.billing_account_id ?? 'N/A').padEnd(30)} ${String(r.project_id ?? 'N/A').padEnd(36)} ${String(r.project_name ?? 'N/A').padEnd(26)} $${String(r.net_cost_last14d).padStart(10)}   $${String(r.net_cost_prior14d).padStart(10)}   ${sign}$${String(r.delta).padStart(10)}   ${pct}`);
      }
    }
  } catch (err) {
    console.error(`  Project rollup query failed: ${err.message}`);
  }

  // Top drivers
  console.log('\n--- Top Cost Drivers (us-east7, last 14d vs prior 14d, ordered by delta) ---');
  try {
    const [drivers] = await bq.query({ query: driversQuery });
    if (!drivers.length) {
      console.log('  No driver data for us-east7.\n');
    } else {
      for (const r of drivers) {
        const pct = r.pct_change !== null ? `${r.pct_change}%` : 'new';
        const sign = r.delta > 0 ? '+' : '';
        console.log(`  [${r.billing_account_id ?? 'N/A'}] ${r.project_id} | ${r.service} | SKU: ${r.sku} | Type: ${r.resource_type ?? 'N/A'}`);
        console.log(`    Last 14d: $${r.net_cost_last14d}  |  Prior 14d: $${r.net_cost_prior14d}  |  Delta: ${sign}$${r.delta} (${pct})`);
        console.log('');
      }
    }
  } catch (err) {
    console.error(`  Drivers query failed: ${err.message}`);
  }
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
