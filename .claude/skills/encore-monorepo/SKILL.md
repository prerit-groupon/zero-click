---
name: encore-monorepo
description: >
  Complete architectural reference for Groupon's Encore-based monorepo (groupon-monorepo). Use this skill whenever anyone asks about: the monorepo's architecture, services, infrastructure, cloud setup, databases, messaging, Redis, CI/CD, observability, or any platform engineering question related to Groupon's Encore stack. Also trigger when someone asks about service ownership, dependencies, migration status, known risks, operational gaps, ORR readiness, SOX compliance posture, or "how does X work in our codebase." This skill contains findings from a deep infrastructure audit of the entire codebase and should be consulted before exploring the repo from scratch. It saves significant time by providing pre-mapped architecture, file paths, and risk assessments.
---

# Groupon Encore Monorepo — Architecture Reference

This skill contains the complete findings from a deep infrastructure audit of the `groupon-monorepo`. It covers architecture, services, cloud infrastructure, databases, messaging, caching, CI/CD, observability, and known risks.

## When NOT to Use This Skill

| Situation | Use Instead |
|-----------|-------------|
| Designing a new service or deciding where a capability should go | `/platform-architect` or `/enterprise-architect` — this skill is reference, not design authority |
| BigQuery pipelines, Kafka topics, or Teradata migration | `/data-architect` — data platform lives outside this monorepo |
| Continuum platform services (Java/Ruby, legacy commerce engine) | `/platform-architect` — Continuum is not in this monorepo |
| GCP/AWS cloud cost analysis | `/cloud-cost-optimizer` or `/gcp-cost-optimizer` |
| Kubernetes cluster-level operations (not Encore services) | `/kubernetes-specialist` |
| PostgreSQL schema design for a new Encore service | `/postgres` for the Drizzle/Cloud SQL specifics |
| General observability (Thanos, Grafana, ELK stack) | `/observability` |

This skill is a reference snapshot. It describes the state of the monorepo as audited. If answers depend on live code, ask the user to confirm current repo state before acting on this skill's content.

---

## How to Use This Skill

The SKILL.md gives you the full architecture overview and service inventory. For deep dives into specific domains, read the relevant reference file:

| Topic | Reference File | When to Read |
|-------|---------------|--------------|
| Cloud, IaC, security | `references/cloud-infrastructure.md` | Questions about GCP, DigitalOcean, Encore Cloud, Crossplane, IAM, VPC, Droplets |
| Databases & data stores | `references/databases.md` | Questions about PostgreSQL, Cloud SQL, Drizzle ORM, BigQuery, migrations |
| Messaging & async | `references/messaging-async.md` | Questions about Pub/Sub, Kafka, MBus bridges, Temporal, DLQ |
| Redis & caching | `references/redis-caching.md` | Questions about Memorystore, ioredis, go-redis, namespace collisions |
| CI/CD & GitHub | `references/cicd-github.md` | Questions about GitHub Actions, workflows, branch protection, deployments |
| Monitoring, logging, tracing | `references/observability.md` | Questions about metrics, OpenSearch, Fluent Bit, Langfuse, alerting |
| Risks & platform roadmap | `references/risks-roadmap.md` | Questions about known risks, gaps, ORR readiness, migration priorities |

When a user asks about a specific domain, read the relevant reference file first before answering — do not answer from memory alone.

---

## Architecture at a Glance

**Monorepo path:** Root of the repository, typically mounted at the workspace root.

**Runtimes:** Three distinct runtime environments coexist:

- **78 TypeScript services** on Encore.dev framework (primary runtime). Each service has its own directory under `apps/encore-ts/`. These get Encore's built-in infrastructure primitives: managed PostgreSQL, Pub/Sub, caching, secrets, metrics, and CI/CD.
- **2 Go services** on Encore.dev (`gorapi`, `vespa-reader`) under `apps/encore-go/`. Same Encore primitives as TS.
- **16 Python AI microservices** (`aiaas-*`) bundled in a single Docker container with nginx reverse proxy under `apps/microservices-python/`. These do NOT use Encore primitives — they manage their own database connections, secrets, and have minimal observability.

**Cloud providers (3):** GCP (Cloud Run, Cloud SQL, Memorystore, Artifact Registry, Cloud Monitoring), DigitalOcean (App Platform, Managed PostgreSQL, Spaces object storage, Droplets), and Encore Cloud (manages deployment for TS/Go services).

