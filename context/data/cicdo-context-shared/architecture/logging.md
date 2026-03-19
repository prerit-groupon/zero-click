---
description: "Logging architecture overview. Log pipeline from Filebeat to Kibana."
domain: logging
---

# Logging Architecture

## Pipeline Flow

```
Applications/Hosts
    │
    ▼
Filebeat Agents (per host/pod)
    │ ship logs
    ▼
Kafka (buffering & reliability)
    │
    ▼
Logstash (parsing, grok filters, transformation)
    │
    ▼
Elasticsearch (indexing, storage, search)
    │ managed by ECK Operator on GKE
    ▼
Kibana (search, visualization, dashboards, alerting)
```

## Infrastructure

- **ECK Operator**: Manages Elasticsearch clusters on GKE (lifecycle, scaling, upgrades)
- **GKE**: All components run on Google Kubernetes Engine
- **Terraform**: logging-gcp-terrabase for GCP resource management
- **Index lifecycle**: Managed via es-index-creation, template validation via es-template-checker
- **Watcher**: Elasticsearch watcher for automated responses (watch-execution)

## Endpoints

| Region | Kibana Endpoint |
|--------|----------------|
| US | logging-prod-us-unified1 |
| EU | logging-prod-eu-unified1 |
| Unified | https://prod-kibana-unified.us-central1.logging.prod.gcp.groupondev.com/ |

## Detailed Architecture Diagrams

See: `Important Links/Architecture Diagrams - CICDO.docx` for visual diagrams.
