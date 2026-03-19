---
name: gcp-cost-optimizer
description: >
  GCP FinOps daily cost analysis and committed use discount (CUD) advisor for Groupon.
  Use this skill when asked to analyse GCP costs, generate a daily cost digest, check CUD
  utilisation or expiry, identify cost anomalies, recommend new CUDs, or schedule daily cost
  reports. Trigger keywords: "GCP costs", "cloud spend", "billing report", "CUD expiry",
  "committed use discount", "cost anomaly", "daily cost digest", "cost per project", "cost
  optimisation", "FinOps", "cost-conscious".
  Do NOT use for Grafana dashboard setup (use /observability), Kubernetes rightsizing
  (use /kubernetes-specialist), or database tuning (use /postgres).
---

# GCP Cost Optimizer

## When to Use vs. Related Skills

| Situation | Use This Skill | Use Instead |
|-----------|---------------|-------------|
| Daily GCP billing digest | ✅ Yes | — |
| CUD expiry + renewal recommendations | ✅ Yes | — |
| Grafana cost dashboards | ❌ No | `/observability` |
| GKE node pool rightsizing | ❌ No | `/kubernetes-specialist` |
| Cloud SQL tuning | ❌ No | `/postgres` |

---

## Credential Setup

Credentials are stored in `tools/gcp-billing/.env`. Copy from the example:

```bash
cp tools/gcp-billing/.env.example tools/gcp-billing/.env
# Then fill in the values — never commit the filled .env
```

The service account is `grpn-sa-billing-cost-mgmt@prj-grp-central-sa-prod-0b25.iam.gserviceaccount.com`.
It requires:
- `billing.accounts.getSpendingInformation` — for CUD portfolio
- `bigquery.jobs.create` + `bigquery.tables.getData` — for billing export queries
- `recommender.billingAccountCudRecommendations.list` — for CUD recommendations

---

## Workflow

### Step 1 — Load credentials

```bash
source tools/gcp-billing/.env
node tools/gcp-billing/fetch-costs.js --mode daily
```

Or invoke sections individually:

```bash
node tools/gcp-billing/fetch-costs.js --mode costs      # BigQuery billing export
node tools/gcp-billing/fetch-costs.js --mode cuds       # CUD portfolio status
node tools/gcp-billing/fetch-costs.js --mode recommend  # Renewal recommendations
```

### Step 2 — Parse output and generate the daily digest

The script returns JSON. Structure the output as the **Daily Cost Digest** (see format below).

### Step 3 — CUD analysis

Load the CUD reference data from `references/cud-portfolio.md` for known commitments.
Cross-check against the live API output. Flag:
- CUDs expiring in ≤ 45 days
- CUD utilisation below 90% (trailing 30-day)
- Coverage gaps (resource-based CUDs under 70% coverage)

### Step 4 — Anomaly detection

Compare today's total vs. trailing 7-day average. Flag if delta > ±15%.
Break anomalies down by project and service.

### Step 5 — Recommendations

Produce ranked recommendations using the logic in `references/recommendation-rules.md`.

### Step 6 — Schedule (optional)

If the user wants daily scheduling:

```
Use CronCreate to schedule: "0 8 * * *"
Task: "Run /gcp-cost-optimizer daily digest and post to Slack #finops-alerts"
```

---

## Daily Cost Digest Format

```
## GCP Daily Cost Digest — {DATE}

### Summary
| Metric | Value |
|--------|-------|
| Total Spend Today | ${total} |
| vs Yesterday | +/- ${delta} ({pct}%) |
| vs 7-day avg | +/- ${delta7} ({pct7}%) |
| Active CUDs | {count} |
| CUDs Expiring ≤45d | {count} |

### Top 5 Projects by Cost
| Project | Today | 7-day avg | Delta |
|---------|-------|-----------|-------|

### Top 5 Services by Cost
| Service | Today | 7-day avg | Delta |

### CUD Portfolio Health
| Commitment | Type | Expiry | Utilisation | Coverage | Status |
|------------|------|--------|-------------|----------|--------|

### Anomalies
(List any project/service exceeding ±15% threshold)

### Recommendations
1. {Ranked by $ impact}
2. ...

### Action Items
- [ ] {Owner}: {action} by {date}
```

