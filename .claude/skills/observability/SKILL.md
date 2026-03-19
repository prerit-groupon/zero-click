---
name: observability
description: >
  Groupon's full observability stack — metrics, logging, and alerting infrastructure. Use this skill
  for anything related to: Thanos (Receiver, Store, Query, Query Frontend, Compact, Rule), Telegraf
  agent/gateway, CLAM (Cluster Aggregator for Metrics), Grafana dashboards/alerting, the ELK/EFK
  logging stack (Elasticsearch, Logstash, Kibana, Filebeat, Elastic Agent), APM, the metrics Kafka
  pipeline (metrics_aggregates, metrics_v2_histograms), TPM cardinality, runbooks for Thanos/Grafana
  alerts, or any troubleshooting across the observability layer. Covers both the Conveyor Cluster
  (Logging namespace) and Metrics Projects on GCP.
---

# Groupon Observability Stack

This skill covers the full observability infrastructure at Groupon: metrics collection and storage
(Telegraf → CLAM → Thanos), log aggregation (Filebeat/Elastic Agent → Kafka → Logstash → Elasticsearch → Kibana),
and dashboarding and alerting (Grafana). Based on CICDO team KT sessions (September 2025).

---

## When to Use This Skill

- How metrics flow from services to Grafana dashboards
- How logs flow from pods to Kibana
- Thanos component architecture, configuration, and runbooks
- Telegraf agent vs. gateway setup and cardinality management
- CLAM Kafka Streams aggregation
- ELK/Elastic stack deployment, operators, and APM
- Grafana HA deployment, alerting, plugins, and Okta auth
- Troubleshooting: high latency, out-of-capacity, Redis memory, open FDs, CLAM rebalancing

## When NOT to Use This Skill

| Situation | Use Instead |
|-----------|-------------|
| GCP or AWS cloud cost analysis, CUD expiry | `/cloud-cost-optimizer` or `/gcp-cost-optimizer` |
| Kubernetes node/pod rightsizing, GKE cluster tuning | `/kubernetes-specialist` |
| Database query performance, connection pool exhaustion on PostgreSQL | `/postgres` |
| Application-level tracing for Encore services (not Thanos/Grafana layer) | `/platform-architect` for design; Encore built-in tracing for implementation |
| Business dashboards (Tableau, BigQuery analytics) | `/data-architect` |

---

## Architecture Diagrams

Two architecture diagrams are stored alongside this skill:

| File | Description |
|------|-------------|
| `references/architecture-logging.png` | Full logging stack — Conveyor Cluster, Logging Namespace, ELK on Data/Unified clusters, Filebeat/Elastic Agent DaemonSets, APM, Akamai, Okta auth, GitHub/Jenkins/Ansible admin. **Place the diagram shared in the KT session here.** |
| `references/architecture-metrics.png` | Metrics pipeline — Grafana → Thanos Query Frontend → Thanos Query → Thanos Receiver + Stores → GCS, plus Prometheus scrape paths. **Place the diagram shared in the KT session here.** |

---

## Stack 1: Metrics Pipeline

```
Service → Telegraf Agent → Telegraf Gateway → Kafka Topics → CLAM / Thanos Receiver → Thanos Query → Grafana
```

### Detailed Flow

1. **Services** push metrics via **Gtier** (Java library) to the **Telegraf Agent**
2. **Telegraf Agent** sits behind `telegraf.production` (load-balanced). Performs first-tier aggregation and strips UIDs to manage cardinality (TPM)
3. **Telegraf Gateway** receives from agents, applies further aggregation, routes to:
   - `metrics_v2_histograms` Kafka topic → **CLAM** for histogram merges
   - `metrics_aggregates` Kafka topic ← CLAM output, looped back to Gateway
   - **Thanos Receiver** via Prometheus remote write
4. **CLAM** consumes `metrics_v2_histograms`, performs mathematical aggregation, outputs to `metrics_aggregates`
5. Users query via **Grafana** → **Thanos Query Frontend** → **Thanos Query** → Receivers + Stores

For full detail: see `references/thanos-components.md`, `references/telegraf-clam.md`, `references/grafana-config.md`

---

## Stack 2: Logging Pipeline

```
Service Pod (Main Container + Filebeat Sidecar)
    └→ Kafka Logging Svc (Strimzi-Kafka operator, Conveyor Cluster)
    └→ Filebeat GCS
         └→ Logstash (ETL, Data Cluster, Logging Namespace)
              └→ Elasticsearch (Data Cluster) ← Kibana (Data Cluster)
              └→ Elasticsearch (Unified Cluster) ← Kibana (Unified Cluster / Admin UI)
Elastic Agent DaemonSet → Elastic APM
Filebeat DaemonSet → GCS (Cloud Storage, Logging Project)
API Users → Elastic API 9200
```

### Key Components