**Frontend applications** live under `apps/frontends/`.

**Documentation** lives under `_documentation/`.

---

## Service Inventory

### Encore TypeScript Services (78 services)

Located under `apps/encore-ts/`. Each service follows the Encore service pattern with `encore.service.ts`. Key services include:

- **MBus bridge services** (3): `mbus-bridge-deal-sync`, `mbus-bridge-sf-events`, `mbus-bridge-notifications` — translate between legacy Kafka (MBus) and Encore Pub/Sub
- **27 Pub/Sub topics** with 30+ subscription handlers
- Database-per-service pattern using Drizzle ORM with Encore-managed PostgreSQL
- All services get automatic metrics, tracing (Encore built-in), and deployment via Encore Cloud

### Encore Go Services (2 services)

Located under `apps/encore-go/`:
- `gorapi` — API gateway/proxy service
- `vespa-reader` — Vespa search integration

Uses `go-redis` for Redis, standard Go patterns for HTTP.

### Python AI Microservices (16 services)

Located under `apps/microservices-python/`. All `aiaas-*` prefixed:

- Run as a **single Docker container** with nginx reverse proxy routing to individual services
- Use `psycopg2.pool.ThreadedConnectionPool` (min=0, max=3 per service) for PostgreSQL
- Connection pooling config in `apps/microservices-python/common/postgres.py`
- Connect to Cloud SQL (`merchant-quality`) and DigitalOcean Managed PG
- Use Langfuse for LLM tracing (only tracing in the entire architecture that works for Python)
- **Not managed by Encore** — no Encore primitives, no auto-instrumentation, no managed infrastructure

---

## Key File Paths

```
apps/
├── encore-ts/                          # 78 TypeScript services
│   ├── <service-name>/
│   │   ├── encore.service.ts           # Service definition
│   │   └── ...
│   ├── mbus-bridge-deal-sync/          # MBus → Pub/Sub bridge
│   ├── mbus-bridge-sf-events/          # Salesforce events bridge
│   └── mbus-bridge-notifications/      # Notifications bridge
├── encore-go/                          # 2 Go services
│   ├── gorapi/
│   └── vespa-reader/
├── microservices-python/               # 16 Python AI services
│   ├── aiaas-merchant-quality/
│   │   ├── crossplane/                 # Only Crossplane usage in entire repo
│   │   │   ├── 01-database-instance.yaml
│   │   │   ├── 02-database.yaml
│   │   │   ├── 03-database-user.yaml
│   │   │   ├── 04-dns-record.yaml
│   │   │   └── apply-infra.sh
│   │   ├── docs/
│   │   │   └── CLOUD_SQL_MIGRATION_ANALYSIS.md
│   │   └── scripts/
│   │       └── test_new_db_connection.py
│   └── common/
│       └── postgres.py                 # Shared PG connection pool config
└── frontends/                          # Frontend applications
.github/
└── workflows/                          # 31 GitHub Actions workflows
_documentation/                         # Engineering docs and standards
```

---

## Critical Risks Summary

These are the highest-severity findings from the audit. Read `references/risks-roadmap.md` for the full list with proposed solutions.

| # | Risk | Severity | Location |
|---|------|----------|----------|
| 1 | **Shared Redis cluster** — staging and production use the same GCP Memorystore instance | CRITICAL | Redis client configs across services |
| 2 | **Cloud SQL deletion_protection: false** — production database can be accidentally deleted | CRITICAL | `apps/microservices-python/aiaas-merchant-quality/crossplane/01-database-instance.yaml` |
| 3 | **No distributed tracing** — no OpenTelemetry, no cross-service trace propagation | CRITICAL | Architecture-wide |
| 4 | **Root SSH on DigitalOcean Droplets** | CRITICAL | DO infrastructure |
| 5 | **Connection pool exceeds Cloud SQL limits** — 48 theoretical connections vs ~25 instance max on db-g1-small | HIGH | `apps/microservices-python/common/postgres.py` + Crossplane config |
| 6 | **MBus bridges disabled in EMEA** — deal sync, SF events, notifications not propagated for EU | HIGH | `apps/encore-ts/mbus-bridge-*` |
| 7 | **No DLQ monitoring or replay** — failed messages across 27 topics silently dropped | HIGH | Architecture-wide |
| 8 | **No service catalog** — no ownership mapping, no dependency graph | HIGH | Architecture-wide |
| 9 | **No ORR process** — no SLOs, no runbooks, no on-call mapping per service | HIGH | Architecture-wide |
| 10 | **No alerting standard** — Encore provides basic metrics but no alerting layer | HIGH | Architecture-wide |
| 11 | **Python monolith observability gap** — 16 services in one container with zero per-service metrics | HIGH | `apps/microservices-python/` |

