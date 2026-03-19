# Example: New Encore Service via Get Shit Done

> Scenario: Building `encore-gift-cards` — a new Encore TypeScript service for gift card issuance,
> redemption, and balance tracking. Multi-phase milestone (Phase 1: core API, Phase 2: redemption flow,
> Phase 3: Continuum migration). Uses the full GSD workflow to prevent context rot across sessions.

---

## Step 1 — `/gsd:new-project`

### Questions Asked

```
1. What problem does this solve?
   → Groupon needs a gift card product. Currently handled via Continuum commerce_db ad-hoc.
   → encore-gift-cards will own the full lifecycle: issuance, balance, redemption, expiry.

2. Who owns it?
   → B2B Platform squad. Lead: Priya Mehta.

3. Which Groupon platform?
   → Encore (new B2B logic). Continuum integration needed for legacy balance migration.

4. What are the must-haves vs. nice-to-haves?
   → Must: issue/redeem/balance API. Nice: bulk issuance, merchant self-service.
```

### Architecture Query

```bash
node context/scripts/query-manifest.mjs search "gift card"
# → 0 results — no existing gift card service

node context/scripts/query-manifest.mjs depends-on "encore-payments"
# → encore-orders, encore-checkout, encore-accounts

node context/scripts/query-manifest.mjs search "payment"
# → encore-payments (ID:7605), continuum-payments (ID:412)
```

### Context Documents Created

```
plans/PROJECT.md
plans/REQUIREMENTS.md
plans/ROADMAP.md
plans/STATE.md
```

**plans/PROJECT.md (excerpt):**
```markdown
# encore-gift-cards

New Encore TypeScript service for gift card lifecycle management.

**Owner:** B2B Platform Squad (Priya Mehta)
**Platform:** Encore — Cloud Run + PostgreSQL (postgres-encore-gift-cards)
**Domain:** Payments / Commerce
**Migration:** Phase 3 migrates legacy Continuum gift card data

## Groupon Context
- encore-payments (ID:7605): owns payment processing — gift cards redeem against it
- encore-checkout (ID:7601): will integrate redemption at checkout
- continuum-payments (ID:412): legacy gift card data lives in commerce_db.gift_cards
- Encore Gateway: all inbound requests must route via encore-gateway (not direct authn)
```

**plans/ROADMAP.md:**
```markdown
# Roadmap — encore-gift-cards

## Phase 1 — Core Gift Card API (Week 1–2)
- Gift card schema (Drizzle/PostgreSQL)
- Issue endpoint: POST /gift-cards
- Balance endpoint: GET /gift-cards/:code/balance
- Basic admin: activate/deactivate

## Phase 2 — Redemption Flow (Week 3–4)
- Redeem endpoint: POST /gift-cards/:code/redeem
- Partial redemption (split payment)
- Redemption webhook to encore-payments
- encore-checkout integration

## Phase 3 — Continuum Migration (Week 5–6)
- Continuum wrapper for legacy gift card reads
- Data migration: commerce_db.gift_cards → postgres-encore-gift-cards
- Parallel run + cutover
```

---

## Step 2 — `/gsd:discuss-phase 1`

### Key Design Decisions

**Decision 1: Database ownership**
- Each service owns exactly one database — no sharing
- Decision: `postgres-encore-gift-cards` is a dedicated Cloud SQL instance
- Why: encore-payments already owns postgres-encore-payments; sharing would couple deployments

**Decision 2: Continuum integration pattern**
- Do NOT read commerce_db.gift_cards directly (creates Encore → Continuum DB dependency)
- Decision: create `encore-payments-continuum-wrapper` typed API wrapper
- Check: `node context/scripts/query-manifest.mjs tag Wrapper` → wrapper already exists — reuse it

**Decision 3: Auth pattern**
- All inbound must enter via encore-gateway
- Trust `x-groupon-user-id` header — do NOT call encore-authn directly

