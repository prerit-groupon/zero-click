---
description: "Monitoring architecture overview. Metrics pipeline from Telegraf to Grafana."
domain: monitoring
---

# Monitoring Architecture

## Pipeline Flow

```
Applications/Hosts
    │
    ▼
Telegraf Agents (per host/pod)
    │ collect app + hardware metrics
    ▼
Telegraf Gateways (aggregation)
    │
    ▼
Kafka Topics (metrics_aggregates, metrics_v2_histograms)
    │
    ▼
CLAM (Cluster Aggregator for Metrics)
    │ aggregate, downsample, process
    ▼
Thanos Receiver (min 3 pods, quorum replication)
    │
    ├──► Thanos Store (long-term storage)
    ├──► Thanos Compact (downsampling, retention)
    └──► Thanos Rule (alerting rule evaluation)
            │
            ▼
Thanos Query / Query Frontend
    │ serves PromQL queries
    ▼
Grafana (visualization + alert management)
    │
    ▼
PagerDuty (alert routing + on-call)
```

## Secondary Monitoring

- **Pingdom**: External functional monitoring (uptime checks)
- **SMA (Standard Measurement Architecture)**: Consistent metric naming and collection standards across Groupon

## Infrastructure

- All components run on **GKE** (Google Kubernetes Engine)
- GitOps via **FluxCD** (flux-manifests repo)
- Infrastructure as code via **Terraform** (metrics-gcp-terrabase, grafana-terraform)
- Prometheus scrape configs managed in dedicated repo (scrape-configs)

## Detailed Architecture Diagrams

See: `Important Links/Architecture Diagrams - CICDO.docx` for visual diagrams.
