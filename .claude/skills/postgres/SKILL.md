---
name: postgres
description: PostgreSQL expert for Groupon's Encore platform — schema design, query optimisation, indexing, MVCC/VACUUM, WAL, connection pooling, Cloud SQL configuration, Drizzle ORM patterns, and MySQL-to-PostgreSQL migration from Continuum. Use this skill for any Postgres work on Encore services, including schema migrations, performance tuning, and backup/recovery planning on GCP Cloud SQL.
---

# PostgreSQL for Groupon Encore

## Groupon Context

Groupon's Encore platform runs PostgreSQL exclusively. Key facts:

- **22 of 23 OwnsDB-tagged containers** in the architecture model use PostgreSQL
- Each Encore service owns **one dedicated Cloud SQL (PostgreSQL) instance** — no shared databases
- **Drizzle ORM** is the standard for TypeScript Encore services
- **Cloud SQL** on GCP us-central1 / europe-west1 with private IP — not self-hosted
- Encore uses **Direct VPC Egress** on Cloud Run; services connect to Cloud SQL via private IP
- The ongoing migration is **Continuum MySQL → Encore PostgreSQL** — each migrated service owns fresh PostgreSQL data
- Continuum still runs MySQL shared clusters — do not replicate that pattern in Encore

## When to Use This Skill

- Writing or reviewing Encore service database schemas
- Drizzle ORM migration files, query patterns, type definitions
- Cloud SQL performance troubleshooting (slow queries, connection exhaustion, bloat)
- Designing the PostgreSQL side of a Continuum-to-Encore migration
- VACUUM, index, or WAL configuration on Cloud SQL
- Backup/PITR strategy for Cloud SQL instances

## When NOT to Use This Skill

| Situation | Use Instead |
|-----------|-------------|
| Continuum MySQL schemas or MySQL-specific tuning | `/platform-architect` — MySQL on Continuum is a migration target, not an active design space |
| BigQuery datasets, analytics schemas, data warehouse design | `/data-architect` |
| Kafka/Pub/Sub event schema design | `/data-architect` or `/platform-architect` |
| Grafana/metrics database queries (PromQL, Thanos) | `/observability` |
| Deciding whether a new service *should* have a database | `/platform-architect` — data ownership is an architectural question before it is a Postgres question |

## Service-Owns-Database Pattern

Every Encore service with state gets its own Cloud SQL instance. The reason: Continuum's shared MySQL is the largest source of coupling in the current architecture. Encore enforces the opposite.

```
Encore Service A  -->  Cloud SQL (postgres-service-a)
Encore Service B  -->  Cloud SQL (postgres-service-b)
          ↑ Never share. Never cross-query. Expose data via API or Encore Topic.
```

If another service needs data owned by Service A, it calls Service A's API — it does not read Service A's database.

## Drizzle ORM (Groupon Standard)

Encore TypeScript services use Drizzle ORM. Key patterns:

```typescript
// Schema definition (drizzle/schema.ts)
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  merchantId: uuid('merchant_id').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Index definitions alongside schema
export const dealIndexes = {
  merchantIdx: index('deals_merchant_id_idx').on(deals.merchantId),
  activeIdx: index('deals_active_idx').on(deals.active),
};
```

```typescript
// Migration (drizzle/migrations/XXXX_<name>.sql — auto-generated)
// Run via: npx drizzle-kit generate:pg && npx drizzle-kit push:pg
```

```typescript
// Query patterns
import { db } from '../db';
import { deals } from './schema';
import { eq, and } from 'drizzle-orm';

// Single record lookup
const deal = await db.query.deals.findFirst({
  where: eq(deals.id, dealId),
});

// Filtered list with pagination
const activeDealsByMerchant = await db
  .select()
  .from(deals)
  .where(and(eq(deals.merchantId, merchantId), eq(deals.active, true)))
  .limit(50)
  .offset(page * 50);
```

## Cloud SQL Configuration (GCP)

### Connection Management

Encore Cloud Run services connect to Cloud SQL via **private IP** (Direct VPC Egress). Do not use Cloud SQL Auth Proxy in production — private IP is simpler and lower latency.

Connection pool sizing for Cloud Run:
```typescript
// db.ts — Drizzle + node-postgres pool
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // private IP Cloud SQL
  max: 10,          // Cloud Run instances × max = total connections; size carefully
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);
```

Cloud SQL max_connections defaults (adjust in flags):
- db-f1-micro: 25
- db-g1-small: 100
- db-n1-standard-1: 250

Keep total connections = (Cloud Run max instances) × (pool max) well below max_connections.

### Cloud SQL Flags Worth Reviewing

