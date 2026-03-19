---
name: deploybot
description: >
  Groupon's Deploybot deployment authorization and release workflow for Continuum services.
  Use this skill for: deploying Continuum services via Deploybot, understanding the staging-to-production
  regional rollout, handling access denied errors, promoting a release between stages, or rolling back.
  Trigger keywords: "deploy", "Deploybot", "promote to prod", "staging promotion", "access denied deploy",
  "LDAP group", "ARQ request", "release rollout", "deployment authorization".
  Do NOT use for Encore services (those deploy via Encore Cloud CI/CD) or GKE workloads.
---

# Deploybot — Groupon Deployment Authorization

Category: CI/CD & Deployment

Deploybot is Groupon's deployment authorization service for Continuum services. It manages approval workflows, regional rollout sequencing, and access control for staging → production promotion.

**Encore services deploy via Encore Cloud CI/CD, not Deploybot.** Only use this skill for Continuum services.

---

## When to Use vs. Related Skills

| Situation | Use This Skill | Use Instead |
|-----------|---------------|-------------|
| Deploying a Continuum service | ✅ Yes | — |
| Deploying an Encore TS/Go service | ❌ No | Encore Cloud CI/CD (push to branch) |
| GKE workload deployment | ❌ No | `/kubernetes-specialist` |
| GHES CI/CD pipeline failures | ❌ No | `/jira-analyser-engineering` or CICDO |
| Understanding what changed in a release | ❌ No | Releasegen (`releasegen.groupondev.com`) |

---

## Deploybot URL

**`https://deploybot.groupondev.com/`**

Requires Okta authentication. Use your Groupon SSO credentials.

---

## Deployment Flow

### Standard Release Flow

```
1. Build passes in GHES → new release created
2. Deployer opens Deploybot UI → finds the service and release
3. Authorize the deployment (click "Authorize")
4. Staging rollout begins:
   → us-central1 (deployed first)
   → eu-west-1   (deployed second)
5. Verify staging looks healthy
6. Click "Promote" to start production
7. Production rollout:
   → us-central1 (deployed first)
   → us-west-1   (deployed second)
   → us-west-2   (deployed third)
   → eu-west-1   (deployed last)
```

**Production rollout is sequential by region.** If a region fails, stop and investigate before proceeding to the next region.

### Rollback

In Deploybot UI:
1. Find the service → select the previously-deployed version
2. Authorize that version → Promote to production
3. Follow the same regional order

For emergency rollback: contact on-call and use Deploybot to revert to the last known good release.

---

## Access and Permissions

### Who Can Deploy

Deployers need **write access to the target namespace**. Access is managed via LDAP group membership.

### Getting Access

1. Go to `https://arq.groupondev.com/ra/request/service`
2. Request write access to the target namespace
3. An approver will authorize using Okta credentials
4. LDAP group membership is updated — allow 15–30 min for propagation

### Common Error: "Access Denied"

```
Cause:   User is not in the LDAP group for the target namespace
Fix:     Raise an ARQ request at arq.groupondev.com/ra/request/service
         Wait for LDAP propagation (15-30 min)
         Do NOT try to work around this — access is enforced for SOX compliance
```

---

## Grafana Dashboard

Deploybot metrics and deployment activity:
`https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/ee3wlpqtub85cc/cicd-and-observability`

---

## Related Tools

| Tool | URL | Purpose |
|------|-----|---------|
| **Deploybot** | `https://deploybot.groupondev.com/` | Deployment authorization and promotion |
| **Releasegen** | `https://releasegen.groupondev.com/` | Release notes from PRs and Jira tickets |
| **ARQ** | `https://arq.groupondev.com/ra/request/service` | Namespace access requests |
| **GHES** | `https://github.groupondev.com/` | Source and CI/CD pipelines |

---

## Encore Service Deployment (Different Flow)

Encore services do **not** use Deploybot. Their CI/CD is fully managed by Encore Cloud:

```
Push to branch → Encore Cloud runs tests → Deploys to preview
Merge to main  → Encore Cloud deploys to production automatically
```

No manual authorization step is needed for Encore services. If you're being asked to deploy an Encore service through Deploybot, that's wrong — the service should be configured for Encore Cloud deployment.

---

## Gotchas

**LDAP group ≠ immediate access** — Adding a user to the LDAP group does not grant access instantly. Propagation takes 15–30 minutes. Don't assume access is broken if it fails within this window.

**Missing LDAP group = silent "access denied"** — Deploybot shows "access denied" without indicating that the LDAP group is the cause. Always check LDAP group membership first when a deployer reports access issues.

**Staging and production use different regional orders** — Staging: us-central1 → eu-west-1. Production: us-central1 → us-west-1 → us-west-2 → eu-west-1. Deploying to "us-central1 production" without understanding this means you've only deployed to one of four production regions.

**Never skip region failures** — If a production deployment fails in us-central1, do not promote to us-west-1. Investigate first. Region failures often indicate a config or schema mismatch that will affect all regions.

**Encore services don't use Deploybot** — The most common confusion. Encore TS/Go services in `apps/encore-ts/` and `apps/encore-go/` are deployed entirely via Encore Cloud on merge to main. Deploybot is for Continuum services only.

**Approver must use Okta credentials** — The approver who processes the ARQ request must authenticate with Okta. Using an expired Okta session or a non-SSO account will fail the approval.
