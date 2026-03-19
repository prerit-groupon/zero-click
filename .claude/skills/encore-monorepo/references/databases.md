# Databases & Data Stores

## Database Topology

Three distinct database backends serve different parts of the architecture:

### 1. Encore-Managed PostgreSQL (TS/Go services)
- **Pattern**: Database-per-service — each of the 78 TS services and 2 Go services gets its own isolated PostgreSQL database
- **ORM**: Drizzle ORM (TypeScript), standard Go database/sql (Go)
- **Migrations**: Drizzle Kit manages schema migrations per service
- **Provisioning**: Fully automatic via Encore Cloud — developers declare database needs in code, Encore provisions and manages the instances
- **Backups**: Managed by Encore Cloud (details abstracted)

### 2. GCP Cloud SQL (Python services — Crossplane-managed)
- **Instance**: `merchant-quality-postgres`
- **Version**: PostgreSQL 15
- **Tier**: `db-g1-small` — 1 shared vCPU, 0.6 GB RAM
- **Storage**: 20GB SSD, auto-resize to 100GB
- **Region**: `us-central1`
- **Network**: Private IP only on `vpc-stable-sharedvpc01`
- **Connection**: via private DNS `merchant-quality-db.gds.stable.gcp.groupondev.com`
- **Provisioned by**: Crossplane (only IaC-managed resource in entire repo)
- **Config files**: `apps/microservices-python/aiaas-merchant-quality/crossplane/`

**CRITICAL RISKS:**
- `deletion_protection: false` — production database can be accidentally deleted
- Max connections for db-g1-small is ~25, but 16 Python services with max=3 pool each = 48 theoretical connections (92% over limit)

### 3. DigitalOcean Managed PostgreSQL (some Python services)
- **Port**: 25060 (DO standard)
- **SSL**: Required
- **Connection**: Standard PostgreSQL connection strings
- **Used by**: Some Python services that haven't migrated to Cloud SQL

## Python Connection Pooling

**File**: `apps/microservices-python/common/postgres.py`
- Uses `psycopg2.pool.ThreadedConnectionPool`
- Config: `minconn=0, maxconn=3` per service
- Lazy initialization (pool created on first use)
- No connection timeout configured
- No retry logic on pool exhaustion
- 16 services × 3 max connections = 48 theoretical connections

## Drizzle ORM (TypeScript)

Used across all 78 TS services for:
- Schema definition (TypeScript-native)
- Migration generation and execution via Drizzle Kit
- Query building with type safety
- Database-per-service isolation

**Migration risks:**
- No migration locking across services
- No rollback tooling for failed migrations
- No protection against concurrent migration runs during multi-service deploys
- A bad migration during shared deploy could leave schemas half-applied

## BigQuery

Referenced in the codebase for analytics and data warehousing. Used for:
- Aggregated business metrics
- Potential DLQ storage for high-volume topics (proposed)
- Cross-service data analysis

## Migration Analysis Document

`apps/microservices-python/aiaas-merchant-quality/docs/CLOUD_SQL_MIGRATION_ANALYSIS.md` contains:
- Strategic analysis for migrating to dedicated Cloud SQL
- Explains why Crossplane was chosen over Encore's SQLDatabase primitive (Encore only supports TS/Go, service is Python)
- Architecture diagrams showing integration with Groupon shared VPC
- Connection information and phased migration plan

## Database Test Script

`apps/microservices-python/aiaas-merchant-quality/scripts/test_new_db_connection.py`:
- Verifies database connectivity after Crossplane provisioning
- Tests: PostgreSQL version, current database/user, write access, schema creation
- Comparison functionality with old `aidg_stg` database
- Uses psycopg2 driver, configurable via environment variables
