---
description: "Master entry point for CICDO platform context. Agent: ALWAYS read this file first. Scan the landscape, then follow only the links relevant to the current task. Do NOT read everything — use progressive disclosure."
team: CICDO (CI/CD & Observability)
org: Groupon
version: "2.0.0"
last_updated: 2026-03-18
---

# CICDO Platform Context

The CICDO team owns Groupon's developer infrastructure: CI/CD pipelines, monitoring, logging, artifact management, code quality, and release engineering. This is the shared context for the entire engineering organization.

## How to Use This Context

```
You are here: INDEX.md
         │
         ├─→ Need to understand a domain?     → domains/<domain>.md
         ├─→ Need to fix an incident?          → runbooks/<topic>.md
         ├─→ Need to find a repo?              → repositories.json
         ├─→ Need to route an AI task?         → AGENT_ROUTING_RULES.md
         ├─→ Need architecture context?        → ARCHITECTURE.md or architecture/<domain>.md
         ├─→ Need a link or dashboard?         → references/links.md
         ├─→ Hit a weird failure?              → gotchas/<domain>.md
         └─→ Something wrong with this context? → .meta/
```

**Progressive disclosure**: Each file has YAML frontmatter with a `description` field. Scan descriptions before reading full files. Most decisions can be made without reading a single full file.

---

## Domain Maps of Content

Each domain MOC is the entry point for one area of CICDO ownership. Read the MOC before diving deeper.

- [[domains/monitoring]] — Thanos, Telegraf, CLAM, Grafana, Prometheus, PagerDuty. The metrics pipeline from collection to alerting.
- [[domains/logging]] — ELK stack (Filebeat → Kafka → Logstash → Elasticsearch → Kibana). Log centralization and search.
- [[domains/jenkins]] — Jenkins CI pipelines, DSL libraries, build plugins, agent AMIs, Terraform modules.
- [[domains/github]] — GitHub Enterprise Server (GHES), GitHub Actions runners, CodeRabbit, Actions sync.
- [[domains/artifactory]] — JFrog Artifactory on GCP. Docker/NPM artifact management and AWS→GCP migration.
- [[domains/release-engineering]] — Deploybot, Mergebot, Releasegen. Deployment authorization and release automation.
- [[domains/sonarqube]] — SonarQube code quality platform on GCP. Static analysis and quality gates.

---

## Platform-Level Documents

- [[ARCHITECTURE]] — Full platform architecture: how the 7 domains connect into one developer platform
- [[DEPENDENCY_GRAPH]] — Cross-repository dependencies and pipeline triggers
- [[repositories.json]] — Machine-readable manifest of all 40 repositories (name, domain, language, description, git URL)
- [[AGENT_ROUTING_RULES]] — Rules for AI agents to route tasks to the correct domain, repo, and runbook
- [[AI_USAGE_GUIDE]] — How engineers should interact with AI agents when working with CICDO systems
- [[CLAUDE.md]] — Claude Code / Cowork workspace routing instructions

---

## Operational Knowledge

### Runbooks
- [[runbooks/thanos-alerts]] — Thanos receive replication failures, component health
- [[runbooks/clam-troubleshooting]] — CLAM Kafka stream issues, pod failures, MSK maintenance
- [[runbooks/elk-alerts]] — ELK stack alert remediation (index lag, parsing errors, ingestion bottlenecks)
- [[runbooks/elk-troubleshooting]] — General ELK troubleshooting framework
- [[runbooks/disk-iops]] — GCP persistent disk IOPS/throughput scaling
- [[runbooks/artifactory]] — Artifactory migration scripts, Docker/NPM distribution, manifest fixes
- [[runbooks/deploybot-alerts]] — Deploybot authorization, namespace access, stage promotion
- [[runbooks/github-enterprise]] — GHES production infrastructure, HA, networking
- [[runbooks/gha-runners]] — GitHub Actions runner controller installation, sizing, DinD, troubleshooting
- [[runbooks/sync-actions]] — Mirroring Actions repos from GitHub.com → GHES

### Architecture Details
- [[architecture/monitoring]] — Metrics pipeline: Telegraf → Kafka → CLAM → Thanos → Grafana
- [[architecture/logging]] — Log pipeline: Filebeat → Kafka → Logstash → Elasticsearch → Kibana
- [[architecture/github]] — GHES HA topology, GHA runner controller → listener → pod lifecycle
- [[architecture/release-engineering]] — Deploybot/Releasegen deployment flow

### Gotchas (Known Failure Patterns)
- [[gotchas/monitoring]] — Thanos, CLAM, Telegraf common failures
- [[gotchas/logging]] — ELK stack common failures
- [[gotchas/jenkins]] — Jenkins pipeline DSL gotchas
- [[gotchas/github]] — GHA runner, GHES configuration gotchas
- [[gotchas/general]] — Cross-cutting issues (auth, GCP, networking)

### Quick References
- [[references/links]] — All important URLs (Grafana, Kibana, Deploybot, Artifactory)
- [[references/repos]] — All GitHub orgs and repositories by domain
- [[references/dashboards]] — Grafana dashboard links organized by domain
- [[references/team]] — Team structure, ownership, on-call info

---

## Self-Improvement (.meta/)

This context is a **living system**. It improves through use.

- `.meta/observations/log.jsonl` — Append-only log: what task, what context was used, did it help?
- `.meta/amendments/changelog.md` — What changed, why, and did it improve outcomes?
- `.meta/scoring/criteria.md` — 12-question binary checklist for evaluating context quality
- `.meta/config.json` — Team and platform configuration

**After every significant interaction**: log an observation.
**When something fails**: add to the relevant gotchas file and log the failure.
**When you improve a file**: record it in the changelog.