| Component | Role | Deployment |
|-----------|------|-----------|
| **Filebeat Sidecar** | Collects logs from each pod's main container | Injected sidecar per pod |
| **Filebeat DaemonSet** | Node-level log forwarding to GCS | DaemonSet, Logging Namespace |
| **Elastic Agent DaemonSet** | Sends APM data and node metrics to Elastic | DaemonSet, Logging Namespace |
| **Strimzi-Kafka Operator** | Manages Kafka cluster for log streaming | Conveyor Cluster |
| **Kafka Logging Svc** | Kafka topic for log events | Conveyor Cluster |
| **Logstash** | ETL — parses, transforms, routes logs | Data Cluster, Logging Namespace |
| **Elasticsearch (Data Cluster)** | Primary log store, API on port 9200 | Data Cluster |
| **Kibana (Data Cluster)** | Log search UI for data team | Data Cluster, port 443 |
| **Elasticsearch (Unified Cluster)** | Unified search store for ops/support | Unified Cluster |
| **Kibana (Unified Cluster)** | Unified UI + Admin UI | Unified Cluster, port 443 |
| **Elastic APM** | Application performance monitoring | CRD-managed |
| **Elastic Operator** | Manages all Elastic CRDs (Kibana, ES, Logstash, APM, Elastic Agents) | Logging Namespace |
| **Data Admin UI** | Admin interface for Elastic data cluster | Logging Namespace |
| **Kibana Store** | Persistent storage for Kibana state | Unified Cluster |

### Administration
- **GitHub → Jenkins → Ansible** pipeline manages configuration and deployment of the logging stack
- **Akamai** sits in front of GCP Cloud Storage (Logging Project) for log archival
- **Okta** provides authentication for Kibana and Grafana

### CRD-Based Deployment
The entire Elastic stack is managed via **Custom Resource Definitions (CRDs)**:
- `Kibana` CRD → deploys Kibana
- `Elasticsearch` CRD → deploys Elasticsearch clusters
- `Logstash` CRD → deploys Logstash
- `ElasticAgents` CRD → deploys Elastic Agent DaemonSets
- `APM` CRD → deploys Elastic APM server
- All managed by the **Elastic Operator** (deployed in Logging Namespace)

---

## Quick Troubleshooting Guide

| Symptom | Likely Cause | Remediation |
|---------|-------------|-------------|
| High query latency | Thanos Store at capacity | Delete and restart affected Store pod (e.g. `thanos-store-0`) |
| Out-of-capacity alert on Store | Concurrent capacity metric at zero | Restart the Store pod to clear the request queue |
| Redis memory at 99% | Index cache full on Thanos Store | Flush Redis data |
| Query timeouts | Thanos Query overloaded | `kubectl rollout restart deployment/thanos-query -n <ns>` |
| Thanos Compact disk space alert | Compactor downloading large objects | Monitor; may need larger disk or manual cleanup |
| Grafana open file descriptors > 3000 | Resource leak | `kubectl rollout restart deployment/grafana-ha -n logging` |
| CLAM rebalancing alerts | CLAM pod restarting or down | Usually self-resolves; monitor Kafka consumer lag |
| 500 errors on Telegraf | Pipeline issue | Check Kibana for 500-series errors on Telegraf index |
| Metrics not appearing | Service-side issue | If no 500s on our side → issue is in service's internal Telegraf or Gtier |
| Thanos Receiver router crash loop | Fewer than 2 ingestor pods | Ensure at least 2 StatefulSet pods are healthy (replication factor = 2) |
| Logs not appearing in Kibana | Filebeat sidecar or Kafka lag | Check Filebeat sidecar logs; check Kafka consumer lag on logging topic |
| Alert duplication in Grafana | HA alerting sync issue | Check inter-pod communication on Grafana port 9894 |

---

## Key URLs and Resources

### Metrics
- **Grafana (prod)**: `https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com`
- **Grafana (internal watchdog)**: `http://grafana-internal.logging.prod.gcp.groupondev.com/dashboards/f/ce2iir85boxs0c/`
- **Telegraf dashboard**: `https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/d/de79c6cf9gnswa/telegraf?orgId=1`
- **CLAM dashboard**: `https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/d/ae768r30w0m4ge/clam-kafka-stream`
- **Telegraf config (agent)**: `https://github.groupondev.com/metrics/telegraf-deployment/blob/develop/telegraf.conf#L1`
- **Telegraf config (gateway)**: `https://github.groupondev.com/metrics/telegraf-deployment/blob/develop/.meta/deployment/cloud/components/gateway/common.yml#L65`
- **Thanos raw manifests**: `https://github.groupondev.com/metrics/metrics-v2/tree/main/charts/thanos-groupon-stack/templates`
- **Thanos alert runbooks**: `https://groupondev.atlassian.net/wiki/spaces/EO/pages/81940807732/Runbook+for+Thanos+Alerts`
- **CLAM GitHub**: `https://github.groupondev.com/metrics/CLAM_KafkaStream`
- **CLAM service portal**: `https://services.groupondev.com/services/clam`

