# Encore Platform — Deep Reference

> Source: platform-architect SKILL.md
> Query current state: `node scripts/query-manifest.mjs system "Encore Platform"`

---

## Service Topology (4 Tiers)

```
Tier 1: Gateway (1 service)
    encore-gateway — routes all inbound requests, extracts auth tokens, enforces policies

Tier 2: Core (9 services)
    encore-authn         — JWT/OAuth/Okta authentication
    encore-authz         — RBAC, permission checks
    encore-users         — user profile management
    encore-api-tokens    — service-to-service programmatic access
    encore-audit-log     — immutable audit trail (SOX-compliant)
    encore-websocket     — real-time push to clients
    encore-topics        — Kafka/PubSub topic management
    encore-service-mgmt  — service registry, health checks
    encore-temp-ops      — temporary operational tooling

Tier 3: B2B (40+ services)
    encore-deals, encore-accounts, encore-aidg, encore-ai-agents,
    encore-mcp-server, [and others in the B2B merchant space]

Tier 4: Wrappers (17 services) + Frontends (2)
    17 typed TypeScript proxies to Continuum APIs (strangler fig boundary)
    encore-admin-fe, encore-aidg-fe (internal SPAs)
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | TypeScript (primary), Go (relevance/cloud infra) | No other languages |
| Framework | Encore.dev (TypeScript) | Manages Cloud Run deployment, service routing |
| Compute | GCP Cloud Run (Direct VPC Egress) | Default for all services |
| Database | Cloud SQL PostgreSQL | One dedicated instance per service |
| Async messaging | Encore Topics (platform-managed PubSub over GCP Pub/Sub) | Between Encore services |
| External messaging | Kafka (Strimzi/Conveyor) | Continuum integration, data platform CDC |
| Identity | OAuth/Okta | Configured via encore-authn |
| Long-running workflows | Temporal | For orchestration beyond Cloud Run request timeout |
| AI features | AI Gateways, AI Agents, MCP Server | AI-native platform |

---

## Infrastructure (3 GCP Projects)

| Environment | GCP Project | Region(s) |
|-------------|------------|----------|
| Production | [prod project] | us-central1 (primary), europe-west1 (EMEA) |
| Staging | [staging project] | us-central1 |
| Preview | [preview project] | us-central1 |

**Shared VPC**: private IPs only. Cloud Run → Cloud SQL via Direct VPC Egress (private IP, no Cloud SQL Auth Proxy in production).

**Frontends**: Internal SPAs hosted on Digital Ocean via `admin.groupondev.com`.

---

## Data Ownership Pattern

```
Encore Service A  →  Cloud SQL (postgres-service-a)   ← exclusively owned
Encore Service B  →  Cloud SQL (postgres-service-b)   ← exclusively owned

Cross-service data access: API call or Encore Topic event — NEVER database cross-query
```

- **22 of 23 OwnsDB-tagged containers** in the architecture model belong to Encore
- No shared schemas. No read replicas shared across services.
- PostgreSQL is the ONLY database technology for Encore services

---

## Wrapper Pattern (Strangler Fig to Continuum)

17 typed TypeScript wrapper services provide Encore's anti-corruption layer to Continuum:

```typescript
// Example: encore-deals-continuum-wrapper
// Translates typed Encore RPC calls → Continuum REST HTTP

export async function getDealById(dealId: string): Promise<EncoreDeal> {
  // calls Continuum REST endpoint
  const raw = await continuumClient.get(`/v1/deals/${dealId}`);
  // translates Continuum's data model to Encore's clean type
  return mapContinuumDealToEncoreDeal(raw);
}
```

**Rule:** Encore business logic NEVER calls Continuum REST directly. Always via wrapper.

Check existing wrappers before creating a new one:
```bash
node scripts/query-manifest.mjs tag Wrapper
```

---

## Internal Architecture: Modular (Not Layered)

```
Encore Service:
    Controllers (HTTP handlers, Encore RPC handlers)
        ↓ fan out to
    Domain Modules (independent business logic units)
        ↓ use
    Repository / Data Access (Drizzle ORM, direct SQL)
        ↓
    Cloud SQL PostgreSQL
```

**NOT** Continuum's deep layered pattern:
```
❌ Controllers → Domain Managers → Data Accessors → Integration Clients
```

Prefer flat, modular decomposition. Controllers should be thin. Business logic lives in domain modules.

---

## Shared Services Usage Rules

| Service | When to use | When NOT to use |
|---------|------------|----------------|
| encore-gateway | All inbound requests | Do not bypass for internal-only services |
| encore-authn | All user-authenticated flows | Service-to-service calls use API tokens instead |
| encore-authz | Before any data access based on user identity | Trivial public endpoints |
| encore-topics | Cross-service async events | Within-service communication |
| encore-audit-log | Any mutation of sensitive or financial data | Read-only operations |

---

## Cloud Run Configuration Patterns

```yaml
# Standard Cloud Run service configuration
runtime: cloud-run
region: us-central1
min_instances: 1      # prod (0 = cold starts on every request)
max_instances: 100    # tune per service expected load
memory: 512Mi         # start here, increase if needed
cpu: 1                # increase for CPU-intensive workloads
concurrency: 80       # default; reduce for CPU-bound or DB-heavy
vpc_connector: direct  # Direct VPC Egress (private IP)

# Environment variables (via GCP Secret Manager)
DATABASE_URL: "postgresql://...@<private-ip>:5432/<db>"
```

**Connection pool rule:** `max_instances × pool_max_connections` must be below Cloud SQL `max_connections`.

Example: 50 Cloud Run instances × 10 pool connections = 500 total → need db-n1-standard-2 or larger Cloud SQL.

---

## Key Decisions (Recorded ADRs)

| Decision | Rationale |
|---------|-----------|
| Public GitHub monorepo | Required by Encore Cloud deployment model |
| OAuth/Okta for identity | Enterprise SSO, Groupon standard |
| Drizzle ORM over Prisma | Lighter weight, better TypeScript integration, explicit migrations |
| Cloud Run over GKE | Serverless, no cluster management, matches Encore.dev defaults |
| Temporal for long-running | Cloud Run has 60min max request timeout — Temporal handles anything longer |
| PostgreSQL per service | Enforces service-owns-database, eliminates Continuum's shared-schema coupling |
