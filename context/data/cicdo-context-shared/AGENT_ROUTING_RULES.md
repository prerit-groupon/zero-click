---
description: "Routing rules for AI agents working with CICDO systems. Agent: read this when you need to decide which domain, repo, runbook, or team to route a task to. These rules prevent you from guessing."
---

# Agent Routing Rules

## Routing Sequence

When you receive a task related to CICDO systems, follow this sequence:

```
1. CLASSIFY  → Which domain does this belong to?
2. LOCATE    → Which repo, runbook, or reference answers this?
3. CHECK     → Are there gotchas for this domain?
4. ACT       → Execute with the right context loaded
5. LOG       → Record the observation in .meta/observations/log.jsonl
```

---

## Step 1: Domain Classification

Match the task to a domain using these keywords and patterns:

| If the task mentions... | Route to domain | Read first |
|------------------------|-----------------|------------|
| metrics, Thanos, Telegraf, CLAM, Grafana, Prometheus, dashboards, alerting rules, TPM, time series | **monitoring** | `domains/monitoring.md` |
| logs, ELK, Elasticsearch, Kibana, Logstash, Filebeat, ECK, index lag, log search, Kafka (log context) | **logging** | `domains/logging.md` |
| Jenkins, pipeline, DSL, build, CI, agent AMI, Maven build env, Groovy, Jenkinsfile | **jenkins** | `domains/jenkins.md` |
| GitHub, GHES, GHA, runners, Actions, CodeRabbit, git clone, PR, repository access | **github** | `domains/github.md` |
| Artifactory, artifacts, Docker images, NPM packages, Maven artifacts, migration | **artifactory** | `domains/artifactory.md` |
| deploy, Deploybot, Mergebot, Releasegen, release notes, staging, production promotion | **release-engineering** | `domains/release-engineering.md` |
| SonarQube, code quality, static analysis, quality gates | **sonarqube** | `domains/sonarqube.md` |

**If ambiguous**: Check `DEPENDENCY_GRAPH.md` — the task may span multiple domains.

---

## Step 2: Task Type → Resource Mapping

| Task type | Go to |
|-----------|-------|
| "Something is broken / alert fired" | `runbooks/<topic>.md` → then `gotchas/<domain>.md` |
| "How does X work?" | `domains/<domain>.md` → then `architecture/<domain>.md` |
| "Where is the code for X?" | `repositories.json` (search by name, domain, or tags) |
| "What's the URL for X?" | `references/links.md` or `references/dashboards.md` |
| "Who owns X?" | `references/team.md` |
| "Which repo should I change?" | `repositories.json` → filter by domain + description |
| "How do repos depend on each other?" | `DEPENDENCY_GRAPH.md` |

---

## Step 3: Incident Routing (Alert → Runbook)

| Alert / symptom | Runbook |
|-----------------|---------|
| Thanos replication failure, receiver pods down | `runbooks/thanos-alerts.md` |
| CLAM metric abnormality, Kafka stream issues | `runbooks/clam-troubleshooting.md` |
| ELK index lag, log ingestion delay | `runbooks/elk-alerts.md` |
| ELK component failure (general) | `runbooks/elk-troubleshooting.md` |
| Disk I/O utilization >80% | `runbooks/disk-iops.md` |
| Artifactory sync failure, Docker image mismatch | `runbooks/artifactory.md` |
| Deployment authorization failure, access denied | `runbooks/deploybot-alerts.md` |
| GHES unavailable, replication issues | `runbooks/github-enterprise.md` |
| GHA runners not picking up jobs | `runbooks/gha-runners.md` |
| Actions not available in GHES | `runbooks/sync-actions.md` |

---

## Step 4: Repository Selection (Code Changes)

When a task requires code changes, use `repositories.json` to find the right repo:

```
1. Filter by domain (from Step 1)
2. Match description to the specific component
3. Check tags for additional context
4. Verify branch name (some use main, others master, others develop)
```

**Critical gotcha**: Some repos have customized forks (e.g., `github-cloud-arc` is a customized ARC, NOT upstream). Always check the repo description before assuming standard behavior.

---

## Step 5: Cross-Domain Tasks

Some tasks span multiple domains. Common patterns:

| Scenario | Domains involved | Start with |
|----------|-----------------|------------|
| "Metrics aren't showing in Grafana" | monitoring (Thanos) + monitoring (Grafana) | `runbooks/thanos-alerts.md` |
| "Logs are delayed and alerts are stale" | logging (ELK) + monitoring (Grafana alerts) | `runbooks/elk-alerts.md` |
| "Build failed and can't deploy" | jenkins + release-engineering | `domains/jenkins.md` |
| "Can't push to GitHub or run Actions" | github (GHES) + github (GHA) | `domains/github.md` |
| "Disk full on monitoring nodes" | monitoring + logging (shared infra) | `runbooks/disk-iops.md` |

---

## Anti-Patterns (Don't Do This)

- **Don't guess repos** — Always check `repositories.json`. Repo names are not always obvious.
- **Don't skip gotchas** — Read `gotchas/<domain>.md` before giving advice. 30 seconds prevents a bad recommendation.
- **Don't assume standard configs** — Many CICDO services have customized configurations. Check the domain MOC.
- **Don't read all files** — Use progressive disclosure. Start with INDEX.md → domain MOC → specific file. Most tasks need 2-3 files, not 20.
- **Don't forget to log** — Every significant interaction should be recorded in `.meta/observations/log.jsonl`.
