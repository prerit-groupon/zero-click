# Example: Architecture Review via Second Opinion

> Scenario: Reviewing a proposed Encore service design for a new Gift Cards feature.
> The proposal suggests sharing a database between encore-gift-cards and encore-payments.

---

## Step 1 — Gather Context

```bash
node context/scripts/query-manifest.mjs search "gift card"
node context/scripts/query-manifest.mjs search "payment"
node context/scripts/query-manifest.mjs depends-on "encore-payments"
```

**Output (abbreviated):**
```
search "gift card": 0 results — no existing gift card service
search "payment": encore-payments (ID:7605), continuum-payments (ID:412)
depends-on encore-payments: encore-orders, encore-checkout, encore-accounts
```

---

## Step 2 — The Proposal Under Review

```
Proposal: encore-gift-cards service
- Owns: gift card issuance, redemption, balance tracking
- Database: share encore-payments Cloud SQL instance (for transactional consistency)
- Auth: calls encore-authn directly (not via Gateway)
- Continuum integration: reads payment history from MySQL directly
```

---

## Step 3 — Run the Review

```bash
claude -p "You are a senior Groupon platform engineer reviewing the following architecture proposal.
Be critical and specific. List concrete issues — not vague concerns.

Output format: Strengths / Concerns / Recommendations

Groupon architecture context:
- encore-payments (ID:7605): owns Cloud SQL postgres-encore-payments; consumers: encore-orders, encore-checkout, encore-accounts
- No existing gift card service
- Continuum payments (ID:412): MySQL cluster commerce_db, shared schema

Proposal:
encore-gift-cards service:
- Owns: gift card issuance, redemption, balance tracking
- Database: share encore-payments Cloud SQL instance
- Auth: calls encore-authn directly, not via Encore Gateway
- Continuum integration: reads payment history from MySQL directly

Check specifically:
- Platform alignment: is this on Encore (correct for new B2B logic)?
- Data ownership: does each service own exactly one database?
- Integration boundaries: are typed wrappers used for Continuum calls?
- Migration direction: does this move toward Encore?
- Shared services: Gateway used correctly?
"
```

---

## Step 4 — Sample Review Output

```
## Strengths

- Correct platform choice: new business logic belongs on Encore, not Continuum.
- Clear bounded context: gift card issuance, redemption, and balance are one coherent domain.
- TypeScript/Cloud Run/PostgreSQL stack aligns with Encore standards.

## Concerns

**Critical:**
1. **Shared database violation.** The proposal shares encore-payments' Cloud SQL instance.
   This violates the service-owns-database pattern. If encore-payments has a schema change,
   encore-gift-cards deployment becomes coupled to it. Gift cards must get their own dedicated
   Cloud SQL instance (postgres-encore-gift-cards).

2. **Direct Continuum MySQL access.** Reading payment history directly from MySQL
   violates the anti-corruption layer pattern. This creates a direct Encore→Continuum
   database dependency — the opposite direction of the migration. Use a typed Continuum
   wrapper (encore-payments-continuum-wrapper) or add gift card redemption to the existing
   encore-payments service's API.

**High:**
3. **Auth bypass.** Calling encore-authn directly bypasses the Encore Gateway. All inbound
   requests must enter via encore-gateway, which extracts the auth token and populates
   x-groupon-user-id. Direct calls to encore-authn from a service are not the approved pattern.

## Recommendations

1. Create dedicated Cloud SQL instance: postgres-encore-gift-cards. No shared instances.
2. Check if encore-payments-continuum-wrapper exists:
   `node context/scripts/query-manifest.mjs tag Wrapper`
   If yes, route payment history reads through it. If not, create the wrapper.
3. Remove direct encore-authn call. Route all inbound requests through encore-gateway.
   encore-gift-cards should trust the x-groupon-user-id header — not re-validate tokens.
4. Add this proposal to the architectural review queue before implementation begins.
```

---

## What Changed After Review

- Dedicated Cloud SQL instance added to design ✅
- Continuum wrapper added (reused existing encore-payments wrapper) ✅
- Auth via Gateway confirmed, direct authn call removed ✅
- ADR written documenting the database ownership decision ✅
