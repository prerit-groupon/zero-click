---
description: "MOC for Monitoring domain. Covers Thanos, Telegraf, CLAM, Grafana, Prometheus, PagerDuty. Start here when the task involves metrics collection, visualization, alerting, or any monitoring infrastructure."
domain: monitoring
repos: ["clam-develop", "CLAM_KafkaStream-develop", "telegraf-deployment-develop", "telegraf-dev-env-develop", "metrics-v2-main", "metrics-gcp-terrabase-main", "gcp-prometheus-main", "grafana-terraform-main", "flux-manifests-main", "scrape-configs-main"]
---

# Monitoring — Map of Content

## What We Own

The metrics pipeline at Groupon: from application instrumentation to dashboards and alerts.

**Stack**: Telegraf → Kafka (metrics_aggregates, metrics_v2_histograms) → CLAM → Thanos (Receiver → Store → Query → Query Frontend → Compact → Rule) → Grafana → PagerDuty

**Secondary monitoring**: Pingdom (functional monitoring), Standard Measurement Architecture (SMA) for consistent metrics.

## Architecture

The metrics flow:
1. **Telegraf agents** collect application and hardware metrics on each host/pod
2. **Telegraf gateways** aggregate and forward to **Kafka** topics
3. **CLAM** (Cluster Aggregator for Metrics) processes Kafka streams, aggregates time series
4. **Thanos Receiver** ingests from CLAM, replicates across pods (min 3 for quorum)
5. **Thanos Store** provides long-term storage access
6. **Thanos Query / Query Frontend** serves PromQL queries to Grafana
7. **Thanos Compact** handles downsampling and retention
8. **Thanos Rule** evaluates alerting rules
9. **Grafana** visualizes metrics and manages alert rules
10. **PagerDuty** receives and routes alerts to on-call

See: [[architecture/monitoring]] for detailed diagrams.

## Runbooks

- [[runbooks/thanos-alerts]] — Thanos receive replication failures, pod crashes, component sync
- [[runbooks/clam-troubleshooting]] — CLAM Kafka stream issues, metric abnormalities, pod failures
- [[runbooks/disk-iops]] — GCP persistent disk IOPS scaling for Thanos storage

## Gotchas

See [[gotchas/monitoring]] for known failure patterns. Key ones:
- Thanos receiver needs minimum 3 pods for replication factor — if pods restart, replication alerts fire immediately
- CLAM rebalancing during MSK maintenance can cause metric gaps
- Telegraf config changes require rolling restart, not just apply
- Open file descriptor limits on Thanos Store can cause silent query failures

## Codebases

| Repo | Purpose |
|------|---------|
| `clam-develop` | CLAM core — metric aggregation service |
| `CLAM_KafkaStream-develop` | CLAM Kafka stream processing |
| `telegraf-deployment-develop` | Telegraf deployment configurations |
| `telegraf-dev-env-develop` | Telegraf development environment |
| `metrics-v2-main` | Metrics v2 pipeline |
| `metrics-gcp-terrabase-main` | GCP Terraform for metrics infrastructure |
| `gcp-prometheus-main` | Prometheus configurations for GCP |
| `grafana-terraform-main` | Grafana infrastructure as code |
| `flux-manifests-main` | FluxCD GitOps manifests for monitoring |
| `scrape-configs-main` | Prometheus scrape configurations |

All source in: `codebases/monitoring/`

## Key Links

- Grafana (Monitoring): https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/ee3wlpqtub85cc/cicd-and-observability
- GitHub Org: https://github.groupondev.com/orgs/metrics/repositories
