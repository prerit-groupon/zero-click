# Platform Placement Decision Tree

> When a new capability is requested, use this reference to determine which platform it belongs on
> and which architect skill to involve.

---

## Decision Flow

```
New capability needed
    │
    ├─ Consumer-facing UI / UX?
    │      → Platform: MBNXT (Next.js PWA + React Native)
    │      → API layer: GAPI or Encore REST endpoint
    │      → Skill: /mbnxt-architect
    │
    ├─ B2B / internal operations / merchant tools?
    │      → Platform: Encore (TypeScript, Cloud Run, PostgreSQL)
    │      → Skill: /platform-architect or /b2b-architect
    │
    ├─ Extending existing Continuum commerce flow?
    │      → Platform: Continuum (maintain) + document migration path
    │      → Skill: /platform-architect
    │      → Required: migration plan before approval
    │
    ├─ Data pipeline / analytics / reporting / ML?
    │      → Platform: Data platform (BigQuery + Keboola + Airflow)
    │      → Skill: /data-architect
    │
    ├─ Cross-cutting infrastructure?
    │      → Platform: Encore shared services (see below)
    │      → Skill: /platform-architect
    │
    ├─ Touches BOTH Continuum and Encore?
    │      → Integration boundary
    │      → Encore side: clean service with its own data store
    │      → Boundary: anti-corruption layer (typed wrapper)
    │      → Continuum side: do not let its data model leak into Encore
    │      → Skill: /enterprise-architect leads, /platform-architect implements
    │
    └─ Unclear?
           → Start with /enterprise-architect
           → Run query-manifest.mjs search to find what handles this today
```

---

## Platform Quick Reference

### Encore — Use For:

| Capability | Notes |
|-----------|-------|
| New business logic for B2B/internal ops | Default new-build platform |
| Merchant management features | B2B tier in Encore |
| Authentication / authorisation | Use encore-authn/authn-authz shared services |
| AI features, agent workflows | AI Gateways, AI Agents, MCP Server already in Encore |
| API contracts for MBNXT | Expose via Encore REST, consumed by MBNXT |
| Anything new that is not consumer UI or data analytics | Encore is the default |

**Must use:** Cloud Run, TypeScript (or Go), PostgreSQL per service, Encore.dev framework

### Continuum — Use For:

| Capability | Notes |
|-----------|-------|
| Bug fixes in existing commerce flows | Maintain only |
| Orders, payments, vouchers, inventory | Core commerce engine — maintain in place |
| GAPI / API Proxy changes | 7-region deployment, 14-filter chain |
| Legacy services pending migration | Document migration plan |

**Rule:** No new services on Continuum. Every Continuum change needs a migration note.

### MBNXT — Use For:

| Capability | Notes |
|-----------|-------|
| Consumer-facing web (PWA) | Next.js, 13 countries, daily releases |
| Mobile app features | React Native |
| Consumer API consumption | Calls GAPI or Encore REST endpoints |
| GraphQL schema for consumers | Coordinate with GAPI layer |

**Rule:** MBNXT does not own backend logic. It consumes APIs.

### Data Platform — Use For:

| Capability | Notes |
|-----------|-------|
| Analytics, reporting, BI | BigQuery target state |
| ETL / data transformation | Keboola |
| Event streaming at scale | Kafka (Strimzi/Conveyor) |
| ML experimentation | Expy |
| Data catalog | OpenMetadata |
| CDC from operational DBs | Megatron / GCP Datastream |

**Rule:** BigQuery only. No new Teradata dependencies.

---

## Encore Shared Services — Reuse, Don't Rebuild

| Service | Purpose | When to Use |
|---------|---------|-------------|
| `encore-gateway` | API routing, auth token extraction | All inbound requests |
| `encore-authn` | Authentication (JWT, OAuth, Okta) | User identity verification |
| `encore-authz` | Authorization (RBAC, permission checks) | Access control decisions |
| `encore-api-tokens` | API token management for service-to-service | Programmatic API access |
| `encore-topics` | Kafka/PubSub topic management | Async events between services |
| `encore-audit-log` | Immutable audit trail | Any sensitive data changes |
| `encore-websocket` | Real-time push to clients | Live updates, notifications |
| `encore-service-management` | Service registry, health checks | Service discovery |

**Rule:** If an Encore shared service covers the need, use it. Do not build a competing implementation.

---

## Integration Boundary Patterns

### Encore ↔ Continuum (via typed wrappers)

```
Encore Service (new logic)
    ↓ calls
encore-[domain]-wrapper (typed TypeScript interface)
    ↓ calls
Continuum REST endpoint
```

17 typed wrappers already exist. Check before creating a new one:
```bash
node context/scripts/query-manifest.mjs tag Wrapper
```

Never call Continuum REST endpoints directly from Encore business logic.

### Encore ↔ Data Platform (via events)

```
Encore Service
    ↓ publishes
encore-topics (Kafka/PubSub topic)
    ↓ consumed by
Data platform pipeline (Keboola/Airflow → BigQuery)
```

Data platform also has a BigQuery Wrapper (ID:7663) for Encore services that need to query BigQuery directly.

### MBNXT ↔ Backend

```
MBNXT (Next.js)
    ↓ HTTP/GraphQL
GAPI (API Proxy)
    ↓ routes to
Lazlo SOX (aggregator) → Continuum services
              or
Encore REST endpoints (direct, bypassing Lazlo for new services)
```

---

## Blast Radius Classification

Before approving a cross-platform decision, assess blast radius:

| Systems touched | Team count | Classification | Required |
|----------------|-----------|---------------|---------|
| 1 platform, 1 domain | 1 team | Low | Platform Architect |
| 2 platforms | 2–3 teams | Medium | Enterprise Architect |
| 3+ platforms | 3+ teams | High | Enterprise Architect + all domain architects |
| Commerce engine core | Any | Critical | Enterprise Architect + human review |
