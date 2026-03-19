# Example: Capability Placement Decision

> Walkthrough of using /enterprise-architect to decide where to build a new capability
> Scenario: "We need a gift card balance check feature"

---

## Step 1 — Architecture Query

```bash
node context/scripts/query-manifest.mjs system encore-payments
node context/scripts/query-manifest.mjs search "gift card"
```

**Findings:**
- `encore-payments` owns payment method management
- No existing gift card service in Encore
- Continuum has a legacy `GiftCardService` in `continuum-commerce`
- MBNXT currently calls Continuum directly via `/v1/giftcard/balance`

---

## Step 2 — Platform Decision

| Question | Answer |
|---------|--------|
| New business logic? | Yes — need to add expiry logic, fraud checks |
| Who consumes this? | MBNXT (consumer app), B2B checkout |
| Continuum has existing code? | Yes — wrap, don't replicate |
| Cross-platform? | Yes — triggers enterprise-architect review |

**Decision: Encore wrapper service for Continuum, not a new standalone service.**

Rationale: Gift card balance is Continuum data. Creating a standalone Encore service would require a data migration. The correct pattern is an Encore wrapper (`encore-giftcard`) that:
1. Calls Continuum's `GiftCardService` for balance
2. Adds Encore-side enrichment (expiry display logic, fraud flag)
3. Exposes a clean GraphQL field for MBNXT and REST endpoint for B2B

---

## Step 3 — ADR Created

`plans/gift-card-balance-adr.md` — ADR-004: Encore Wrapper for Gift Card Balance

Key decisions recorded:
- Encore wrapper owns the API contract, Continuum owns the data
- No data migration in Phase 1 (reduces risk)
- Wrapper adds idempotency and caching (Redis via encore-cache-manager)
- Migration to Encore-native gift card data is Phase 2 (separate initiative)

---

## Step 4 — Design Doc

`plans/gift-card-balance-design.md`

| API Contract | Owner | Consumers |
|-------------|-------|-----------|
| `GET /api/v1/gift-cards/:id/balance` | `encore-giftcard` | MBNXT, B2B |
| `gift.card.balance.checked.v1` (Kafka) | `encore-giftcard` | analytics pipeline |

Data ownership:
- Gift card data: Continuum (temporary, Phase 1)
- Balance check audit log: `encore-giftcard` PostgreSQL

---

## Step 5 — Architect Routing

| Architect | Role |
|---------|------|
| Enterprise Architect | Approved cross-platform decision, confirmed wrapper pattern |
| Platform Architect | Designed Encore service internals, Continuum integration |
| Data Architect | Reviewed Kafka event schema for analytics |
| MBNXT Architect | Reviewed GraphQL field addition |

---

## Output Files

```
plans/
├── gift-card-balance-design.md      ← Full design doc
├── gift-card-balance-adr.md         ← ADR-004
└── .planning/phase-1/               ← Execution plans (from /ce:plan)
```
