---
name: cloud-cost-optimizer
description: >
  Multi-cloud FinOps daily cost analysis for Groupon — GCP + AWS via Cloudability by IBM.
  Use this skill to: fetch daily costs across all projects and accounts, detect cost anomalies
  (>20% swing vs 7-day average), analyse GCP CUD portfolio health and expiry alerts,
  generate ranked savings recommendations, attribute costs to developer teams, and schedule
  daily cost digests. Trigger keywords: "cloud costs", "AWS costs", "GCP costs", "Cloudability",
  "cost digest", "cost report", "cost anomaly", "CUD expiry", "committed use discount",
  "cost-conscious", "FinOps", "cost optimisation", "cloud spend", "daily digest".
  Use /gcp-cost-optimizer for GCP-only BigQuery billing analysis.
  Do NOT use for Grafana dashboards (/observability), Kubernetes rightsizing (/kubernetes-specialist),
  or database tuning (/postgres).
---

# Cloud Cost Optimizer — GCP + AWS via Cloudability

## Overview

This skill produces a **daily cloud cost digest** covering all Groupon GCP projects and AWS
accounts via Cloudability by IBM. It overlays GCP CUD analysis from the billing export and
delivers ranked recommendations to make every developer cost-conscious.

---

## When to Use vs. Related Skills

| Situation | Use This Skill | Use Instead |
|-----------|---------------|-------------|
| Daily multi-cloud (GCP + AWS) digest | ✅ Yes | — |
| GCP-only BigQuery billing deep-dive | ❌ No | `/gcp-cost-optimizer` |
| GCP CUD expiry + renewal | ✅ Yes | — |
| Cloudability API integration | ✅ Yes | — |
| Grafana cost dashboards | ❌ No | `/observability` |
| GKE node pool rightsizing | ❌ No | `/kubernetes-specialist` |
| Cloud SQL tuning | ❌ No | `/postgres` |

---

## Gotchas

**Cloudability data lags 24–48 hours** — Cloudability does not show real-time costs. Yesterday's spend may not be finalised yet. Never compare a same-day Cloudability figure against a BigQuery billing export figure as if they represent the same point in time. Always state the data date in the report.

**CUD coverage applies at org level, not project level** — GCP Committed Use Discounts apply across the entire GCP org billing account, not per-project. A CUD purchased for `prj-grp-conveyor-prod-8dde` can cover usage in other projects. Avoid recommending a new CUD for a project that is already covered by an org-level commitment.

**Cloudability API token expiry** — The Cloudability API token is time-limited. If the fetch script returns 401, regenerate the token at `https://app.cloudability.com/settings/api` and update `tools/cloudability/.env`. Do not share the token in reports or commits.

**Multi-cloud cost attribution overlap** — Some GCP-to-AWS data transfer costs appear in both the GCP billing export and Cloudability's AWS costs. When comparing total cloud spend, use Cloudability as the single source of truth for the full multi-cloud view — do not add GCP BigQuery costs on top of Cloudability totals.

**Anomaly threshold is >20% swing vs 7-day average** — A 15% spike is within normal variance and should not be flagged as an anomaly. Stick to the 20% threshold. Flagging sub-threshold changes as anomalies creates alert fatigue.

**Spot instance interruptions look like cost drops** — Sudden GKE cost reductions can be spot instance terminations, not genuine savings. Check node pool activity before calling a cost decrease an "optimization win."

---

## Credential Setup

```bash
cp tools/cloudability/.env.example tools/cloudability/.env
# Fill in CLOUDABILITY_API_TOKEN — generate at https://app.cloudability.com/settings/api
# Optionally add SLACK_WEBHOOK_URL for daily Slack posting
```

Install dependencies:
```bash
cd tools/cloudability && npm install node-fetch dotenv
```

---

## Workflow

### Step 1 — Run the fetch script

```bash
# Full daily digest (costs + CUDs + anomalies + recommendations)
node tools/cloudability/fetch-costs.js --mode daily

# Individual modes
node tools/cloudability/fetch-costs.js --mode costs      # Raw cost data only
node tools/cloudability/fetch-costs.js --mode accounts   # List all linked accounts
node tools/cloudability/fetch-costs.js --mode cuds       # CUD expiry alerts + recommendations
node tools/cloudability/fetch-costs.js --mode recommend  # Ranked savings recommendations only
```

### Step 2 — Parse the output

The script outputs Markdown directly in `daily` mode. Parse the JSON from `costs` mode
to do deeper analysis.

### Step 3 — CUD analysis

Load CUD reference from `references/cud-portfolio.md`. Cross-check live data:

- Flag CUDs expiring ≤ 90 days — alert ≤ 30 days is P0
- Flag spend-based CUD coverage below 70%
- Flag resource-based CUDs under 90% utilisation
- Identify coverage gaps (machine families with uncovered on-demand spend)

### Step 4 — Anomaly detection

The script detects anomalies automatically (threshold: ±20%). For manual analysis:

