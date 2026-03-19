# Risks & Platform Roadmap

## Critical Risks (Action Required)

### CRITICAL-1: Shared Redis Cluster (Staging = Production)
- **What**: Single GCP Memorystore instance serves both staging and production
- **Impact**: Staging `FLUSHDB` wipes production data. Key collisions corrupt production cache silently.
- **Location**: Redis client configs across all TS/Go services
- **Fix**: Provision dedicated Memorystore for staging. Add `prod:`/`stg:` namespace prefixes. Set `allkeys-lru` eviction.

### CRITICAL-2: Cloud SQL deletion_protection: false
- **What**: Production Cloud SQL instance (`merchant-quality-postgres`) has `deletion_protection: false`
- **Impact**: A Crossplane reconciliation bug or `kubectl delete` can permanently destroy the production database
- **Location**: `apps/microservices-python/aiaas-merchant-quality/crossplane/01-database-instance.yaml`
- **Fix**: Set `deletion_protection: true` immediately. Add deletion protection to apply-infra.sh validation.

### CRITICAL-3: No Distributed Tracing
- **What**: Zero OpenTelemetry instrumentation. No W3C `traceparent` propagation.
- **Impact**: Cross-service debugging is manual log correlation. Incidents take hours instead of minutes to diagnose.
- **Location**: Architecture-wide
- **Fix**: Adopt OpenTelemetry. Instrument TS/Go via Encore's tracing hooks. Add OTel to Python services. Set up Jaeger or Cloud Trace as backend.

### CRITICAL-4: Root SSH on DigitalOcean Droplets
- **What**: Root SSH access enabled on DO Droplets
- **Impact**: Any SSH key compromise = full root access to all Droplets with no audit trail
- **Location**: DigitalOcean infrastructure
- **Fix**: Replace root access with named user accounts + sudo + SSH key-only auth + bastion host.

---

## High Risks (Plan Within Quarter)

### HIGH-1: Cloud SQL Connection Pool Over Limit
- **What**: 16 Python services × max=3 connections = 48 theoretical connections. db-g1-small max = ~25.
- **Impact**: Connection exhaustion under load causes all Python AI services to fail simultaneously
- **Location**: `apps/microservices-python/common/postgres.py`, Crossplane config
- **Fix**: Upgrade to db-n1-standard-1. Add PgBouncer. Reduce pool size to max=1 with queue.

### HIGH-2: MBus Bridges Disabled in EMEA
- **What**: All 3 MBus bridges (`deal-sync`, `sf-events`, `notifications`) only process US Kafka partitions
- **Impact**: EU deal lifecycle events, Salesforce callbacks, and notifications are silently dropped
- **Location**: `apps/encore-ts/mbus-bridge-*/`
- **Fix**: Enable EMEA partitions in bridge configs. Add per-region consumer group monitoring.

### HIGH-3: No DLQ for 27 Pub/Sub Topics
- **What**: Failed messages are retried and then silently lost. No dead-letter queue exists.
- **Impact**: Data loss on any subscriber failure. No replay capability. No poison message isolation.
- **Location**: Architecture-wide (all 27 Encore topics)
- **Fix**: Configure Pub/Sub DLQ for each topic. Build replay tooling. Add DLQ depth monitoring + alerting.

### HIGH-4: No Service Catalog
- **What**: No ownership mapping. No dependency graph. No documented on-call contact per service.
- **Impact**: Incidents have no clear owner. Changes have unknown blast radius.
- **Location**: Architecture-wide
- **Fix**: Implement Service Catalog 2.0 (SOX+ORR 2.0 policy defines spec). Start with ownership YAML per service in the monorepo.

### HIGH-5: No ORR Process
- **What**: Zero services have ORR profiles, SLOs, runbooks, or on-call assignments
- **Impact**: No operational readiness gate before production. No SLO tracking. No error budget management.
- **Location**: Architecture-wide
- **Fix**: Implement ORR profile enforcement (SOX+ORR 2.0 policy). Start with default ORR templates.