```
max_connections           = size based on instance tier
shared_buffers            = 25% of RAM (Cloud SQL manages this)
work_mem                  = 4MB default; increase for complex sorts/joins
autovacuum_vacuum_scale_factor = 0.02  (more aggressive than 0.2 default for busy tables)
log_min_duration_statement = 1000     (log queries > 1s for slow query analysis)
```

### Backups (Cloud SQL)

Cloud SQL automated backups are enabled by default. For Encore services, also set:
- **PITR** (point-in-time recovery): enabled for all production instances
- Retention: 7 days automated backups minimum, 7 days transaction log
- Multi-region for production: us-central1 primary, europe-west1 read replica (for EMEA services)

## Schema Design for Encore Services

1. Use `uuid` primary keys — not serial/bigserial. Reasons: no coordination across services, safer for event-driven patterns, portable across migrations
2. Always add `created_at` and `updated_at` timestamps
3. Normalise to 3NF. Denormalise only when query performance forces it and document the trade-off
4. Index every foreign key column that appears in WHERE clauses
5. Name indexes explicitly: `<table>_<column>_idx`
6. Use `NOT NULL` unless the absence of a value is semantically meaningful (avoid nullable strings)
7. Prefer `text` over `varchar(N)` — PostgreSQL stores them the same way but `text` is simpler

## MySQL to PostgreSQL Migration (Continuum → Encore)

When migrating a Continuum service to Encore, the data store changes from shared MySQL to service-owned PostgreSQL.

### Migration Checklist

```
1. Map MySQL schema → PostgreSQL schema
   - AUTO_INCREMENT → uuid + defaultRandom() or identity
   - TINYINT(1) → boolean
   - DATETIME → timestamptz (always use timezone-aware)
   - TEXT/BLOB → text / bytea
   - JSON column → jsonb (not json)
   - ENUM → text with check constraint or separate lookup table

2. Write Drizzle schema from the PostgreSQL design
3. Export data from MySQL, transform, load to PostgreSQL (use Cloud SQL migration service or custom ETL via Keboola)
4. Run in parallel write mode (dual-write to both) during cutover window
5. Validate record counts and key field checksums
6. Cut over reads to PostgreSQL
7. Stop MySQL writes after validation window
8. Decommission MySQL tables (do not rush — confirm no consumers remain)
```

### Common MySQL → PostgreSQL Gotchas

| MySQL | PostgreSQL | Note |
|-------|------------|------|
| `LIMIT 10,20` | `LIMIT 10 OFFSET 20` | Different syntax |
| Case-insensitive string comparison by default | Case-sensitive by default | Use `ILIKE` or `lower()` |
| `NOW()` returns local time | `now()` returns UTC | Always use `timestamptz` |
| `GROUP BY` allows non-aggregate columns | Strict GROUP BY | Must list all non-aggregate columns |
| `REPLACE INTO` | `INSERT ... ON CONFLICT DO UPDATE` | Different upsert syntax |

## Performance Diagnostics

```sql
-- Slow queries (last 24h — requires pg_stat_statements)
SELECT query, calls, total_time / calls AS avg_ms, rows / calls AS avg_rows
FROM pg_stat_statements
WHERE total_time / calls > 100   -- over 100ms average
ORDER BY total_time DESC
LIMIT 20;

-- Unused indexes (safe to drop if idx_scan = 0 and table has been running a while)
SELECT schemaname, tablename, indexname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND NOT indisprimary
ORDER BY pg_relation_size(indexrelid) DESC;

-- Dead tuple accumulation (autovacuum health)
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
       last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Long-running queries
SELECT pid, now() - query_start AS duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
AND now() - query_start > interval '30 seconds'
ORDER BY duration DESC;

-- Lock waits
SELECT blocked.pid, blocked.query, blocking.pid AS blocking_pid, blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;

-- Table sizes
SELECT relname AS table,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid)) AS data,
       pg_size_pretty(pg_indexes_size(relid)) AS indexes
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

## VACUUM and Maintenance

```sql
-- XID wraparound risk (alert if xid_age > 1.5 billion)
SELECT datname, age(datfrozenxid) AS xid_age,
       2147483647 - age(datfrozenxid) AS xids_remaining
FROM pg_database
ORDER BY xid_age DESC;
```

On Cloud SQL: `VACUUM ANALYZE` is managed by autovacuum. Manually trigger if needed after bulk deletes:
```sql
VACUUM (ANALYZE, VERBOSE) <table_name>;
```

## Replication (Cloud SQL)

```sql
-- Check replication lag on read replicas
SELECT client_addr, state, sent_lsn, replay_lsn,
       (sent_lsn - replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

For Encore services serving EMEA traffic: create a Cloud SQL read replica in europe-west1 and route read queries there to reduce latency.