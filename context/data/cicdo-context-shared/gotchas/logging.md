---
description: "Known failure patterns for Logging domain (ELK, Filebeat, Kafka, ECK). Update this every time you discover a new gotcha."
domain: logging
---

# Logging Gotchas

## Elasticsearch

- **Index lag is usually Logstash, not ES**: When index lag alerts fire, check Logstash grok filter errors first before scaling ES.
- **Disk watermarks**: ES stops allocating shards when disk hits 85% (low watermark) and makes indices read-only at 95% (flood). Clear old indices or expand storage.
- **Shard count**: Too many small shards is worse than too few large ones. Target 20-40GB per shard.
- **ECK operator upgrades**: Never skip major CRD versions. Always upgrade sequentially (e.g., 2.8 → 2.9 → 2.10, not 2.8 → 2.10).

## Logstash

- **Grok filter failures**: Bad grok patterns cause `_grokparsefailure` tags. These logs get indexed but with wrong field structure. Check for pattern mismatches.
- **Batch size vs. memory**: Increasing Logstash batch size improves throughput but requires proportionally more heap. Watch for OOM.

## Kafka

- **Consumer lag ≠ data loss**: Kafka buffers logs. Sustained lag means Logstash can't keep up, but data is not lost until retention expires.
- **Topic partition count**: Changing partition count requires consumer group rebalancing. Plan for brief disruption.

## Filebeat

- **Registry file corruption**: If Filebeat's registry file corrupts, it re-sends all logs. Can cause massive ingestion spike. Monitor for sudden volume increases.
