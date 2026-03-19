---
description: "MOC for Release Engineering domain. Covers Deploybot, Mergebot, Releasegen. Start here when the task involves deployment authorization, release automation, or deployment pipelines."
domain: release-engineering
repos: ["deploybot-master", "mergebot-master", "releasegen-main"]
---

# Release Engineering — Map of Content

## What We Own

Deployment and release automation at Groupon: Deploybot for deployment authorization, Mergebot for merge automation, Releasegen for release note generation.

## Architecture

- **Deploybot**: Deployment authorization service. Manages approval workflows for staging → production promotion across regions.
- **Mergebot**: Automated merge management
- **Releasegen**: GitHub release note generation from PRs, JIRAs, and deployment data. GraphQL API. Java/Maven service.

Deployment flow:
1. New release created → Deploybot notified
2. Deployer authorizes in Deploybot UI
3. Staging deployment: us-central1 → then eu-west-1
4. Production promotion via Promote button
5. Production deployment: us-central1 → us-west-1 → us-west-2 → eu-west-1

## Runbooks

- [[runbooks/deploybot-alerts]] — Authorization failures, namespace access, LDAP group membership, stage promotion

## Gotchas

- Deployers need write access to target namespace — request via ARQ (arq.groupondev.com/ra/request/service)
- LDAP group membership required — missing group = silent "access denied"
- Approver must use Okta credentials for namespace deployments
- Staging and production follow different regional rollout orders

## Codebases

| Repo | Purpose |
|------|---------|
| `deploybot-master` | Deployment authorization service |
| `mergebot-master` | Automated merge management |
| `releasegen-main` | Release note generation (Java/Maven, GraphQL) |

All source in: `codebases/release-engineering/`

## Key Links

- Deploybot: https://deploybot.groupondev.com/
- Grafana: https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/ee3wlpqtub85cc/cicd-and-observability
- GitHub Org: https://github.groupondev.com/orgs/release-engineering/repositories
