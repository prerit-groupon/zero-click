---
description: "General ELK troubleshooting framework for the full pipeline."
domain: logging
---

# ELK Stack General Troubleshooting

## Approach: Identify the Bottleneck

### Stage 1: Filebeat — Are agents running? Can they reach Kafka?
### Stage 2: Kafka — Topic receiving messages? Consumer lag? Brokers healthy?
### Stage 3: Logstash — Consuming from Kafka? Parsing errors (grok)? Check pipeline stats.
### Stage 4: Elasticsearch — All nodes in cluster? Shard allocation? Disk watermarks? Index health?
### Stage 5: Kibana — Connected to ES? Index patterns configured? Time range filters correct?

## Authentication
Use `kubectl cloud-elevator auth` for cluster access. Port forward services for local debugging.
