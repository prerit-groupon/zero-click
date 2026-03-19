---
description: "CICDO team structure and ownership map. Update this as team changes happen."
---

# CICDO Team

## Team Overview

**Team**: CI/CD & Observability (CICDO)
**Organization**: Groupon
**Mission**: Own and operate Groupon's developer infrastructure — CI/CD pipelines, monitoring, logging, artifact management, code quality, and release engineering.

## Domain Ownership

| Domain | Primary Owner | Notes |
|--------|--------------|-------|
| Monitoring (Thanos/Telegraf/CLAM/Grafana) | CICDO | Metrics pipeline end-to-end |
| Logging (ELK/ECK) | CICDO | Log pipeline end-to-end |
| Jenkins | CICDO | Pipelines, DSLs, plugins, infra |
| GitHub (GHES/GHA) | CICDO | Enterprise server + Actions runners |
| Artifactory | CICDO | Artifact hosting, migration |
| Release Engineering | CICDO | Deploybot, Mergebot, Releasegen |
| SonarQube | CICDO | Code quality platform |

## On-Call

- Alerts route through **PagerDuty**
- Runbooks in `runbooks/` folder
- Escalation: check domain MOC for domain-specific escalation paths

## TODO

- [ ] Add individual team member names and roles
- [ ] Add on-call rotation schedule
- [ ] Add stakeholder contacts per domain
