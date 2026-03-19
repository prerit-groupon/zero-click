# Feature Plan: [Feature Name]

> **Date:** YYYY-MM-DD
> **Engineer:** [name]
> **Skill:** /compound-engineering — /ce:plan phase
> **Estimated cycles:** 1 | 2 | 3

---

## Objective

<!-- One paragraph: what will be built, why it matters, and what done looks like. -->

---

## Architecture Query Results

```bash
# Run before planning — never design from memory
node context/scripts/query-manifest.mjs system [related-service]
```

<!-- Paste output or key findings -->

---

## Scope

**In scope:**
- [ ] Item 1
- [ ] Item 2

**Out of scope:**
- Item A (deferred to follow-up)
- Item B (owned by another team)

---

## Implementation Plan

### Step 1 — [Name]

**What:** Description of what changes.
**Why:** Why in this order / why this approach.
**Files:**
- `path/to/file.ts` — what changes
- `path/to/file.ts` — what changes

**Test:** How to verify this step is correct.

---

### Step 2 — [Name]

**What:**
**Why:**
**Files:**
**Test:**

---

### Step 3 — [Name]

**What:**
**Why:**
**Files:**
**Test:**

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| | | | |

---

## Definition of Done

- [ ] All steps complete and verified
- [ ] Tests pass (unit + integration)
- [ ] No TypeScript errors
- [ ] Reviewed with `/ce:review`
- [ ] Lessons captured with `/ce:compound`

---

## Commit Strategy

Each step = one atomic commit.
Format: `type(scope): description` (e.g. `feat(encore-deals): add deal status endpoint`)
