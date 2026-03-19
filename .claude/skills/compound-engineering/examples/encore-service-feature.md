# Example: Adding a Feature to an Encore Service

> Scenario: Add a `status` field and `PATCH /api/v1/deals/:id/status` endpoint
> to `encore-deals`. Uses the full /ce:plan → /ce:work → /ce:review → /ce:compound cycle.

---

## /ce:plan

**Step 1 — Architecture Query**

```bash
node context/scripts/query-manifest.mjs system encore-deals
```

Output: encore-deals owns `deals` table (PostgreSQL), exposes REST API via encore-gateway, consumed by MBNXT and B2B checkout. No existing status field.

**Step 2 — Plan written to `plans/.planning/deal-status-plan.md`**

```
Steps:
1. Add `status` column to deals table (Drizzle migration)
   - Type: pgEnum('deal_status', ['active', 'paused', 'expired'])
   - Default: 'active', not null
   - Files: drizzle/0004_add_deal_status.ts, src/db/schema.ts

2. Add PATCH endpoint
   - Route: PATCH /api/v1/deals/:id/status
   - Auth: JWT, requires 'deals:write' scope
   - Request: { status: DealStatus }
   - Response: updated Deal object
   - Files: src/handlers/update-deal-status.ts, src/routes.ts

3. Emit deal.status.changed.v1 Kafka event via encore-topics
   - Files: src/events/deal-status-changed.ts

4. Add tests
   - Files: src/handlers/__tests__/update-deal-status.test.ts
```

**Checked in with user: approved.**

---

## /ce:work

```bash
# Working in git worktree to isolate changes
git worktree add ../.claude-worktrees/deal-status feature/deal-status
```

**Commit 1:** `feat(encore-deals): add deal_status enum and migration`
- `drizzle/0004_add_deal_status.ts` — migration adding column + enum
- `src/db/schema.ts` — Drizzle schema updated

**Commit 2:** `feat(encore-deals): add PATCH /deals/:id/status endpoint`
- `src/handlers/update-deal-status.ts` — handler implementation
- `src/routes.ts` — route registered

**Commit 3:** `feat(encore-deals): emit deal.status.changed.v1 event`
- `src/events/deal-status-changed.ts` — event publisher

**Commit 4:** `test(encore-deals): add status update handler tests`
- `src/__tests__/update-deal-status.test.ts` — 8 test cases

---

## /ce:review

Three perspectives applied:

**Correctness:** Status transition validation missing — `expired` should not transition to `active`. Added guard in handler. ✅ Fixed.

**Security:** `deals:write` scope check present. Status field not logged with PII. ✅ OK.

**Code quality:** `updateDealStatus` function is 45 lines — could be split, but not a blocker. Added as suggestion. No premature abstraction introduced. ✅ OK.

**Tests:** 8 cases cover happy path, auth failure, 404, and invalid status. Missing: transition guard test. ✅ Added in follow-up commit.

**Verdict: APPROVED WITH NOTES** (transition guard added before merge)

---

## /ce:compound

**Lessons added to `improve/lessons.md`:**

```
- [2026-03-19] Encore status fields: always define allowed transitions explicitly
  in a const map, not as ad-hoc if-statements in the handler. Prevents invalid
  state transitions from slipping through code review.

- [2026-03-19] Drizzle pgEnum: add enum values to the schema file first,
  then reference in table definition — not inline. Makes re-use easier.
```

**Skill improvement note:** Added "status transition validation" as a standard checklist item in the /ce:review template.
