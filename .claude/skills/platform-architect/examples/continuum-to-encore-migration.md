# Example: Continuum → Encore Migration — Deal Status Service

> Scenario: Migrating `DealStatusService` from Continuum to Encore.
> Pattern: Encore wrapper → phased data migration → Continuum decommission.

---

## Step 1 — Understand the Current State

```bash
node context/scripts/query-manifest.mjs system continuum-commerce
node context/scripts/query-manifest.mjs search "deal status"
```

**Findings:**
- `DealStatusService` in `continuum-commerce` — 3 endpoints consumed by MBNXT and B2B
- Data: `deal_statuses` table in MySQL shared cluster (`commerce_db`)
- 14 Continuum services reference this service internally
- MBNXT calls `/v1/deals/:id/status` directly

---

## Step 2 — Determine Migration Pattern

| Factor | Value | Implication |
|--------|-------|-------------|
| Consumers | MBNXT + B2B + 14 Continuum services | High blast radius — must not break |
| Data volume | 8M rows | Needs one-time migration script |
| Business logic | Status transitions + audit log | All logic moves to Encore |
| Timeline | 2 quarters | Phase 1: wrapper. Phase 2: data migration. Phase 3: decommission |

**Decision: Strangler Fig via Encore Wrapper**

Not a big-bang migration. MBNXT and external B2B calls route through the new Encore service immediately. Internal Continuum calls remain on Continuum until migrated individually.

---

## Step 3 — Phase 1: Encore Wrapper (Current Phase)

Create `encore-deal-status` as a thin wrapper over Continuum's `DealStatusService`.

**Architecture:**
```
MBNXT ──────────────────────────────→ encore-deal-status (new)
B2B API ─────────────────────────────→     │
                                           │ calls Continuum internally
Continuum services (14) ──────→ continuum-commerce (existing)
```

**Service design:**

```
encore-deal-status/
├── src/
│   ├── handlers/
│   │   ├── get-deal-status.ts      # GET /api/v1/deals/:id/status
│   │   └── update-deal-status.ts  # PATCH /api/v1/deals/:id/status
│   ├── continuum-client.ts         # Typed wrapper over Continuum HTTP API
│   └── db/
│       └── schema.ts               # Encore PostgreSQL — audit log only (Phase 1)
```

**Key decision:** In Phase 1, encore-deal-status does NOT own the status data. It proxies to Continuum and adds:
- Response caching (Redis via encore-cache-manager, TTL 30s)
- Audit log in its own PostgreSQL (required for Encore ORR compliance)
- Typed API contract (removes Continuum's untyped response format)

---

## Step 4 — API Contract (Locked Before Implementation)

```typescript
// GET /api/v1/deals/:id/status
interface GetDealStatusResponse {
  dealId: string;
  status: 'active' | 'paused' | 'expired' | 'draft';
  updatedAt: string;        // ISO 8601
  updatedBy: string | null; // accountId or null for system
}

// PATCH /api/v1/deals/:id/status
interface UpdateDealStatusRequest {
  status: 'active' | 'paused' | 'expired';
  reason?: string;
}
interface UpdateDealStatusResponse extends GetDealStatusResponse {}

// Errors: 400 INVALID_TRANSITION, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND
```

---

## Step 5 — Phase 2: Data Migration (Next Quarter)

1. Run one-time migration script: `scripts/migrate-deal-statuses.ts`
   - Copy 8M rows from MySQL `deal_statuses` → Encore PostgreSQL `deal_statuses`
   - Validate row counts match
   - Run in parallel read mode (Continuum still primary)

2. Switch encore-deal-status to read/write own PostgreSQL
3. Write-through to Continuum for 2 weeks (dual-write period)
4. Validate both databases stay in sync
5. Stop dual-write — Encore is primary

---

## Phase 3: Decommission (Future Quarter)

1. Remove all 14 Continuum service references to `DealStatusService`
2. Decommission Continuum `DealStatusService`
3. Drop `deal_statuses` MySQL table (after backup + 30-day hold)
4. Remove Encore's Continuum client

---

## Files Created

```
plans/
├── deal-status-migration-design.md   ← This design doc
├── deal-status-adr.md               ← ADR-007: Strangler fig via Encore wrapper
└── deal-status-contracts.md         ← API contract (locked)

encore-deal-status/                  ← New Encore service (Phase 1)
```
