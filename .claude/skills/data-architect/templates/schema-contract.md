# Schema Contract: [schema-name]

> **Version:** 1
> **Status:** Draft | Active | Deprecated
> **Owner:** [team / service]
> **Date:** YYYY-MM-DD
> **Change policy:** Additive changes only (new nullable fields). Breaking changes require new schema version.

---

## Overview

<!-- What data does this schema describe? Where does it come from? Where is it consumed? -->

---

## Schema Definition

### BigQuery / Analytical Schema

```json
{
  "schema_name": "[schema-name]",
  "schema_version": "1",
  "fields": [
    {
      "name": "id",
      "type": "STRING",
      "mode": "REQUIRED",
      "description": "Unique identifier (UUID v4 from source system)"
    },
    {
      "name": "status",
      "type": "STRING",
      "mode": "NULLABLE",
      "description": "Current status: active | inactive | deleted"
    },
    {
      "name": "created_at",
      "type": "TIMESTAMP",
      "mode": "REQUIRED",
      "description": "Creation timestamp in source system (UTC)"
    },
    {
      "name": "ingested_at",
      "type": "TIMESTAMP",
      "mode": "REQUIRED",
      "description": "Pipeline ingestion timestamp (UTC)"
    }
  ]
}
```

### Kafka Event Schema (if applicable)

```typescript
interface [SchemaName]Event {
  eventType: '[EventName]';
  schemaVersion: '1';
  id: string;             // UUID v4
  status: string;
  createdAt: string;      // ISO 8601 UTC
  _metadata: {
    sourceService: string;
    producedAt: string;   // ISO 8601 UTC
  };
}
```

---

## PII Classification

| Field | PII Type | Handling |
|-------|---------|---------|
| email | Email address | SHA-256 hash — raw value not stored in BigQuery |
| name | Personal name | Excluded |
| id | Non-PII | Passed through |

GDPR erasure: [describe erasure mechanism or state "not applicable"]

---

## Partitioning & Clustering (BigQuery)

- **Partition by:** `DATE(created_at)` — daily
- **Cluster by:** `status, [field]`
- **Partition expiry:** [N days / never]

---

## Change History

| Version | Date | Change | Breaking? | Migration |
|---------|------|--------|----------|---------|
| 1 | YYYY-MM-DD | Initial schema | — | — |

---

## Consumers

All consumers must be notified before breaking changes. For additive changes (new nullable fields), notify but do not require migration.

| Consumer | System | Contact | Migration required for v2? |
|---------|--------|---------|--------------------------|
| [report] | Looker | [team] | — |
| [pipeline] | Keboola | [team] | — |

---

## Validation Rules

- `id` must match UUID v4 pattern
- `status` must be one of: `active`, `inactive`, `deleted`
- `created_at` must be in the past
- Row-level deduplication key: `(id, DATE(ingested_at))`
