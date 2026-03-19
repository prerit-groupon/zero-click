# Example: Creating a Skill — `/deploybot-advisor`

> Scenario: The CICDO team wants a new skill that knows how to interpret Deploybot pipeline
> failures and suggest remediations. No existing skill covers Deploybot specifically.

---

## Step 1 — Check for Overlap

```
Existing skills checked:
✓ observability    → covers Thanos/Grafana/ELK, not Deploybot
✓ kubernetes-specialist → GKE workloads, not CI/CD pipeline tool
✗ No skill covers Deploybot pipeline interpretation
```

New skill is justified. Proceeding.

---

## Step 2 — Capture Intent

```
What does it do?
→ Interprets Deploybot pipeline failure messages, identifies root cause category,
  and suggests specific remediation steps.

When should it trigger?
→ User pastes a Deploybot error, mentions "Deploybot failed", "pipeline stuck",
  "deployment blocked", "rollback in Deploybot"

What does good output look like?
→ 1) Root cause category, 2) likely cause, 3) exact remediation command/link

Overlap check passed — does NOT overlap with /observability or /kubernetes-specialist.
```

---

## Step 3 — Research Edge Cases

```
Q1: What is the 80% use case?
→ Build failures (test failures, lint, missing env vars) and deploy failures
  (Cloud Run health check timeout, Terraform drift, GKE pod OOMKilled)

Q2: What should it NOT do?
→ Not fix the code itself — just diagnose. Not re-trigger pipelines.
→ For actual GKE workload issues post-deploy, hand off to /kubernetes-specialist.
→ For metric-level alerts post-deploy, hand off to /observability.

Q3: What Groupon context does it need?
→ Deploybot is the Groupon internal CD platform (not Argo, not Spinnaker)
→ Stages: build → test → lint → deploy (Cloud Run or GKE via Helm)
→ Failure categories: test, lint, env-config, cloud-run-health, gke-pod, terraform
```

---

## Step 4 — Write SKILL.md

```markdown
---
name: deploybot-advisor
description: >
  Groupon Deploybot pipeline advisor — interprets failure messages, identifies root cause
  categories (test, lint, env-config, cloud-run-health, gke-pod, terraform), and suggests
  exact remediation steps. Use when a Deploybot pipeline fails, is stuck, or needs rollback.
  Trigger keywords: "Deploybot failed", "pipeline stuck", "deployment blocked", "rollback Deploybot",
  "build failed in Deploybot", "health check timeout", "Cloud Run revision failed".
  NOT for GKE workload debugging post-deploy (use /kubernetes-specialist) or metric alert
  investigation (use /observability).
---

# Deploybot Advisor

## When to Use vs. Related Skills

| Situation | Use This Skill | Use Instead |
|-----------|---------------|-------------|
| Deploybot pipeline failure | ✅ Yes | — |
| Post-deploy GKE pod crash | ❌ No | /kubernetes-specialist |
| Grafana alert firing | ❌ No | /observability |
| Jenkins pipeline failure | ❌ No | /jira-analyser-engineering |

## Workflow

1. Read the failure message — identify the pipeline stage (build/test/lint/deploy)
2. Match to a root cause category (table below)
3. State the likely cause in one sentence
4. Give the exact remediation command or next step

## Root Cause Categories

| Category | Failure Signals | Remediation |
|----------|----------------|-------------|
| test | `FAIL: N tests failed`, `jest --bail` | Fix failing test; check test logs in Deploybot |
| lint | `ESLint: N errors`, `tsc type error` | Run `npm run lint` locally; fix errors |
| env-config | `Missing env var`, `Secret not found` | Add secret to GCP Secret Manager; re-trigger |
| cloud-run-health | `Health check timeout`, `Container failed to start` | Check Cloud Run logs; verify /healthz handler |
| gke-pod | `OOMKilled`, `CrashLoopBackOff` | kubectl describe pod; see /kubernetes-specialist |
| terraform | `Resource already exists`, `Plan diff` | Run `terraform plan`; resolve state drift |

## Groupon Integration

- Deploybot is at: https://deploybot.groupondev.com (internal)
- Pipeline logs: check the "logs" tab in the failing pipeline stage
- Cloud Run revision logs: `gcloud run services logs read <service> --region us-central1`
- Rollback command: trigger the previous successful pipeline from Deploybot UI
```

---

## Step 5 — Create Eval Test Cases

```json
// .claude/skills/deploybot-advisor/evals/evals.json
{
  "evals": [
    {
      "id": "cloud-run-health-check",
      "prompt": "My Deploybot pipeline is failing at the deploy stage with: 'Health check failed after 240s — revision encore-gift-cards-00023 failed to become healthy'. What do I do?",
      "assertions": [
        { "type": "contains", "value": "cloud-run-health" },
        { "type": "contains", "value": "/healthz" },
        { "type": "contains", "value": "Cloud Run logs" }
      ]
    },
    {
      "id": "should-not-trigger-for-grafana",
      "prompt": "Grafana is showing high consumer lag on the deals.created Kafka topic. What do I do?",
      "assertions": [
        { "type": "not_contains", "value": "Deploybot" },
        { "type": "contains", "value": "observability" }
      ]
    },
    {
      "id": "missing-env-var",
      "prompt": "Deploybot build failed: 'Error: Missing required env var DATABASE_URL at startup'",
      "assertions": [
        { "type": "contains", "value": "Secret Manager" },
        { "type": "contains", "value": "env-config" }
      ]
    }
  ]
}
```

---

## Step 6 — Evaluate: With vs. Without

```bash
# With skill:
claude -p "My Deploybot pipeline is failing at deploy with health check timeout"
# → Names cloud-run-health category, suggests checking Cloud Run logs and /healthz

# Without skill:
claude -p "My Deploybot pipeline is failing at deploy with health check timeout"
# → Generic answer about health checks, no Groupon-specific guidance, no category

# Improvement confirmed — skill adds Groupon-specific remediation paths
```

---

## Step 7 — Register in CLAUDE.MD

Row added to the "Available Claude Skills" table in `/Users/pmunjal/zero-click/CLAUDE.MD`:

```markdown
- `/deploybot-advisor` — Interpret Deploybot pipeline failures and get exact remediation steps
```

---

## Design Decisions

**Why a separate skill vs. extending `/observability`?**
Deploybot is a CD platform — it sits between code push and running service. Observability covers
the *running* service. A Deploybot failure may not produce any Grafana/Thanos signal yet.
Separate skill keeps boundaries clear and prevents the observability skill from growing too large.

**Why not include "re-trigger pipeline"?**
Re-triggering without fixing the root cause is noise. The skill diagnoses; the engineer acts.
Keeping the scope narrow also avoids Deploybot API integration complexity.

**Trigger word design:**
The description lists 6 explicit phrases users type ("Deploybot failed", "pipeline stuck", etc.)
because Claude undertriggers skills. Explicit phrases beat vague category names.