---

## Infrastructure Quick Reference

| Resource | Provider | Details |
|----------|----------|---------|
| Compute (TS/Go) | Encore Cloud | Auto-managed Cloud Run behind the scenes |
| Compute (Python) | DO App Platform / GCP Cloud Run | Single Docker container, nginx reverse proxy |
| Compute (legacy) | DigitalOcean Droplets | Root SSH enabled (security risk) |
| PostgreSQL (TS/Go) | Encore-managed | Database-per-service, Drizzle ORM |
| PostgreSQL (Python) | GCP Cloud SQL | `merchant-quality-postgres`, db-g1-small, us-central1, Crossplane-provisioned |
| PostgreSQL (Python) | DO Managed PG | Port 25060, SSL required |
| Redis/Cache | GCP Memorystore | Shared staging/prod (CRITICAL risk), ioredis (TS), go-redis (Go) |
| Object Storage | DO Spaces | Static assets, file storage |
| Message Bus | Encore Pub/Sub | 27 topics, 30+ subscribers |
| Message Bus (legacy) | Kafka (MBus) | Bridged via 3 MBus bridge services |
| Workflows | Temporal | Alongside Encore services |
| Container Registry | GCP Artifact Registry | Python Docker images |
| CI/CD | GitHub Actions | 31 workflows, branch-as-environment model |
| CI/CD (TS/Go) | Encore Cloud | Native Encore CI/CD |
| Logs | OpenSearch + Fluent Bit | Centralized log aggregation |
| LLM Tracing | Langfuse | Python AI services only |
| DNS | GCP Cloud DNS | Managed zone: `dz-stable-sharedvpc01-gds-stable` |
| VPC | GCP | `vpc-stable-sharedvpc01`, private IP networking |
| IaC | Crossplane | Only 1 Cloud SQL instance — extremely narrow adoption |

---

## Crossplane (Only Usage)

Crossplane is used in exactly one place: `apps/microservices-python/aiaas-merchant-quality/crossplane/`. It provisions:
- Cloud SQL PostgreSQL 15 instance (`merchant-quality-postgres`), `db-g1-small`, `us-central1`
- Database `merchant-quality-db` with user `merchant-quality-rw`
- DNS CNAME `merchant-quality-db.gds.stable.gcp.groupondev.com`
- Providers: Upbound `provider-gcp-sql` (`sql.gcp.m.upbound.io/v1beta1`) and `provider-gcp-dns`
- GCP project: `prj-grp-gds-stable-63d2`
- No Crossplane compositions, XRDs, or reusable abstractions exist

---

## SOX + ORR 2.0 Policy Context

A unified SOX-compliant change-management and operational-readiness framework has been drafted ("Paved Road with Guardrails"). Key decisions:

- **100% SOX scope**: every code change in the monorepo is SOX in scope, no opt-out
- **100% ORR coverage**: every service has enforced default ORR profile or explicit off-road justification
- **Policy as code**: all config in Git, no portal-based configuration
- **Service Catalog 2.0**: single pane of glass, auto-modeled from code
- **AI-assisted governance**: mandatory AI code review, change risk scoring, stakeholder summaries
- **Break-glass policy**: two-engineer joint activation, 8-hour elevated role, full audit logging

Current state: the policy is drafted but none of the enforcement tooling exists yet. The monorepo has zero ORR profiles, zero SLOs, and no service catalog.

---

## Encore Platform Roadmap Gaps

From the platform engineer's review, key gaps relevant to daily work:

