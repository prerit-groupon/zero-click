# PostgreSQL Performance Diagnostics — Reference

> Source: postgres SKILL.md
> Context: Cloud SQL PostgreSQL on GCP — pg_stat_statements extension available

---

## Quick Triage Order

1. **Slow queries** → `pg_stat_statements` (avg > 100ms)
2. **Lock waits** → `pg_stat_activity` + `pg_blocking_pids`
3. **Dead tuple bloat** → `pg_stat_user_tables` (n_dead_tup > 1%)
4. **Unused indexes** → `pg_stat_user_indexes` (idx_scan = 0)
5. **XID wraparound** → `pg_database` age(datfrozenxid)

---

## Slow Query Analysis

```sql
-- Top 20 slowest queries by average execution time
-- Requires: pg_stat_statements extension (enabled on Cloud SQL by default)
SELECT
  LEFT(query, 100) AS query_snippet,
  calls,
  round((total_time / calls)::numeric, 2) AS avg_ms,
  round(total_time::numeric, 0) AS total_ms,
  rows / calls AS avg_rows,
  round((shared_blks_hit::float / nullif(shared_blks_hit + shared_blks_read, 0) * 100)::numeric, 1) AS cache_hit_pct
FROM pg_stat_statements
WHERE calls > 10
  AND total_time / calls > 100  -- over 100ms average
ORDER BY total_time DESC
LIMIT 20;
```

```sql
-- Reset stats (do this after fixing an issue to start fresh baseline)
SELECT pg_stat_statements_reset();
```

**What to look for:**
- `avg_ms > 1000` — needs investigation immediately
- `cache_hit_pct < 95%` — index miss or sequential scan, check EXPLAIN
- High `avg_rows` on SELECT — may be fetching more than needed

---

## EXPLAIN ANALYZE Patterns

```sql
-- Always use ANALYZE + BUFFERS for real production data
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM deals WHERE merchant_id = $1 AND active = true;
```

**Reading the output:**

| Output pattern | Meaning | Fix |
|---------------|---------|-----|
| `Seq Scan on deals` | Full table scan | Add index on WHERE columns |
| `Rows Removed by Filter: 50000` | Index used but very selective scan | Composite index on (merchant_id, active) |
| `Buffers: shared hit=0 read=5000` | Cache miss — reading from disk | Check shared_buffers, warming |
| `Sort (cost=... rows=50000)` | Large sort | Add index, or increase work_mem |
| `Hash Join` with large build side | Large join | Statistics stale? Run ANALYZE |

---

## Index Analysis

```sql
-- Unused indexes (safe to drop if idx_scan = 0 after the table has been running weeks)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND NOT indisprimary
ORDER BY pg_relation_size(indexrelid) DESC;
```

```sql
-- Index usage rate (catch rarely-used indexes)
SELECT
  indexrelname AS index,
  relname AS table,
  idx_scan,
  idx_tup_read,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE NOT indisprimary
ORDER BY idx_scan ASC
LIMIT 20;
```

```sql
-- Missing indexes — sequential scans on large tables
SELECT
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup,
  round(seq_scan::float / nullif(seq_scan + idx_scan, 0) * 100) AS seq_scan_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 10000   -- only care about large tables
  AND seq_scan > 100        -- only if scans are frequent
ORDER BY seq_tup_read DESC;
```

---

## Bloat and VACUUM Health

```sql
-- Dead tuple accumulation — tables needing manual VACUUM
SELECT
  relname,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

**Thresholds:**
- `dead_pct > 20%` — run `VACUUM ANALYZE <table>` immediately
- `dead_pct > 5%` on high-traffic tables — consider tuning `autovacuum_vacuum_scale_factor`
- `last_autovacuum IS NULL` on a large table — autovacuum may be blocked

```sql
-- Manual VACUUM (run after bulk deletes or when autovacuum can't keep up)
VACUUM (ANALYZE, VERBOSE) deals;

-- FULL VACUUM to reclaim disk space (requires exclusive lock — schedule during low traffic)
-- VACUUM FULL deals;  -- WARNING: full table lock; use only when disk space is critical
```

---

## Lock Wait Analysis

```sql
-- Current lock waits
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query,
  now() - blocked.query_start AS wait_duration
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;
```

```sql
-- Long-running queries (may be holding locks)
SELECT
  pid,
  now() - query_start AS duration,
  state,
  wait_event_type,
  wait_event,
  LEFT(query, 200) AS query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '30 seconds'
ORDER BY duration DESC;
```

**If a lock is blocking production:**
```sql
-- Terminate a specific query (safer than kill)
SELECT pg_terminate_backend(<blocking_pid>);
```

---

## XID Wraparound Risk

```sql
-- XID age — alert if xid_age > 1.5 billion (hard limit is ~2.1 billion)
SELECT
  datname,
  age(datfrozenxid) AS xid_age,
  2147483647 - age(datfrozenxid) AS xids_remaining
FROM pg_database
ORDER BY xid_age DESC;
```

**Alert thresholds:**
- `xid_age > 1,500,000,000` — immediate attention, run aggressive VACUUM
- `xid_age > 1,000,000,000` — schedule VACUUM FREEZE
- Cloud SQL will automatically initiate emergency autovacuum at 1.6 billion

```sql
-- Tables with oldest unfrozen XIDs
SELECT
  relname,
  age(relfrozenxid) AS xid_age
FROM pg_class
WHERE relkind = 'r'
ORDER BY age(relfrozenxid) DESC
LIMIT 10;
```

---

## Table and Index Sizes

```sql
-- Table sizes with index overhead
SELECT
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size,
  round(pg_indexes_size(relid)::float / nullif(pg_total_relation_size(relid), 0) * 100) AS index_pct
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

**If index_pct > 70%:** too many indexes on this table. Check which are used.

---

## Replication Lag

```sql
-- Check replication lag on read replicas
SELECT
  client_addr,
  state,
  sent_lsn,
  replay_lsn,
  (sent_lsn - replay_lsn) AS lag_bytes,
  pg_size_pretty(sent_lsn - replay_lsn) AS lag_readable
FROM pg_stat_replication;
```

**Alert threshold:** lag_bytes > 16MB (replica is more than ~1 second behind on typical OLTP).
