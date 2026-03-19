---
description: "MOC for Logging domain. Covers ELK stack (Elasticsearch, Logstash, Kibana), Filebeat, Kafka, ECK operator. Start here when the task involves log ingestion, search, alerting on logs, or logging infrastructure."
domain: logging
repos: ["eck-infra-main", "eck-operator-main", "eck-pipeline-automation-main", "es-index-creation-main", "es-template-checker-main", "grpn-filebeat-main", "logging-elasticstack-eck-roles", "logging-gcp-terrabase-main", "logging-searches-master", "watch-execution-main"]
---

# Logging — Map of Content

## What We Own

The centralized logging platform at Groupon, built on the Elastic stack (ELK).

**Stack**: Filebeat → Kafka → Logstash → Elasticsearch → Kibana

**Infrastructure**: ECK (Elastic Cloud on Kubernetes) operator manages Elasticsearch clusters on GKE.

## Architecture

The log flow:
1. **Filebeat** agents run on each host/pod, ship logs to **Kafka**
2. **Kafka** queues logs for buffering and reliability
3. **Logstash** consumes from Kafka, applies parsing (grok filters), transforms logs
4. **Elasticsearch** indexes and stores logs with configurable retention
5. **Kibana** provides search, visualization, dashboards, and alerting

Infrastructure managed via:
- **ECK Operator** on GKE for Elasticsearch cluster lifecycle
- **Terraform** (logging-gcp-terrabase) for GCP resources
- **FluxCD** for GitOps-driven deployments

See: [[architecture/logging]] for detailed diagrams.

## Runbooks

- [[runbooks/elk-alerts]] — ELK alert remediation: index lag, parsing errors, ingestion bottlenecks
- [[runbooks/elk-troubleshooting]] — General troubleshooting framework for the full pipeline
- [[runbooks/disk-iops]] — GCP disk IOPS scaling (shared with monitoring)

## Gotchas

See [[gotchas/logging]] for known failure patterns. Key ones:
- Index lag is almost always a Logstash parsing issue, not an Elasticsearch capacity issue — check grok filters first
- Kafka consumer lag ≠ data loss. Logs are buffered. But sustained lag means Logstash can't keep up
- ECK operator upgrades require careful CRD versioning — never skip major versions
- Elasticsearch shard allocation failures often caused by disk watermarks, not node failures

## Codebases

| Repo | Purpose |
|------|---------|
| `eck-infra-main` | ECK infrastructure (Elasticsearch on Kubernetes) |
| `eck-operator-main` | ECK operator deployment and configuration |
| `eck-pipeline-automation-main` | Automated pipeline management for ECK |
| `es-index-creation-main` | Elasticsearch index lifecycle management |
| `es-template-checker-main` | Validates Elasticsearch index templates |
| `grpn-filebeat-main` | Groupon's Filebeat configuration and deployment |
| `logging-elasticstack-eck-roles` | IAM roles for ECK stack |
| `logging-gcp-terrabase-main` | Terraform for logging GCP infrastructure |
| `logging-searches-master` | Saved Kibana searches and dashboards |
| `watch-execution-main` | Elasticsearch watcher execution management |

All source in: `codebases/logging/`

## Key Links

- Kibana: https://prod-kibana-unified.us-central1.logging.prod.gcp.groupondev.com/
- Access: grp_all_Okta_SplunkProd_User AD group (read-only). Request: helpdesk@groupon.com
- GitHub Org: https://github.groupondev.com/orgs/logging/repositories
- ELK Docs: pages.github.groupondev.com/steno
