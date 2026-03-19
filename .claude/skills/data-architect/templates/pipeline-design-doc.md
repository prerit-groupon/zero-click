# Pipeline Design: [Pipeline Name]

> **Status:** Draft | In Review | Approved
> **Author:** [name]
> **Date:** YYYY-MM-DD
> **Team:** Data Platform / DnD
> **Type:** CDC | Batch ETL | Stream Processing | API Ingestion

---

## Purpose

<!-- What data is being moved, from where to where, and why?
     What business question does this pipeline answer? -->

---

## Source System

| Property | Value |
|---------|-------|
| System | Continuum MySQL / Kafka / External API / GCS |
| Database / Topic | [name] |
| Table / Event | [name] |
| Owner | [team] |
| Change frequency | Real-time / Hourly / Daily |
| Volume | ~N rows/events per day |
| PII fields | [list or "none"] |

---

## Destination

| Property | Value |
|---------|-------|
| System | BigQuery / GCS / Kafka / Keboola |
| Dataset / Topic | [name] |
| Table / Schema | [name] |
| Retention | [duration] |
| Partitioning | [column] |
| Clustering | [columns] |

---

## Architecture Diagram

```
[Source] → [Ingestion] → [Processing] → [Destination] → [Consumers]
  MySQL       Megatron     Kafka            BigQuery       Looker
  CDC         Datastream   (optional)       table          Keboola
```

---

## Ingestion Method

**CDC via Megatron/Datastream:**
- Replication slot: `[slot_name]`
- Tables: `[table_list]`
- Latency SLA: <N minutes

**Batch via Keboola:**
- Schedule: `0 */6 * * *` (every 6 hours)
- Extractor: [extractor name]
- Incremental: Yes (on `updated_at`) / No (full load)

**Stream via Kafka:**
- Topic: `[topic.name.v1]`
- Consumer group: `[name]`
- Starting offset: earliest / latest

---

## Transformation Logic

```sql
-- Core transformation query (run in BigQuery)
SELECT
  id,
  -- PII fields: hash or exclude
  SHA256(email) AS email_hash,
  status,
  created_at,
  CURRENT_TIMESTAMP() AS ingested_at
FROM `source_dataset.source_table`
WHERE DATE(updated_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
```

---

## Schema Contract

```json
{
  "schema_version": "1",
  "fields": [
    { "name": "id", "type": "STRING", "mode": "REQUIRED" },
    { "name": "status", "type": "STRING", "mode": "NULLABLE" },
    { "name": "created_at", "type": "TIMESTAMP", "mode": "REQUIRED" },
    { "name": "ingested_at", "type": "TIMESTAMP", "mode": "REQUIRED" }
  ]
}
```

Schema changes require:
1. Bump `schema_version`
2. Notify all downstream consumers (list below)
3. Coordinate cutover date

---

## PII Handling

| Field | Classification | Handling |
|-------|--------------|---------|
| email | PII — email | Hashed with SHA-256, raw value not stored |
| name | PII — name | Excluded from pipeline |
| amount | Non-PII | Passed through |

GDPR right-to-erasure: [handled by X process / not applicable]

---

## Freshness SLA

| Environment | Lag target | Alert threshold |
|-------------|-----------|-----------------|
| Production | < 15 min | > 30 min |
| Staging | < 1 hour | > 2 hours |

---

## Data Quality Checks

- [ ] Row count matches source (±2%)
- [ ] No null values in required fields
- [ ] Date range coverage complete
- [ ] Deduplication applied on `id + ingested_at`

---

## Downstream Consumers

| Consumer | System | Contact |
|---------|--------|---------|
| [report name] | Looker | [team] |
| [pipeline name] | Keboola | [team] |

**Schema change notification:** contact all consumers before any schema change.

---

## Monitoring & Alerting

- Lag alert: > 30 min → PagerDuty [team]
- Row count anomaly: > 20% deviation vs 7-day avg → Slack #data-alerts
- Null rate > 5% on required fields → Slack #data-alerts

---

## Runbook

**Pipeline stalled:**
1. Check Megatron/Datastream lag in GCP Console
2. Check Kafka consumer group lag: `kafka-consumer-groups.sh --describe --group [name]`
3. Check BigQuery load job history: `bq ls -j --all`

**Schema mismatch:**
1. Pause pipeline
2. Review schema diff
3. Update destination schema or transformation query
4. Resume pipeline
