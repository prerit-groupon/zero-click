# Example: Encore Backend + MBNXT Frontend — Parallel Agent Build

> Scenario: Add a "Saved Deals" feature — user can bookmark deals from the consumer app.
> Backend: `encore-saved-deals` service (new). Frontend: MBNXT consumer app UI.

---

## Decision: Is This Multi-Agent?

| Check | Answer |
|-------|--------|
| Independent boundaries? | Yes — Encore backend and MBNXT frontend |
| Parallel buildable? | Yes — once contracts are written |
| One agent can do it? | No — each boundary requires platform expertise |

**Use /build-with-agent-team.**

---

## Step 1 — Architect Consultation

```
/platform-architect: Design encore-saved-deals service
```

Output: Service design doc at `plans/saved-deals-service-design.md`
- Owns: `saved_deals` table (Cloud SQL PostgreSQL)
- API: `POST /api/v1/saved-deals`, `GET /api/v1/saved-deals`, `DELETE /api/v1/saved-deals/:id`
- Event: `deal.saved.v1`, `deal.unsaved.v1` (Kafka — for analytics)
- Auth: JWT (end-user)

---

## Step 2 — Write Contracts (Lead Agent — Do Not Spawn Yet)

Created: `plans/saved-deals-contracts.md`

### REST Contracts

```typescript
// POST /api/v1/saved-deals
interface SaveDealRequest { dealId: string; }
interface SaveDealResponse { id: string; dealId: string; savedAt: string; }
// Errors: 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 409 ALREADY_SAVED

// GET /api/v1/saved-deals
interface GetSavedDealsResponse { items: SavedDeal[]; total: number; }
interface SavedDeal { id: string; dealId: string; savedAt: string; }

// DELETE /api/v1/saved-deals/:id
// 204 No Content | 404 NOT_FOUND | 401 UNAUTHORIZED
```

### Kafka Event Contracts

```typescript
interface DealSavedEvent {
  eventType: 'DealSaved';
  schemaVersion: '1';
  id: string; dealId: string; userId: string; savedAt: string;
  sourceService: 'encore-saved-deals';
}
```

**Marked contracts FINALISED at 2026-03-19 14:00 UTC.**

---

## Step 3 — Spawn Agents in Parallel

### Agent A Prompt (Backend)

```
You are a specialist agent implementing the Encore backend for the Saved Deals feature.

Your scope: encore-saved-deals/ (create this service)
Must NOT touch: apps/consumer/ (MBNXT)

Contracts: plans/saved-deals-contracts.md — locked. Do not deviate.

Tasks:
1. Scaffold encore-saved-deals service (Encore TypeScript)
2. Create Drizzle schema: saved_deals table (id, user_id, deal_id, created_at)
3. Implement POST, GET, DELETE endpoints per contracts
4. Publish deal.saved.v1 and deal.unsaved.v1 Kafka events via encore-topics
5. Write integration tests

Done when: tests pass, TypeScript compiles, all contract endpoints implemented.
```

### Agent B Prompt (Frontend)

```
You are a specialist agent implementing the MBNXT frontend for the Saved Deals feature.

Your scope: apps/consumer/src/features/saved-deals/
Must NOT touch: encore-saved-deals/ (backend)

Contracts: plans/saved-deals-contracts.md — use POST/GET/DELETE endpoints exactly as specified.
API base URL: process.env.NEXT_PUBLIC_API_URL + '/api/v1/saved-deals'

Tasks:
1. Create SaveDealButton component (toggles saved state)
2. Create SavedDealsPage (list view with remove)
3. Wire up API calls using contracts (use SWR for GET, optimistic updates)
4. Add to deal card component and nav

Done when: components render, API calls use contract shapes, no TypeScript errors.
```

---

## Step 4 — Parallel Execution

Both agents ran simultaneously in separate git worktrees:

```bash
git worktree add ../.claude-worktrees/saved-deals-backend feature/saved-deals-backend
git worktree add ../.claude-worktrees/saved-deals-frontend feature/saved-deals-frontend
```

Total wall-clock time: ~25 min (vs ~50 min sequential)

---

## Step 5 — Integration Verification

```
/agent-evaluation: Verify both agents satisfied saved-deals-contracts.md
```

Checks:
- [x] Backend `POST /api/v1/saved-deals` returns `{ id, dealId, savedAt }` — matches contract
- [x] Frontend calls POST with `{ dealId }` body — matches contract
- [x] 409 ALREADY_SAVED handled by frontend (shows "Already saved" toast)
- [x] Kafka events published with correct schema

**Verdict: PASS**

---

## Step 6 — Merge

```bash
git checkout main
git merge feature/saved-deals-backend
git merge feature/saved-deals-frontend
```

No conflicts — agents respected their boundaries.
