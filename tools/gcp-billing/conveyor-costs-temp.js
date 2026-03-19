#!/usr/bin/env node
/**
 * Conveyor Prod Cluster — cost breakdown for last 20 days
 * Uses existing GCP billing SA + BigQuery dataset.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

const KEY_FILE   = resolve(__dirname, 'service-account-key.json');
const PROJECT    = process.env.GCP_BILLING_PROJECT;   // dataset project
const DATASET    = process.env.GCP_BILLING_DATASET;
// SA home project — has bigquery.jobs.create permission
const SA_PROJECT = 'prj-grp-central-sa-prod-0b25';

async function run() {
  const bq = new BigQuery({ projectId: SA_PROJECT, keyFilename: KEY_FILE });

  // ── 1. Daily totals per service for conveyor-prod projects ──────────────────
  const q1 = `
    SELECT
      project.id                  AS project_id,
      project.name                AS project_name,
      service.description         AS service,
      DATE(usage_start_time)      AS usage_date,
      SUM(cost)                   AS gross_cost,
      SUM(credits.amount)         AS credits,
      SUM(cost + credits.amount)  AS net_cost
    FROM \`${PROJECT}.${DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY)
      AND DATE(usage_start_time) < CURRENT_DATE()
      AND (LOWER(project.id)   LIKE '%conveyor%'
        OR LOWER(project.name) LIKE '%conveyor%')
    GROUP BY 1, 2, 3, 4
    ORDER BY usage_date DESC, net_cost DESC
  `;

  // ── 2. 20-day roll-up total ──────────────────────────────────────────────────
  const q2 = `
    SELECT
      project.id                  AS project_id,
      project.name                AS project_name,
      service.description         AS service,
      SUM(cost)                   AS gross_cost_total,
      SUM(credits.amount)         AS credits_total,
      SUM(cost + credits.amount)  AS net_cost_total
    FROM \`${PROJECT}.${DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY)
      AND DATE(usage_start_time) < CURRENT_DATE()
      AND (LOWER(project.id)   LIKE '%conveyor%'
        OR LOWER(project.name) LIKE '%conveyor%')
    GROUP BY 1, 2, 3
    ORDER BY net_cost_total DESC
  `;

  // ── 3. Discover all project IDs with "conveyor" in them (sanity check) ──────
  const q3 = `
    SELECT DISTINCT project.id AS project_id, project.name AS project_name
    FROM \`${PROJECT}.${DATASET}.gcp_billing_export_v1_*\`
    WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY)
      AND (LOWER(project.id) LIKE '%conveyor%' OR LOWER(project.name) LIKE '%conveyor%')
    ORDER BY 1
  `;

  console.log('Querying BigQuery…\n');

  const [[projects], [daily], [rollup]] = await Promise.all([
    bq.query({ query: q3 }),
    bq.query({ query: q1 }),
    bq.query({ query: q2 }),
  ]);

  // ── Projects found ───────────────────────────────────────────────────────────
  console.log('=== Conveyor Projects Found ===');
  if (!projects.length) {
    console.log('  No projects matching "conveyor" found in billing data (last 20 days).');
    console.log('  The project may use a different naming convention.');
  } else {
    projects.forEach(p => console.log(`  ${p.project_id}  (${p.project_name})`));
  }
  console.log();

  // ── 20-day roll-up by service ────────────────────────────────────────────────
  if (rollup.length) {
    const totalNet = rollup.reduce((s, r) => s + Number(r.net_cost_total), 0);
    console.log(`=== 20-Day Roll-Up (last 20 days, net after credits) ===`);
    console.log(`${'Service'.padEnd(45)} ${'Gross'.padStart(10)} ${'Credits'.padStart(10)} ${'Net'.padStart(10)}`);
    console.log('-'.repeat(80));
    rollup.forEach(r => {
      const svc  = String(r.service || '(unknown)').slice(0, 44).padEnd(44);
      const gros = `$${Number(r.gross_cost_total).toFixed(2)}`.padStart(10);
      const cred = `$${Number(r.credits_total).toFixed(2)}`.padStart(10);
      const net  = `$${Number(r.net_cost_total).toFixed(2)}`.padStart(10);
      console.log(`${svc} ${gros} ${cred} ${net}`);
    });
    console.log('-'.repeat(80));
    console.log(`${'TOTAL'.padEnd(45)} ${''.padStart(10)} ${''.padStart(10)} ${`$${totalNet.toFixed(2)}`.padStart(10)}`);
    console.log();
  }

  // ── Daily breakdown (last 20 days) ──────────────────────────────────────────
  if (daily.length) {
    // Aggregate by date
    const byDate = {};
    daily.forEach(r => {
      const d = r.usage_date?.value || r.usage_date;
      byDate[d] = (byDate[d] || 0) + Number(r.net_cost);
    });

    console.log('=== Daily Net Cost (Conveyor Prod) ===');
    Object.entries(byDate)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([d, c]) => console.log(`  ${d}   $${c.toFixed(2)}`));
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
