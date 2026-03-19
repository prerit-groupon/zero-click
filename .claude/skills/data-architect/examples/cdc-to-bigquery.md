# Example: CDC Pipeline — Continuum MySQL → BigQuery

> Scenario: Stream `deals` table changes from Continuum MySQL to BigQuery for analytics.
> Uses Megatron (Groupon's CDC wrapper over GCP Datastream).

---

## Step 1 — Assess the Source

```bash
node context/scripts/query-manifest.mjs search "deals"
```

**Findings:**
- `continuum-commerce` owns `deals` table in MySQL
- Table has ~50M rows, ~200k updates/day
- PII fields: `merchant_id` (internal ID, not PII), `description` (may contain merchant info)
- No existing BigQuery table for deals

---

## Step 2 — Architecture Decision

| Question | Answer |
|---------|--------|
| Source system | Continuum MySQL (`commerce` database) |
| Ingestion method | CDC via Megatron/Datastream (real-time, ~5 min lag) |
| Destination | BigQuery `grp-data-prod.continuum_raw.deals` |
| PII? | No direct PII. `description` field excluded as precaution. |
| Downstream consumers | Looker deals dashboard, Keboola deal analytics pipeline |

---

## Step 3 — Schema Design

```json
{
  "schema_name": "continuum_deals_cdc",
  "schema_version": "1",
  "fields": [
    { "name": "id", "type": "INTEGER", "mode": "REQUIRED" },
    { "name": "title", "type": "STRING", "mode": "NULLABLE" },
    { "name": "status", "type": "STRING", "mode": "NULLABLE" },
    { "name": "merchant_id", "type": "INTEGER", "mode": "NULLABLE" },
    { "name": "price", "type": "DECIMAL", "mode": "NULLABLE" },
    { "name": "start_date", "type": "TIMESTAMP", "mode": "NULLABLE" },
    { "name": "end_date", "type": "TIMESTAMP", "mode": "NULLABLE" },
    { "name": "created_at", "type": "TIMESTAMP", "mode": "REQUIRED" },
    { "name": "updated_at", "type": "TIMESTAMP", "mode": "REQUIRED" },
    { "name": "_datastream_metadata", "type": "RECORD", "mode": "NULLABLE",
      "fields": [
        { "name": "uuid", "type": "STRING" },
        { "name": "source_timestamp", "type": "INTEGER" },
        { "name": "is_deleted", "type": "BOOLEAN" }
      ]
    },
    { "name": "ingested_at", "type": "TIMESTAMP", "mode": "REQUIRED" }
  ]
}
```

**Note:** `description` excluded (merchant-authored text, treat as potential PII until reviewed).

---

## Step 4 — Megatron Configuration

Megatron config (in `megatron-configs/deals-cdc.yaml`):

```yaml
source:
  type: mysql
  database: commerce
  table: deals
  connection: continuum-mysql-read-replica

destination:
  type: bigquery
  project: grp-data-prod
  dataset: continuum_raw
  table: deals

cdc:
  replication_slot: deals_cdc_slot
  include_columns:
    - id, title, status, merchant_id, price, start_date, end_date, created_at, updated_at
  # description excluded — pending PII review

freshness_sla_minutes: 15
```

---

## Step 5 — Downstream View (Deduplicated)

Raw CDC tables contain duplicates (multiple events per row). Create a view for consumers:

```sql
-- View: grp-data-prod.continuum_analytics.deals_latest
CREATE OR REPLACE VIEW `grp-data-prod.continuum_analytics.deals_latest` AS
SELECT * EXCEPT(row_num)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY id
      ORDER BY updated_at DESC, ingested_at DESC
    ) AS row_num
  FROM `grp-data-prod.continuum_raw.deals`
  WHERE _datastream_metadata.is_deleted IS FALSE
    OR _datastream_metadata.is_deleted IS NULL
)
WHERE row_num = 1;
```

---

## Step 6 — Monitoring

- Lag alert: if `MAX(ingested_at) < NOW() - INTERVAL 30 MINUTE` → PagerDuty data-platform
- Row count alert: if today's count < 80% of 7-day average → Slack #data-alerts
- Schema mismatch: Datastream job will fail — check GCP Console > Datastream > Jobs

---

## Output Files

```
megatron-configs/
└── deals-cdc.yaml                    ← Megatron source config

plans/
└── deals-cdc-schema-contract.md      ← Schema contract for consumers
```

Consumers notified: Looker (deals dashboard), Keboola (deal analytics pipeline).
