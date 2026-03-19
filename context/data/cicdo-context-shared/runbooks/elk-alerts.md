---
description: "Runbook for ELK stack alerts. Covers index lag, parsing errors, ingestion bottlenecks, Kafka queue backup."
domain: logging
---

# ELK Stack Alerts Runbook

## Alert: Index Lag

**Symptom**: Logs appearing late in Kibana. Index lag alert fired.

**Diagnosis**:
1. Identify bottleneck: Filebeat → Kafka → Logstash → Elasticsearch → Kibana
2. Check Elasticsearch indices in Kibana for shard allocation and disk usage
3. Check Kafka consumer lag metrics
4. Review Logstash grok filter errors

**Resolution**:
- Logstash parsing errors: fix grok filter patterns
- Kafka lag: adjust Logstash batch sizes and thread counts
- ES cluster issues: check shard allocation, disk watermarks, node capacity
- High volume: scale Logstash workers or Elasticsearch nodes

## Alert: Service Component Failure

**Symptom**: One or more ELK components unreachable.

**Diagnosis**: Verify all services running. Use `kubectl cloud-elevator auth`. Check pod logs: `kubectl describe pod <name>`. Port forward for debugging.
