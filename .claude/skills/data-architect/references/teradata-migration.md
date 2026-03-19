# Teradata → BigQuery Migration — Reference

> Source: data-architect SKILL.md
> Teradata ID: 299 — tagged `ToDecommission`
> Query status: `node scripts/query-manifest.mjs tag ToDecommission`

---

## Context

Teradata is Groupon's primary data warehouse for financial systems, analytics, and reporting. Migration to BigQuery is the dominant data infrastructure initiative for 2026. All new pipelines must target BigQuery — new Teradata dependencies are blocked.

---

## What's Migrating

| System | Current | Target | Squad |
|--------|---------|--------|-------|
| Financial Data Engine (FDE) | Teradata | BigQuery | DnD Ingestion |
| Journal Ledger Accounting (JLA) | Teradata | BigQuery | DnD Ingestion |
| AdsOnGroupon reporting | Scala/Spark → Teradata | Keboola → BigQuery | DnD Tools |
| Megatron CDC pipelines | Teradata | BigQuery | DnD Ingestion |
| Tableau dashboards | Teradata | BigQuery | DnD Tools |

---

## Migration Phases

```
Phase 1 — Inventory
    - Catalog all Teradata tables, views, stored procedures, and jobs
    - Map downstream consumers (dashboards, reports, pipelines, services)
    - Classify: migrate, transform-and-migrate, or retire

Phase 2 — Schema Translation
    - Map Teradata DDL → BigQuery schema
    - Translate BTEQ/SQL to BigQuery SQL
    - Register target schemas in OpenMetadata before data loads

Phase 3 — Parallel Run (Shadow Mode)
    - Both Teradata and BigQuery populated from same source
    - Consumers validate BigQuery output against Teradata baseline
    - Run for minimum 2 weeks before cutover

Phase 4 — Cutover
    - Switch consumers to BigQuery
    - Keep Teradata read-only for rollback window (30 days minimum)
    - Monitor consumer errors actively

Phase 5 — Decommission
    - After rollback window: archive Teradata data to GCS
    - Drop Teradata tables (after sign-off from data owners)
    - Remove Teradata references from OpenMetadata
```

---

## Teradata → BigQuery Type Mapping

| Teradata Type | BigQuery Type | Notes |
|---------------|--------------|-------|
| `INTEGER` | `INT64` | Direct |
| `BIGINT` | `INT64` | Direct |
| `DECIMAL(p,s)` | `NUMERIC(p,s)` | Use BIGNUMERIC if p > 29 |
| `FLOAT` | `FLOAT64` | Direct |
| `CHAR(n)` | `STRING` | BigQuery has no fixed-length char |
| `VARCHAR(n)` | `STRING` | Direct |
| `DATE` | `DATE` | Direct |
| `TIMESTAMP` | `DATETIME` or `TIMESTAMP` | Use TIMESTAMP for UTC-aware |
| `TIME` | `TIME` | Direct |
| `BYTEINT` | `INT64` | BigQuery has no 1-byte int |
| `CLOB` | `STRING` | Max 10MB in BigQuery |
| `BLOB` | `BYTES` | Max 10MB in BigQuery |

---

## SQL Translation Patterns

### BTEQ → BigQuery SQL

```sql
-- Teradata: TOP N (non-standard)
SELECT TOP 100 * FROM orders ORDER BY created_at DESC;

-- BigQuery equivalent
SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;
```

```sql
-- Teradata: QUALIFY (window function filter)
SELECT deal_id, rank() OVER (PARTITION BY merchant_id ORDER BY revenue DESC) AS rnk
FROM deals
QUALIFY rnk = 1;

-- BigQuery: wrap in subquery (no QUALIFY support)
SELECT deal_id FROM (
  SELECT deal_id, rank() OVER (PARTITION BY merchant_id ORDER BY revenue DESC) AS rnk
  FROM deals
) WHERE rnk = 1;
```

```sql
-- Teradata: MINUS (set operation)
SELECT deal_id FROM deals_v1 MINUS SELECT deal_id FROM deals_v2;

-- BigQuery: EXCEPT DISTINCT
SELECT deal_id FROM deals_v1 EXCEPT DISTINCT SELECT deal_id FROM deals_v2;
```

```sql
-- Teradata: date arithmetic
SELECT deal_id FROM deals WHERE create_date (DATE) BETWEEN DATE '2026-01-01' AND DATE '2026-03-01';

-- BigQuery
SELECT deal_id FROM deals WHERE create_date BETWEEN DATE '2026-01-01' AND DATE '2026-03-01';
```

---

## Validation Approach

After Phase 3 (parallel run), validate before cutover:

```sql
-- Row count match
SELECT COUNT(*) FROM teradata_db.deals;       -- must match
SELECT COUNT(*) FROM `project.dataset.deals`; -- BigQuery

-- Aggregate match (financial tables — critical)
SELECT SUM(revenue), SUM(cost), SUM(gross_profit)
FROM teradata_db.financial_summary
WHERE report_date = '2026-03-01';

-- Compare with BigQuery output (should be within 0.01% for financial data)

-- Spot check: sample 100 rows with hash comparison
SELECT HASHROW(*) FROM teradata_db.deals SAMPLE 100;
-- Compare with equivalent BigQuery rows by primary key
```

**Acceptance criteria:**
- Row counts: exact match (or < 0.001% for in-flight write window)
- Financial aggregates: exact match
- Non-financial aggregates: < 0.01% variance

---

## OpenMetadata Registration (Required)

Every migrated dataset must be registered in OpenMetadata before consumers switch:

```
Dataset registration checklist:
- [ ] Owner squad assigned
- [ ] Source system documented (was Teradata, now BigQuery)
- [ ] Lineage traced: operational DB → CDC/Keboola → BigQuery
- [ ] PII fields tagged with classification
- [ ] Retention policy set
- [ ] Quality checks defined (freshness, completeness)
- [ ] Consumer list documented
```

---

## PII Handling During Migration

PII fields in Teradata must be identified before migration:

1. Tag PII fields in OpenMetadata source catalog
2. Apply column-level encryption or masking in BigQuery (column policies)
3. Validate that PII does not appear in unmasked form in intermediate staging tables
4. Confirm right-to-deletion implementation for customer records in BigQuery

---

## Common Migration Pitfalls

| Pitfall | Prevention |
|---------|-----------|
| Teradata implicit type casting | Explicit CAST() in all BigQuery SQL |
| BTEQ-specific macros | Rewrite as BigQuery procedures or Keboola transforms |
| Teradata user-defined functions (UDFs) | Rewrite as BigQuery UDFs in JavaScript or SQL |
| Partition mismatch | BigQuery partitions by DATE/TIMESTAMP column; Teradata uses PI; redesign if needed |
| Stored procedure logic | Migrate to Keboola transformations or Airflow DAGs |
| Session-level settings (FORMAT, DATE FORMAT) | Explicit in BigQuery — no session settings |