1. Pull 7-day trend from Cloudability (`date` dimension)
2. Compare yesterday vs. 7-day average per project/service
3. Flag > ±20% as MEDIUM, > ±40% as HIGH
4. Attribute anomalies to team using the project-to-team mapping below

### Step 5 — Recommendations

See `references/cud-portfolio.md` for current ranked list. Rules:
- P0: Anything expiring ≤ 30 days
- P1: Coverage gaps > $500/mo potential savings
- P2: Coverage gaps $100–500/mo
- P3: Nice-to-have optimisations < $100/mo

### Step 6 — Schedule daily digest

To run every morning at 8am IST (2:30am UTC):

```
Use CronCreate tool with schedule: "30 2 * * *"
Task: "Run /cloud-cost-optimizer daily digest and post to Slack #finops-alerts"
```

---

## Daily Cost Digest Format

```
## Cloud Cost Digest — {DATE}

### Summary
| Metric | Value |
|--------|-------|
| Total Spend Today | ${total} |
| vs Yesterday | +/- ${delta} ({pct}%) |
| vs 7-day avg | +/- ${delta7} ({pct7}%) |
| CUDs Expiring ≤90d | {count} |
| Cost Anomalies | {count} ({high_count} HIGH) |

### Cost by Cloud
| Cloud | Net Cost |
| GCP   | $...     |
| AWS   | $...     |

### Top 8 Projects / Accounts by Cost
| Project / Account | Today | 7-day avg | Delta |

### ⚠️ CUD Expiry Alerts
(List with 🔴/🟡/🟢 urgency)

### 🚨 Cost Anomalies (vs 7-day avg)
(List by severity)

### Ranked Savings Recommendations
1. [P0] ...
2. [P1] ...

### Action Items
- [ ] {Owner}: {action} by {date}
```

---

## Project → Team Mapping (GCP)

| GCP Project | Team / Owner |
|-------------|-------------|
| prj-grp-conveyor-prod | Platform / Conveyor team |
| prj-grp-conveyor-stable | Platform / Conveyor team |
| prj-grp-janus-prod | Platform / Janus team |
| prj-grp-ingestion-prod | Data / Ingestion team |
| prj-grp-pipelines-prod | Data / Pipelines team |
| prj-grp-data-comp-prod | Data / Compute team |
| prj-grp-mta-net-prod | Cloud / Networking (MTA Net) |
| prj-grp-tableau-prod | Analytics / Tableau team |

Query the architecture manifest for more:
```bash
node context/scripts/query-manifest.mjs search conveyor
node context/scripts/query-manifest.mjs search ingestion
```

---

## CUD Expiry Alert Logic

From `references/cud-portfolio.md` (updated 2026-03-13):

**Expiring ≤ 30 days — P0 (act now):**
- `2025-04-11_cloud-sql` — $7.50/hr Cloud SQL — expires 2026-04-11 (~29 days)
- `2025-04-11_memorystore` — $12.00/hr Memorystore Redis — expires 2026-04-11 (~29 days)

**Next renewal wave — November/December 2026:**
- 13 resource-based CUDs across conveyor, janus, ingestion, pipelines, data-comp, tableau
- Review and renew Q3 2026

**Actionable savings (total ~$1,817/mo):**

| Priority | Cloud | Resource | Savings |
|----------|-------|----------|---------|
| P1 | GCP | Cloud SQL CUD — increase coverage | **$954/mo** |
| P1 | GCP | N1 Cores — 159 vCPU gap | **$609/mo** |
| P1 | GCP | N1 Memory — 767 GB gap | **$239/mo** |
| P2 | GCP | C2D Cores — minor gap | $15/mo |

---

## Developer Cost Awareness Principles

When presenting findings to developers, always frame insights as:

1. **Who owns the cost** — attribute to GCP project + team (use table above)
2. **What changed** — delta vs. yesterday AND vs. 7-day avg (not raw totals)
3. **What to do** — every alert needs an owner and a specific action
4. **Cloud vs. on-demand** — show how CUDs protect teams from on-demand pricing spikes
5. **Trend not snapshot** — anomalies matter more than absolute spend

Post the digest daily to `#finops-alerts` or the team's cloud spend channel.

---

## Cloudability API Reference

See `references/cloudability-api.md` for:
- Full endpoint list
- Key dimensions and metrics
- Pagination and rate limits
- Groupon-specific account IDs

---

## Integrations

| Resource | Location |
|----------|----------|
| Fetch script | `tools/cloudability/fetch-costs.js` |
| Credentials template | `tools/cloudability/.env.example` |
| CUD portfolio reference | `.claude/skills/cloud-cost-optimizer/references/cud-portfolio.md` |
| Cloudability API guide | `.claude/skills/cloud-cost-optimizer/references/cloudability-api.md` |
| GCP-only BigQuery tool | `tools/gcp-billing/fetch-costs.js` |
| Billing SA project | `prj-grp-central-sa-prod-0b25` |
| Billing account | `BillingAccount: GCP Landing Zone` |
