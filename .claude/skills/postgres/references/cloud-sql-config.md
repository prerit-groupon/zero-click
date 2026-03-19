# Cloud SQL Configuration — Groupon Encore Reference

> Source: postgres SKILL.md
> Context: All Encore services connect to Cloud SQL via private IP (Direct VPC Egress)

---

## Instance Sizing Guide

### Max Connections by Tier

| Tier | vCPU | RAM | Default max_connections |
|------|------|-----|------------------------|
| db-f1-micro | shared | 0.6 GB | 25 |
| db-g1-small | shared | 1.7 GB | 100 |
| db-n1-standard-1 | 1 | 3.75 GB | 250 |
| db-n1-standard-2 | 2 | 7.5 GB | 500 |
| db-n1-standard-4 | 4 | 15 GB | 1000 |
| db-n1-standard-8 | 8 | 30 GB | 2000 |

### Connection Pool Sizing Formula

```
max_connections limit = (Cloud Run max_instances) × (pool.max per instance)

Example:
  Cloud Run max_instances = 50
  pool.max = 10
  Total connections = 500 → need db-n1-standard-2 or larger
```

**Rule of thumb:** Keep total connections to 80% of `max_connections` to leave headroom for admin connections and migrations.

---

## TypeScript Connection Config (Drizzle + node-postgres)

```typescript
// src/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // private IP Cloud SQL
  max: 10,                    // per Cloud Run instance
  min: 2,                     // keep warm connections
  idleTimeoutMillis: 30000,   // 30s idle before release
  connectionTimeoutMillis: 5000, // fail fast if pool exhausted
});

// Graceful shutdown
process.on('SIGTERM', () => pool.end());

export const db = drizzle(pool);
```

**`DATABASE_URL` format for Cloud SQL private IP:**
```
postgresql://user:password@10.x.x.x:5432/dbname
```

Not: `//cloudsql/project:region:instance` (that is Cloud SQL Auth Proxy format, not used in production).

---

## Cloud SQL Flags (Recommended)

Set these via Cloud Console or Terraform for production instances:

```
# Connection
max_connections                    = <sized per tier — do not use default>

# Memory
shared_buffers                     = managed by Cloud SQL (25% RAM)
work_mem                           = 4MB default; increase to 16MB for heavy sort/join workloads
effective_cache_size               = 75% of RAM (Cloud SQL manages this)

# Autovacuum (more aggressive than defaults for busy OLTP tables)
autovacuum_vacuum_scale_factor     = 0.02   (vs default 0.2)
autovacuum_analyze_scale_factor    = 0.01   (vs default 0.1)
autovacuum_vacuum_cost_delay       = 2ms    (vs default 20ms)

# Logging (required for slow query analysis)
log_min_duration_statement         = 1000   (log queries > 1 second)
log_temp_files                     = 0      (log all temp file creation)
log_checkpoints                    = on
log_lock_waits                     = on

# WAL
wal_level                          = logical   (required for logical replication / CDC)
```

---

## Backup and PITR Configuration

Minimum configuration for all production instances:

```
Automated backups:
  - Enabled: yes
  - Start time: 02:00 UTC (low traffic window)
  - Retention: 7 days

Point-in-time recovery (PITR):
  - Enabled: yes (requires wal_level = logical)
  - Transaction log retention: 7 days

Multi-region read replica (for EMEA-serving services):
  - Primary: us-central1
  - Read replica: europe-west1
  - Route read queries from EMEA instances to replica
```

---

## Network Configuration

All Encore services use **Direct VPC Egress** — no Cloud SQL Auth Proxy:

```yaml
# Cloud Run service configuration
vpc_access:
  connector: projects/<project>/locations/us-central1/connectors/<connector>
  egress: all-traffic    # Direct VPC Egress

# Environment variable (GCP Secret Manager)
DATABASE_URL: "postgresql://user:password@<private-ip>:5432/<dbname>"
```

**Never use:**
- Cloud SQL Auth Proxy in production (adds latency, complexity)
- Public IP addresses for Cloud SQL instances
- Hardcoded credentials in code (use GCP Secret Manager)

---

## Read Replica Routing (EMEA)

For services with EMEA traffic, route read queries to the europe-west1 replica:

```typescript
// db.ts — separate pool for read replicas
const writePool = new Pool({
  connectionString: process.env.DATABASE_URL,  // primary (us-central1)
  max: 10,
});

const readPool = new Pool({
  connectionString: process.env.DATABASE_URL_REPLICA, // replica (europe-west1)
  max: 10,
});

export const db = drizzle(writePool);
export const readDb = drizzle(readPool);
```

```typescript
// Use readDb for queries that don't need strong consistency
const deals = await readDb.select().from(deals).where(eq(deals.merchantId, id));

// Use db (primary) for writes and reads that need fresh data
await db.insert(deals).values(newDeal);
```

---

## Terraform Snippet (Reference)

```hcl
resource "google_sql_database_instance" "service_db" {
  name             = "postgres-encore-<service-name>"
  database_version = "POSTGRES_15"
  region           = "us-central1"

  settings {
    tier = "db-n1-standard-2"

    backup_configuration {
      enabled            = true
      start_time         = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }

    database_flags {
      name  = "max_connections"
      value = "500"
    }
    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }
    database_flags {
      name  = "autovacuum_vacuum_scale_factor"
      value = "0.02"
    }
  }
}
```
