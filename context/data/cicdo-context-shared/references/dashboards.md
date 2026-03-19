---
description: "Grafana and monitoring dashboard links organized by domain. Use when you need to look at metrics, logs, or health dashboards."
---

# CICDO Dashboards

## Grafana

| Domain | Dashboard | URL |
|--------|-----------|-----|
| GitHub & GHA | GitHub dashboards folder | https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/af9matsixik8we/github |
| Monitoring / Logging / Release Eng | CICD & Observability folder | https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/ee3wlpqtub85cc/cicd-and-observability |
| Artifactory | Artifactory VM GCP | https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/d/artifactory-metrics-gcp/artifactory-vm-gcp?orgId=1 |
| CLAM | CLAM Kafka Stream | Wavefront (check CLAM dashboard) |

## Kibana

| Endpoint | Region |
|----------|--------|
| logging-prod-us-unified1 | US |
| logging-prod-eu-unified1 | EU |
| Unified URL | https://prod-kibana-unified.us-central1.logging.prod.gcp.groupondev.com/ |

## Wavefront

| Dashboard | Purpose |
|-----------|---------|
| CLAM Kafka Stream | CLAM metric processing health |
| Conveyor Cloud Customer Metrics | CLAM infrastructure health (CPU, memory, network) |