---

## BigQuery Query Templates

The billing export dataset follows Groupon naming: query these from the script using the SA credentials.

### Daily cost by project and service

```sql
SELECT
  project.id AS project_id,
  service.description AS service,
  location.region AS region,
  SUM(cost) AS cost_usd,
  SUM(credits.amount) AS credits_usd,
  DATE(usage_start_time) AS usage_date
FROM `{BILLING_PROJECT}.{DATASET}.gcp_billing_export_v1_*`
WHERE DATE(usage_start_time) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
GROUP BY 1, 2, 3, 6
ORDER BY cost_usd DESC
LIMIT 200
```

### 7-day trend for anomaly detection

```sql
SELECT
  DATE(usage_start_time) AS usage_date,
  project.id AS project_id,
  SUM(cost + credits.amount) AS net_cost
FROM `{BILLING_PROJECT}.{DATASET}.gcp_billing_export_v1_*`
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 8 DAY)
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
```

### CUD coverage (resource-based)

```sql
SELECT
  project.id,
  service.description,
  SUM(CASE WHEN cost_type = 'regular' THEN cost ELSE 0 END) AS on_demand_cost,
  SUM(CASE WHEN cost_type = 'committed' THEN cost ELSE 0 END) AS committed_cost,
  SAFE_DIVIDE(
    SUM(CASE WHEN cost_type = 'committed' THEN cost ELSE 0 END),
    SUM(cost)
  ) AS cud_coverage_ratio
FROM `{BILLING_PROJECT}.{DATASET}.gcp_billing_export_v1_*`
WHERE DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  AND service.description LIKE '%Compute Engine%'
GROUP BY 1, 2
ORDER BY on_demand_cost DESC
```

---

## CUD Expiry Alert Logic

From the current CUD portfolio (see `references/cud-portfolio.md`):

**Expiring in ≤ 45 days (as of 2026-03-13):**
- `2025-04-11_cloud-sql` — $7.50/hr Cloud SQL CUD — expires 2026-04-11 (~29 days)
- `2025-04-11_memorystore` — $12.00/hr Memorystore Redis CUD — expires 2026-04-11 (~29 days)

**Recommended renewals:**
- Cloud SQL CUD: Current $20.90/hr total active commitments. GCP recommends `Save $954.42/mo` by increasing coverage. Evaluate committing at $25.40/hr (3-year) vs. $20.90/hr current.
- Memorystore Redis: $12.00/hr expiring. Utilisation was 99.82% trailing 30 days. Renew at same level minimum. GCP utilisation 67.93% coverage suggests room to grow.
- N1 Compute: GCP recommends `Save $608.89/mo` for N1 Cores and `Save $239.24/mo` for N1 Memory — raise CUD to cover the gap.
- C2D Compute: `Save $14.99/mo` recommendation — minor gap, low priority.

---

## Developer Cost Awareness Principles

When presenting findings to developers, frame insights as:

1. **Who owns the cost** — always attribute by GCP project → team owner
2. **What changed** — delta vs. yesterday and vs. last week, not just raw totals
3. **What to do** — every alert has a recommended next action with an owner
4. **CUD protection** — show how CUDs are protecting against on-demand pricing

Post the digest to the `#finops-alerts` Slack channel or equivalent daily comms channel.

---

## Groupon Integration

| Resource | Location |
|----------|----------|
| Service account key | `tools/gcp-billing/.env` (never commit) |
| Fetch script | `tools/gcp-billing/fetch-costs.js` |
| CUD portfolio reference | `.claude/skills/gcp-cost-optimizer/references/cud-portfolio.md` |
| Recommendation rules | `.claude/skills/gcp-cost-optimizer/references/recommendation-rules.md` |
| Billing SA project | `prj-grp-central-sa-prod-0b25` |
| Billing account | `BillingAccount: GCP Landing Zone` |

Architecture query for project-to-team mapping:
```bash
node context/scripts/query-manifest.mjs search conveyor
node context/scripts/query-manifest.mjs search ingestion
```