### HIGH-6: No Alerting Standard
- **What**: No golden signal alerts on any service. No alert templates. No escalation paths.
- **Impact**: Incidents are discovered by users, not by systems. MTTD is hours.
- **Location**: Architecture-wide
- **Fix**: Define golden signal alert templates (Encore metrics → Cloud Monitoring → PagerDuty/Jarvis). Pending Ales approval on integration approach.

### HIGH-7: Python Monolith Observability Gap
- **What**: 16 services in one container with no per-service metrics, no request instrumentation
- **Impact**: OOM on one service looks like container-level instability. No SLO basis.
- **Location**: `apps/microservices-python/`
- **Fix**: Add Prometheus `/metrics` per service behind nginx routing. Instrument with OTel.

---

## Medium Risks (Plan Within Half-Year)

| Risk | Impact | Location | Fix |
|------|--------|----------|-----|
| No TTL enforcement on Redis keys | Memory exhaustion, write failures | All Redis-using services | Mandatory TTL policy, audit existing keys |
| No Memorystore eviction policy | `noeviction` default = write failures at capacity | Memorystore config | Set `allkeys-lru` |
| No container image scanning | Undetected CVEs in Python Docker images | `.github/workflows/` | Add Trivy/Snyk scan to CI |
| No SBOM generation | No dependency traceability across 3 runtimes | CI/CD | Add SBOM generation to build pipelines |
| No secrets rotation policy | Stale credentials accumulate risk | All secrets | Document rotation schedule, automate where possible |
| No structured logging standard | Manual log correlation during incidents | All 3 runtimes | Define + enforce shared log schema |
| No PII scrubbing in Fluent Bit | Sensitive data in logs | `fluent-bit` config | Add sanitization filters for known PII fields |
| Kafka orphaned topics | Confusion, wasted resources | Kafka cluster | Topic lifecycle governance process |
| No test coverage gate | Regressions merge undetected | `.github/workflows/` | Enforce minimum coverage threshold per runtime |
| Third-party GitHub Actions not pinned | Supply chain attack via tag mutation | `.github/workflows/` | Pin all actions to commit SHA |

---

## Platform Roadmap

### Encore Platform Gaps (by Priority)

**P1 Must-Have Gaps:**
- Default alerting layer (entire alerting layer missing)
- Custom Grafana dashboards
- Golden signal monitoring (pending Ales approval)
- Automated deployment approval (ProdCAT replacement)
- Deployment time-window validation (partial)
- ORR-gated deployments (automated service readiness checks)

**P2 Should-Have Gaps:**
- ORR readiness validation engine
- ORR score assignment and grace periods
- ORR override mechanism with justification
- Team management (PO/TL roles in Service Portal)
- On-call rotation management in Jarvis

**P3 Nice-to-Have Gaps:**
- Service lifecycle management (deprecation, decommission flows)
- SLO/error budget tracking (basic coverage exists)
- Load testing infrastructure
- Break-glass activation in Jarvis
- Post-break-glass audit review

**P4 Backlog:**
- Jira integration in Service Portal

### What Encore Cloud Already Covers
- Service catalog (basic — auto-generated from code)
- Cost analytics (basic)
- Repository integration
- OpenAPI schema ingestion
- Secrets management
- Cron jobs
- Service flow diagrams
- Deployment details and rollback
- Preview environments per branch

### Migration Priorities

1. **MBus bridges → native Pub/Sub** (unblocks EMEA gap, removes Kafka dependency per service)
2. **Python services observability** (add OTel, per-service metrics — prerequisite for ORR)
3. **Redis namespace isolation** (CRITICAL, low effort — fix today)
4. **Cloud SQL deletion protection** (CRITICAL, one-line fix — fix today)
5. **DLQ for all 27 topics** (data loss prevention)
6. **Service catalog bootstrap** (ownership YAML — enables everything else)
7. **Default ORR profiles** (enforcement gate)
8. **Golden signal alerting** (MTTD reduction)
9. **OpenTelemetry rollout** (MTTR reduction)
10. **DO → GCP migration** (consolidation, security)
