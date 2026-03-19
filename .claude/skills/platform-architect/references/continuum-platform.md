# Continuum Platform — Deep Reference

> Source: platform-architect SKILL.md
> Query current state: `node scripts/query-manifest.mjs system "Continuum Platform"`

---

## Scale and Role

**ID:** 297 | **Container count:** ~89% of all containers in the architecture model

Continuum is the production backbone of Groupon. It is **maintain-only** — no new services, no new patterns to replicate. Every change to Continuum needs a migration note toward Encore.

Query decommission targets: `node scripts/query-manifest.mjs tag ToDecommission`

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language (edge) | Java/Vert.x | API Proxy, aggregation layer |
| Language (services) | Ruby/Sinatra | Identity, user services |
| Database (primary) | MySQL (shared clusters) | The dominant source of coupling |
| Cache | Redis | Rate limiting, sessions, queues, caching |
| Messaging | ActiveMQ Artemis | Primary internal message bus |
| Streaming | Kafka (via Janus) | Data platform integration, CDC |
| Feature flags | 4 separate systems | Do not create a 5th |

---

## Deployment (7 Regions)

| Region | Location | Type |
|--------|---------|------|
| snc1 | US (legacy DC) | Legacy |
| us-central1 | GCP primary | GCP |
| us-west-1/2 | AWS US | AWS |
| europe-west1 | GCP EMEA | GCP |
| dub1 | EMEA legacy DC | Legacy |
| eu-west-1 | AWS EMEA | AWS |
| sac1 | South America | Mixed |

**Migration direction:** Legacy DCs and AWS → GCP. No new AWS resources.

---

## API Proxy (GAPI) — 14-Filter Chain

Every inbound request to Continuum passes through 14 filters in order:

| Filter | Purpose |
|--------|---------|
| LoadShedFilter | Circuit breaker — sheds traffic under overload |
| RateLimitFilter | Redis-backed per-client rate limiting |
| RecaptchaFilter | reCAPTCHA Enterprise V3 bot detection |
| SignifydCookieFilter | Fraud detection cookie injection |
| BrandFilter | Multi-brand routing (Groupon, Livingsocial, etc.) |
| ... (9 more) | Auth, routing, transformation, logging |

**Key timeouts:** 200ms connect, 2s default request, 60s write operations

Query full chain: `node scripts/query-docs.mjs doc api-proxy architecture-context`

---

## Lazlo SOX Aggregator

SOX-compliant aggregation layer that orchestrates composite responses for consumer endpoints.

- **50+ downstream service clients**
- Produces aggregate responses from multiple Continuum services
- Deployed in the API Proxy request path
- **Do not model new services on this pattern** — 50+ synchronous clients is legacy debt

Query clients: `node scripts/query-docs.mjs doc lazlo integrations`

---

## 11 Domain Slices

New Encore service boundaries should align to one of these domains:

| Domain | Coverage |
|--------|---------|
| Core Flows | Main commerce request lifecycle |
| Orders/Payments/Finance | Order management, payment processing, billing |
| Inventory | Voucher, goods, CLO, travel unit management |
| Merchant/Partner | Merchant portal, supply-side |
| Identity/Access | Auth, OTP, sessions, SSO |
| Messaging/Events | ActiveMQ, notifications, email |
| Data/Analytics | Janus pipeline, Kafka, analytics |
| Booking/Travel | Reservation lifecycle, ticketing |
| Marketing/Ads | AdsOnGroupon, promotions |
| Supply | Supply chain, inventory sourcing |
| MBNXT Surfaces | Consumer-facing API endpoints |

---

## Internal Architecture Pattern

Continuum uses **deep layered architecture** — do not replicate this in Encore:

```
Controllers
    → Domain Managers
        → Data Accessors
            → Integration Clients
```

Encore uses flat modular decomposition. Controllers fan out to independent domain modules directly.

---

## Shared MySQL Pattern (Legacy — Do Not Replicate)

Continuum services share MySQL clusters across domain boundaries. This is the largest source of coupling in the platform.

- Multiple services write to the same schema
- Cross-domain reads via shared cluster access
- No service-owns-database enforcement

**Migration target:** Each Continuum service that moves to Encore gets its own dedicated PostgreSQL instance. The shared MySQL schema never moves to Encore — data is migrated table by table.

---

## Decommission Targets

Query current list: `node scripts/query-manifest.mjs tag ToDecommission`

Key decommission targets in 2026:
- Teradata EDW (ID:299) → BigQuery
- OptimusPrime Analytics (ID:91) → Keboola + Expy
- Legacy DCs (snc1, dub1) → GCP
- Amazon MSK → GCP Pub/Sub / Strimzi/Conveyor

---

## Strangler Fig Pattern (Continuum → Encore)

The migration is phased via typed wrappers:

```
Phase 1: Create Encore service with typed wrapper over Continuum API
         (no data migration, Continuum is still source of truth)

Phase 2: Migrate data — MySQL → PostgreSQL, dual-write period
         (both databases live, Encore becoming primary)

Phase 3: Decommission Continuum service
         (remove all references, drop MySQL tables after backup hold)
```

**17 wrappers already exist.** Check before creating a new one:
```bash
node scripts/query-manifest.mjs tag Wrapper
```

---

## Rules for Any Change to Continuum

1. Bug fixes only — no new features
2. Document migration path to Encore for every change
3. No new shared MySQL schemas
4. No new AWS resources
5. 4 feature flag systems already exist — use an existing one, with a removal date
