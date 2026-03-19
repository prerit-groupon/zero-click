---
description: "Cross-repository dependencies and pipeline triggers across CICDO domains. Use when you need to understand what breaks when something changes, or how data flows between systems."
---

# CICDO Dependency Graph

## Platform Data Flow (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION CODE                             │
│                    (services across Groupon)                         │
└──────────┬──────────────────────────────────┬───────────────────────┘
           │ metrics                          │ logs
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────┐
│  TELEGRAF AGENTS     │           │  FILEBEAT AGENTS     │
│  (telegraf-deployment)│          │  (grpn-filebeat)     │
└──────────┬──────────┘           └──────────┬──────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────────────────────────────────────────┐
│                        KAFKA                             │
│  metrics_aggregates, metrics_v2_histograms │ log topics  │
└──────────┬─────────────────────────────────┬────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────┐
│  CLAM                │           │  LOGSTASH            │
│  (clam, KafkaStream) │           │  (eck-pipeline-auto) │
└──────────┬──────────┘           └──────────┬──────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────┐
│  THANOS              │           │  ELASTICSEARCH       │
│  (metrics-gcp-terra) │           │  (eck-infra/operator)│
└──────────┬──────────┘           └──────────┬──────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────┐
│  GRAFANA             │           │  KIBANA              │
│  (grafana-terraform) │           │  (logging-searches)  │
└──────────┬──────────┘           └──────────────────────┘
           │
           ▼
┌─────────────────────┐
│  PAGERDUTY           │
│  (alert routing)     │
└─────────────────────┘
```

## CI/CD Pipeline Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  DEVELOPER   │────▶│  GITHUB      │────▶│  JENKINS     │
│  (git push)  │     │  (GHES)      │     │  (pipelines) │
└──────────────┘     │  + CodeRabbit│     │  + DSLs      │
                     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     ┌──────▼───────┐     ┌──────▼───────┐
                     │  GHA RUNNERS │     │  SONARQUBE   │
                     │  (cloud-arc) │     │  (quality)   │
                     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐     ┌──────────────┐
                     │  ARTIFACTORY │────▶│  DEPLOYBOT   │
                     │  (artifacts) │     │  (deploy auth)│
                     └──────────────┘     └──────┬───────┘
                                                  │
                                          ┌──────▼───────┐
                                          │  RELEASEGEN  │
                                          │  (release    │
                                          │   notes)     │
                                          └──────────────┘
```

---

## Cross-Domain Dependencies

### Monitoring Domain Dependencies

| Component | Depends on | Impact if broken |
|-----------|-----------|------------------|
| Telegraf agents | Kafka brokers | Metrics stop flowing. Silent drops. |
| CLAM | Kafka topics (metrics_aggregates, metrics_v2_histograms) | Aggregated metrics unavailable to Thanos |
| Thanos Receiver | CLAM output | No new metrics ingested |
| Thanos Query | Thanos Store + Receiver | Grafana dashboards show gaps |
| Grafana | Thanos Query Frontend | No visualization, no alerting |
| Grafana Alerts | PagerDuty integration | Alerts don't reach on-call |
| FluxCD | Git (flux-manifests repo) | Monitoring stack can't be updated via GitOps |

### Logging Domain Dependencies

| Component | Depends on | Impact if broken |
|-----------|-----------|------------------|
| Filebeat | Kafka brokers | Logs stop shipping from hosts |
| Logstash | Kafka topics, Elasticsearch | Logs queued but not indexed |
| Elasticsearch | ECK Operator, GKE, PVCs | All log storage and search down |
| Kibana | Elasticsearch | No log search UI |
| ECK Operator | GKE cluster | Can't manage ES cluster lifecycle |

### CI/CD Domain Dependencies

| Component | Depends on | Impact if broken |
|-----------|-----------|------------------|
| GHA Runners | GHES (PAT auth), GKE | All GitHub Actions workflows fail |
| Jenkins pipelines | DSL libraries (dsl-util-library) | Pipeline definitions break |
| Jenkins builds | Maven build env, Agent AMIs | Builds can't execute |
| Artifactory | GCP VM, NGINX | No artifact storage; builds and deploys fail |
| Deploybot | Artifactory (artifacts exist), LDAP (auth) | Can't authorize deployments |
| Releasegen | GitHub API, JIRA API | Can't generate release notes |
| CodeRabbit | GHES PR webhooks | No AI code review on PRs |
| SonarQube | Jenkins (triggers analysis), GCP | No quality gate enforcement |

---

## Change Impact Matrix

Use this when planning changes to understand blast radius:

| If you change... | Also check / test... |
|-----------------|---------------------|
| `dsl-util-library` | ALL pipeline DSLs (java, ruby, itier) — shared dependency |
| `telegraf-deployment` | CLAM ingestion (metrics format), Thanos receiver |
| `scrape-configs` | Grafana dashboards (new targets may need new dashboards) |
| `eck-operator` | ALL Elasticsearch clusters, Kibana, index creation |
| `grpn-filebeat` | Kafka topic throughput, Logstash parsing (log format changes) |
| `github-cloud-arc` | ALL GHA runner types and sizes, runner authentication |
| `grafana-terraform` | Dashboards, alert rules, datasource connections |
| `flux-manifests` | Any FluxCD-managed deployment in monitoring stack |
| `artifactory-gcp-vm` | Build artifact availability, deployment pipeline |
| GHES enterprise PAT | ALL GHA runners stop if expired |

---

## Pipeline Triggers

| Event | Triggers |
|-------|----------|
| Code push to GHES | Jenkins pipeline (if Jenkinsfile) OR GHA workflow (if .github/workflows/) |
| PR opened on GHES | CodeRabbit review, SonarQube analysis (via Jenkins/GHA) |
| Build succeeds | Artifact published to Artifactory |
| Artifact published | Deploybot can authorize deployment |
| Deployment authorized | Deploybot promotes through staging → production regions |
| Release deployed | Releasegen creates release notes from PR/JIRA data |
| Alert rule triggers | Grafana → PagerDuty → on-call engineer |