- **Service Portal**: ORR process integration (P1, partial), automated service checks (P1, gap), lifecycle management (P3, gap), team management PO/TL roles (P2, partial), Jira integration (P4, gap)
- **ORR**: readiness validation (P2, gap), score assignment (P2, gap), grace periods (P2, gap), override mechanism (P2, gap)
- **Observability**: default alerting (P1, gap), custom dashboards (P1, gap), golden signal monitoring pending approval from Ales (P1, gap)
- **ProdCAT replacement**: automated deployment approval (P1, gap), time-window validation (P1, partial), dependency change detection (P1, gap)
- **SRE**: on-call rotation management (P2, gap), SLO/error budget tracking (P3, basic coverage), load testing (P3, gap)
- **Jarvis**: break-glass activation (P3, gap), emergency role (P3, gap), post-break-glass review (P3, gap)
- **Covered by Encore**: service catalog (basic), cost analytics (basic), repository integration, OpenAPI schema ingestion, secrets, cron jobs, flow diagrams, deployment details, preview environments

---

## Migration Context

The architecture is mid-migration from legacy (GDS) to Encore. Key migration artifacts:

- **MBus bridges**: 3 services bridging legacy Kafka → Encore Pub/Sub. These are temporary — each bridge should be decommissioned as consumers migrate to native Pub/Sub.
- **Python services**: not on Encore, managed separately. Migration path unclear (rewrite to TS vs. permanent sidecar).
- **DigitalOcean resources**: some services still on DO infrastructure with no documented migration timeline to GCP/Encore Cloud.
- **Legacy tooling**: ProdCAT, Deploybot, GPROD Logbook still in use, replacements defined in SOX+ORR 2.0 but not built.
- **Database diversity**: Encore-managed PG + Cloud SQL (Crossplane) + DO Managed PG. No unified backup/DR strategy.

---

## Behaviour Rules

1. **Read the relevant reference file** before answering domain-specific questions — do not answer from skill memory alone.
2. **Surface critical risks proactively** when they are relevant to the user's question (e.g. shared Redis if they ask about caching).
3. **Never assume the monorepo is current** — ask the user to confirm repo state if answers depend on live code.
4. **For new service design**, apply the platform-architect decision framework: service decomposition, data ownership, backward compatibility, event patterns, migration readiness.
5. **Escalate cross-cutting concerns** to `/enterprise-architect` or `/platform-architect` for design decisions — this skill is reference, not decision-maker.

---

## Gotchas

**Shared Redis (staging + prod on the same Memorystore)** — This is a CRITICAL active risk. Staging and production share one GCP Memorystore instance. Any new Redis namespace you add in staging is visible to production. Never test cache invalidation or flushes in staging — they affect production immediately.

**Cross-service direct database access is forbidden** — Encore enforces the service-owns-database pattern. If a service needs data from another service's database, it must call that service's API. There is no exception. Suggesting a cross-DB query will be rejected in review.

**Missing `encore.service.ts` = service not registered** — Every Encore TS service directory requires an `encore.service.ts` file with the `Service` export. Without it, Encore does not register the service and it won't appear in the service graph, won't get a Cloud Run deployment, and won't have managed infrastructure.

**Python AI services are NOT on Encore** — The 16 `aiaas-*` services under `apps/microservices-python/` are a single Docker container with nginx. They have no Encore primitives — no managed DB, no Pub/Sub, no auto-instrumentation, no auto-scaling. Do not suggest Encore features for these services.

**Cloud SQL `deletion_protection: false` in production** — The `aiaas-merchant-quality` Crossplane config has `deletion_protection: false` on its production Cloud SQL instance. The database can be accidentally deleted. Do not run `kubectl delete` on any Crossplane resources in the GDS project without explicit confirmation.

**MBus bridges are disabled in EMEA** — The 3 MBus bridge services (`mbus-bridge-deal-sync`, `mbus-bridge-sf-events`, `mbus-bridge-notifications`) are disabled for EU regions. Deal sync, Salesforce events, and notifications do NOT propagate for European users. This is a known HIGH risk with no fix timeline.

**No DLQ monitoring** — Failed Pub/Sub messages across all 27 topics are silently dropped. There is no dead letter queue monitoring or replay mechanism. If a subscriber fails, messages are lost without any alert. Don't assume failed messages will be retried or visible anywhere.

**DigitalOcean Droplets run as root** — Legacy DO infrastructure has root SSH enabled. This is a known CRITICAL security risk. Do not add new workloads to DO Droplets. Flag any PR that adds DO resources.

**No distributed tracing** — There is no OpenTelemetry or cross-service trace propagation. Encore provides built-in per-service tracing, but traces do not cross service boundaries. You cannot correlate a user request across multiple Encore services today.