Decisions saved to `plans/CONTEXT.md`.

---

## Step 3 — `/gsd:plan-phase 1`

### Task Plans (XML structure)

```xml
<tasks>
  <task id="1.1">
    <title>Scaffold encore-gift-cards Cloud Run service</title>
    <details>
      - Copy encore service scaffold from platform-architect template
      - Configure: Cloud Run, region us-central1, postgres-encore-gift-cards Cloud SQL
      - Drizzle ORM setup with migrations directory
      - Register service in context/data/cloud-context-shared/repositories.json
    </details>
    <verification>encore-gift-cards deploys to Cloud Run staging, /healthz returns 200</verification>
  </task>

  <task id="1.2" depends="1.1">
    <title>Gift card schema and migrations</title>
    <details>
      - Table: gift_cards (id, code, amount_cents, balance_cents, status, expires_at, created_at)
      - Table: gift_card_transactions (id, gift_card_id, amount_cents, type, reference_id, created_at)
      - Indexes: gift_cards(code) UNIQUE, gift_card_transactions(gift_card_id, created_at)
      - Run migration: drizzle-kit push
    </details>
    <verification>migration runs clean on staging Cloud SQL instance</verification>
  </task>

  <task id="1.3" depends="1.2">
    <title>Issue and Balance endpoints</title>
    <details>
      - POST /gift-cards: issue new gift card, return code + QR
      - GET /gift-cards/:code/balance: return current balance_cents
      - Auth: trust x-groupon-user-id from Gateway header
      - Validation: amount_cents > 0, expires_at in the future
    </details>
    <verification>curl tests against staging; 201 on issue, 200 on balance, 404 on unknown code</verification>
  </task>
</tasks>
```

---

## Step 4 — `/gsd:execute-phase 1`

### Wave Execution

```
Wave 1 (parallel — no deps):
  [Agent A] Task 1.1 — scaffold Cloud Run service
  → fresh 200k context, atomic commit per sub-task

Wave 2 (after 1.1 done):
  [Agent B] Task 1.2 — schema and migrations
  → reads 1.1 output, writes Drizzle schema

Wave 3 (after 1.2 done):
  [Agent C] Task 1.3 — Issue + Balance endpoints
  → reads schema, writes API handlers
```

**STATE.md after Phase 1:**
```markdown
## Phase 1 — Status: DONE (2026-03-14)

### Completed
- [x] 1.1 Cloud Run service scaffolded — commit abc1234
- [x] 1.2 Schema migrated — commit def5678
- [x] 1.3 Issue + Balance endpoints live — commit ghi9012

### Next
Phase 2: Redemption flow
- Start: /gsd:discuss-phase 2
- Context: plans/CONTEXT.md has auth and Continuum wrapper decisions
```

---

## Step 5 — `/gsd:verify-work 1`

### Verification Checklist

```
[ ] POST /gift-cards → 201 + code returned
[ ] GET /gift-cards/:code/balance → 200 + correct amount
[ ] GET /gift-cards/invalid-code/balance → 404
[ ] /healthz → 200
[ ] Drizzle migration runs clean (no errors in Cloud SQL logs)
[ ] encore-gateway routes requests correctly (x-groupon-user-id present in logs)
```

All 6 items verified ✅. Phase 1 complete.

---

## Key GSD Benefits Demonstrated

| Problem | How GSD Prevented It |
|---------|---------------------|
| Forgetting the auth pattern in session 3 | `plans/CONTEXT.md` preserves the Gateway decision |
| Agent re-asking what database to use | `plans/PROJECT.md` specifies postgres-encore-gift-cards |
| Scope creep into Continuum migration | `plans/ROADMAP.md` gates that to Phase 3 |
| Phase 2 starting without context | `plans/STATE.md` tells Phase 2 exactly where Phase 1 left off |
| Skipping the Continuum wrapper decision | `/gsd:discuss-phase` forced it before planning began |
