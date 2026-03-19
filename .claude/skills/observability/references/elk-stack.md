# ELK / Elastic Stack — Deep Reference

> Source: observability SKILL.md (CICDO KT sessions, September 2025)
> Covers: Elasticsearch, Logstash, Kibana, Filebeat, Elastic Agent, APM, Elastic Operator

---

## Stack Overview

```
Service Pod
  └── Filebeat Sidecar (per pod)
        └── Kafka Logging Svc (Strimzi-Kafka, Conveyor Cluster)
              └── Logstash (ETL, Data Cluster, Logging Namespace)
                    ├── Elasticsearch (Data Cluster) ← Kibana (Data Cluster, port 443)
                    └── Elasticsearch (Unified Cluster) ← Kibana (Unified Cluster / Admin UI, port 443)

DaemonSets (Logging Namespace):
  Filebeat DaemonSet → GCS (Cloud Storage, Logging Project) [via Akamai]
  Elastic Agent DaemonSet → Elastic APM

API Users → Elastic API :9200
```

---

## Clusters

| Cluster | Purpose | Access |
|---------|---------|--------|
| **Conveyor Cluster** | Hosts Kafka for log streaming (Logging Namespace) | Internal |
| **Data Cluster** | Elasticsearch + Kibana for data team | Kibana port 443 |
| **Unified Cluster** | Elasticsearch + Kibana for ops/support (Admin UI) | Kibana port 443 |
| **Logging Namespace** | Where Logstash, DaemonSets, Elastic Operator live | Internal |

---

## Component Details

### Filebeat Sidecar

- Injected as a **sidecar container** into each service pod
- Reads from the main container's log output
- Ships logs to **Kafka Logging Svc** on Conveyor Cluster
- Config managed via Ansible (GitHub → Jenkins → Ansible pipeline)

### Filebeat DaemonSet

- Runs on every node in the Logging Namespace
- Ships node-level logs and Kubernetes audit logs to **GCS** (Cloud Storage, Logging Project)
- Akamai sits in front of GCS for archival/CDN

### Elastic Agent DaemonSet

- Runs on every node in the Logging Namespace
- Sends APM data and node metrics to **Elastic APM server**
- Managed as a CRD by the Elastic Operator

### Logstash

- Deployed in Data Cluster, Logging Namespace
- Consumes from Kafka Logging topic
- Performs ETL: parsing, transformation, field enrichment
- Routes to both Elasticsearch clusters (Data + Unified)

### Elasticsearch (Data Cluster)

- Primary log store
- API accessible on port 9200 for direct queries
- Backed by Kibana (Data Cluster) for log search UI

### Elasticsearch (Unified Cluster)

- Unified search store for ops/support teams
- Powers the Admin UI and unified Kibana

### Kibana

- **Data Cluster Kibana** — data team log search, port 443
- **Unified Cluster Kibana** — ops/support, Admin UI, port 443
- **Kibana Store** — persistent storage for Kibana state (Unified Cluster)
- Authentication via **Okta**

### Elastic APM

- Application performance monitoring
- Deployed as a CRD (`APM` custom resource)
- Receives data from Elastic Agent DaemonSet
- Surfaced via Kibana APM UI

---

## Elastic Operator (CRD-Based Management)

All Elastic components are deployed and managed via **Custom Resource Definitions** in the Logging Namespace:

| CRD | What it deploys |
|-----|----------------|
| `Elasticsearch` | Elasticsearch cluster |
| `Kibana` | Kibana instance |
| `Logstash` | Logstash deployment |
| `ElasticAgents` | Elastic Agent DaemonSets |
| `APM` | Elastic APM server |

**Operator location:** Logging Namespace on the Data Cluster

**Admin workflow:** GitHub → Jenkins → Ansible manages configuration and deployment changes.

---

## Administration

- **Config management:** GitHub repo → Jenkins pipeline → Ansible playbooks
- **Auth:** Okta for both Kibana instances
- **Log archival:** Filebeat DaemonSet → GCS via Akamai

---

## Troubleshooting

| Symptom | Likely Cause | Remediation |
|---------|-------------|-------------|
| Logs not appearing in Kibana | Filebeat sidecar not running or Kafka lag | Check Filebeat sidecar logs: `kubectl logs <pod> -c filebeat`; check Kafka consumer lag on logging topic |
| Kibana unreachable | Kibana pod down | `kubectl rollout restart kibana/<instance> -n logging` or check Elastic Operator CRD status |
| Elasticsearch yellow/red | Missing replica shards | Check cluster health: `GET /_cluster/health`; check for unassigned shards |
| Logstash not processing | Pipeline error or Kafka offset issue | Check Logstash logs for parse errors; verify Kafka topic lag |
| APM data missing | Elastic Agent DaemonSet down | `kubectl get daemonset -n logging`; check agent pod status |
| High index disk usage | Old indices not rolled over | Check ILM (Index Lifecycle Management) policy; manually trigger rollover if needed |
| Kibana login failing | Okta integration issue | Check Okta SAML config; check Kibana pod logs for auth errors |

---

## Key Queries (Kibana Dev Tools)

```json
// Cluster health
GET /_cluster/health

// Index sizes
GET /_cat/indices?v&s=store.size:desc&h=index,store.size,docs.count

// Current shard allocation (check for unassigned)
GET /_cluster/allocation/explain

// Check index lifecycle status
GET /<index-name>/_ilm/explain

// Node disk usage
GET /_cat/allocation?v
```
