# Cloud Infrastructure & Security

## Multi-Cloud Topology

### GCP (Primary)
- **Project**: `prj-grp-gds-stable-63d2`
- **Region**: `us-central1`
- **VPC**: `vpc-stable-sharedvpc01` (shared VPC, private IP networking)
- **Cloud Run**: Encore Cloud deploys TS/Go services as Cloud Run instances behind the scenes
- **Cloud SQL**: PostgreSQL 15, `merchant-quality-postgres`, `db-g1-small` (0.6 GB RAM, shared vCPU), 20GB SSD auto-resize to 100GB, private IP only
- **Memorystore**: Redis instance shared between staging and production (CRITICAL risk)
- **Artifact Registry**: Container images for Python monolith Docker builds
- **Cloud Monitoring**: Basic metrics, no custom alerting configured
- **Cloud DNS**: Managed zone `dz-stable-sharedvpc01-gds-stable`, hosts CNAME for Cloud SQL endpoint

### DigitalOcean
- **App Platform**: Hosts Python AI microservices (alternative to Cloud Run)
- **Managed PostgreSQL**: Some services use DO PG, port 25060, SSL required
- **Spaces**: Object storage for static assets and files
- **Droplets**: Legacy compute instances with root SSH access enabled (CRITICAL security risk)
- No documented rationale for which workloads run on DO vs GCP

### Encore Cloud
- Manages deployment and infrastructure for 78 TS + 2 Go services
- Auto-provisions Cloud Run, PostgreSQL, Pub/Sub, caching per service
- Dashboard: `app.encore.cloud/groupon-encore-83x2/`
- Preview environments on Cloud Run: `app.encore.cloud/groupon-encore-83x2/settings/app/preview-environments`
- Secrets management: `app.encore.cloud/groupon-encore-83x2/secrets`
- Cron jobs: `app.encore.cloud/groupon-encore-83x2/envs/prod-us-central1/cron`

## Crossplane (IaC)

Only used in one location: `apps/microservices-python/aiaas-merchant-quality/crossplane/`

**Resources provisioned:**
1. `01-database-instance.yaml` — CloudSQL PostgreSQL 15 instance
   - Instance: `merchant-quality-postgres`
   - Tier: `db-g1-small` (shared vCPU, 0.6 GB RAM)
   - Region: `us-central1`, private IP on shared VPC
   - Disk: 20GB SSD, auto-resize to 100GB
   - **deletion_protection: false** (CRITICAL — production DB can be deleted)
   - Provider: `sql.gcp.m.upbound.io/v1beta1`
   - Uses `ClusterProviderConfig` named "default"

2. `02-database.yaml` — Database `merchant-quality-db`, UTF8 encoding
3. `03-database-user.yaml` — User `merchant-quality-rw`, password in K8s secret `merchant-quality-db-password`
4. `04-dns-record.yaml` — CNAME `merchant-quality-db.gds.stable.gcp.groupondev.com` → `merchant-quality-postgres.prj-grp-gds-stable-63d2.us-central1.sql.goog.`, TTL 300
5. `apply-infra.sh` — Deployment script with dry-run, ordered apply, readiness polling (20 min timeout)

**IaC Coverage Gap**: The rest of the infrastructure (Memorystore, VPC config, DO Droplets, DO App Platform, Artifact Registry, other Cloud Run services) is not managed by IaC. Unknown mix of click-ops and Encore-managed.

## Security Findings

- **Root SSH on DO Droplets**: Root access enabled, should be named user accounts with sudo + SSH key-only auth + bastion host
- **No secrets rotation policy**: No documented schedule for rotating GCP service accounts, DO API tokens, or GitHub Actions secrets
- **No IAM audit**: No inventory of service accounts, their permissions, or least-privilege verification across GCP and DO
- **GitHub Actions third-party actions not pinned**: Workflows reference actions by tag (e.g., `@v4`) not by SHA, creating supply chain risk
- **No container image scanning**: Python Docker images pushed to Artifact Registry without CVE scanning
- **No SBOM generation**: No Software Bill of Materials across three language runtimes

## DNS and Networking
- GCP shared VPC `vpc-stable-sharedvpc01` provides private networking
- Cloud SQL uses private IP only (no public endpoint)
- DNS managed in Cloud DNS zone `dz-stable-sharedvpc01-gds-stable`
- DO services use their own networking (not integrated with GCP VPC)
- Encore Cloud handles its own service-to-service networking for TS/Go services