### Logging
- **Kibana (Data Cluster)**: Data Cluster, port 443 — check Elastic Operator CRDs for exact endpoint
- **Kibana (Unified)**: Unified Cluster, port 443
- **Elastic Admin UI**: Data Admin UI, Logging Namespace

---

## Reference Files

| File | Contents |
|------|----------|
| `references/thanos-components.md` | Receiver, Store, Query, Compact, Rule — config, architecture, troubleshooting |
| `references/telegraf-clam.md` | Telegraf Agent/Gateway, CLAM, Kafka topics — architecture, plugins, troubleshooting |
| `references/grafana-config.md` | Grafana HA deployment, alerting, Okta auth, plugins, internal Grafana |
| `references/architecture-logging.png` | Architecture diagram: full logging stack |
| `references/architecture-metrics.png` | Architecture diagram: full metrics pipeline |

---

## Gotchas

### Thanos

**Replication factor minimum is 3 pods** — If any Thanos receiver pod restarts, replication failure alerts fire immediately. Don't panic — check if pods are recovering before escalating. The alert resolves once pods are back.

**Compact race condition** — Running more than one Thanos Compact instance against the same GCS bucket corrupts data. Only one Compact per bucket. If you see two running, kill one immediately.

**Query Frontend stale cache** — After a compaction run, the Query Frontend cache can serve outdated data, causing dashboards to show gaps that don't match what the Store has. Clear the Query Frontend cache if users report missing data after a compaction.

**Open file descriptors on Thanos Store** — Thanos Store can hit OS `ulimit` on file descriptors silently, causing query timeouts with no clear error. Check container `ulimit` and GKE container limits if query timeouts appear without obvious cause.

**Fewer than 2 ingestor pods = receiver crash loop** — The Thanos Receiver router will crash-loop if fewer than 2 ingestor pods are healthy (replication factor requires 2 ingestors). Scale the StatefulSet before touching router replicas.

### CLAM

**MSK maintenance = expected metric gaps (10–30 min)** — During Kafka MSK maintenance, CLAM consumer groups rebalance. Metric gaps of 10–30 minutes will appear in Grafana. This is not a CLAM bug — confirm MSK maintenance is in progress before declaring an incident.

**High-cardinality aggregation rules cause OOM** — Adding new CLAM aggregation rules that group by high-cardinality labels (e.g., user ID, request ID) causes memory pressure and OOM kills. Validate label cardinality before adding any new aggregation rules.

### Telegraf

**Config changes require rolling restart** — Telegraf does not hot-reload configuration. Any change to `telegraf.conf` requires a rolling restart of all agent and gateway pods for the change to take effect.

**Silent metric drops when Kafka is unreachable** — If Telegraf cannot reach Kafka, it drops metrics silently — no alert fires by default. Check Telegraf's internal metrics (`internal_write`) in the Telegraf Grafana dashboard for output errors before concluding that a service has no metrics.

### Grafana

**Terraform-managed dashboards are overwritten on apply** — Dashboards provisioned via Terraform/GitOps are reset on the next `terraform apply`. Manual edits in the Grafana UI will be lost. All dashboard changes must go through the IaC pipeline.

**Alert rule evaluation can lag** — Grafana alert rules evaluate on a fixed interval. If the Thanos data source responds slowly, alerts may fire late or miss short-duration spikes. Don't rely on Grafana alerts for sub-minute incident detection.

**Inter-pod HA alert sync uses port 9894** — Grafana HA (multiple replicas) uses Gossip on port 9894 for alert deduplication. If this port is blocked by a NetworkPolicy or firewall rule, alert duplication occurs. Verify pod-to-pod connectivity on this port when running HA mode.

### ELK / Logging

**Index lag is almost always Logstash, not Elasticsearch** — When `index lag` alerts fire, check Logstash grok filter errors first. ES is rarely the bottleneck. Wrong grok patterns produce `_grokparsefailure` tagged documents that land in the index with wrong field structure — check for this before scaling ES nodes.

**Elasticsearch disk watermarks** — ES stops shard allocation at 85% disk (low watermark) and makes indices read-only at 95% (flood watermark). If logs stop flowing, check disk usage before touching Logstash or Kafka. Clear old indices or expand storage.

**ECK operator upgrades: never skip major CRD versions** — Upgrade the Elastic operator sequentially (e.g., 2.8 → 2.9 → 2.10). Skipping from 2.8 → 2.10 directly corrupts CRD schemas.

**Filebeat registry file corruption = massive re-send** — If Filebeat's registry file corrupts (node failure, bad shutdown), Filebeat re-sends all historical logs. This produces a massive ingestion spike that can overwhelm Kafka and Logstash. Monitor for sudden volume increases after node restarts.

**Kafka consumer lag ≠ data loss** — Kafka buffers all log events until retention expires. Sustained Kafka consumer lag means Logstash can't keep up, but data is not lost. Don't trigger a data-loss incident on lag alone — check retention settings first.
