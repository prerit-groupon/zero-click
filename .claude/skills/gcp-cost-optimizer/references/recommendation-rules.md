# CUD Recommendation Rules

## Priority Ranking

Recommendations are ranked by estimated monthly savings impact (highest first).

## Rule 1 — Expiring CUD Alert (P0)

**Trigger:** Any active CUD with expiry ≤ 45 days
**Action:** Immediate renewal recommendation
**Template:**
```
⚠️ URGENT: {name} ({type}, ${amount}/hr) expires in {days} days on {date}.
Estimated risk: ${hourly * 730 * months_until_renewal} if not renewed.
Recommended action: Renew at same level by {date - 7 days}.
Owner: FinOps / platform team owning {project_id}
```

## Rule 2 — Low CUD Coverage (P1)

**Trigger:** Coverage ratio < 70% for any service where CUDs are available
**Action:** Recommend new CUD at the coverage gap level
**Template:**
```
📈 {service} in {region} has {coverage}% CUD coverage (target: 70%+).
On-demand spend in last 30 days: ${on_demand_cost}
Recommended new CUD: ${recommended_amount}/hr ({term})
Estimated savings: ${savings}/mo
```

## Rule 3 — Low CUD Utilisation (P2)

**Trigger:** Trailing 30-day CUD utilisation < 90%
**Action:** Investigate whether workload has reduced; consider downsizing at renewal
**Template:**
```
⚠️ {name} utilisation is {utilisation}% (target: 90%+).
This may indicate over-commitment. Review workload before renewal.
Current commitment: ${amount}/hr | Suggested renewal: ${recommended_amount}/hr
```

## Rule 4 — Cost Anomaly (P1 if > 25%, P2 if > 15%)

**Trigger:** Project/service cost exceeds 7-day rolling average by threshold
**Action:** Flag for investigation
**Template:**
```
🚨 {project_id} / {service} spend spiked {delta}% vs. 7-day average.
Today: ${today} | 7-day avg: ${avg}
Common causes: new deployment, traffic spike, orphaned resources.
Action: Review recent deployments in {project_id}.
```

## Rule 5 — GCP Native Recommendation (P1)

**Trigger:** GCP Recommender API returns a CUD recommendation
**Action:** Surface with savings amount and direct action link
**Template:**
```
💡 GCP recommends: {recommendation_description}
Estimated savings: ${savings}/mo (${savings * 12}/yr)
Action: {recommendation_action_url}
```

## Rule 6 — Committed Use Coverage for New Projects (P2)

**Trigger:** New project with > $500/mo compute spend and no CUD coverage detected
**Action:** Recommend resource-based or flexible CUD depending on machine type mix
**Decision tree:**
- Single machine type (>80% usage) → Resource-based CUD (higher discount)
- Mixed machine types → Flexible CUD (applies across types)
- Cloud SQL > $1000/mo with <50% CUD coverage → Cloud SQL CUD

## Current Known Savings Opportunities

| Rule | Resource | Savings/mo | Priority |
|------|----------|-----------|----------|
| Rule 2 (coverage gap) | Cloud SQL us-central1 | **$954.42** | P1 |
| Rule 2 (coverage gap) | N1 Cores us-central1 | **$608.89** | P1 |
| Rule 1 (expiry) | Cloud SQL 2025-04-11 | risk of $7.50/hr (~$5,475/mo) | P0 |
| Rule 1 (expiry) | Memorystore 2025-04-11 | risk of $12.00/hr (~$8,760/mo) | P0 |
| Rule 2 (coverage gap) | N1 Memory us-central1 | **$239.24** | P1 |
| Rule 2 (coverage gap) | C2D Cores us-central1 | $14.99 | P2 |

**Total addressable savings: ~$1,817.54/month**
