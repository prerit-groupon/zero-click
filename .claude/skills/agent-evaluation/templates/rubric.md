# Evaluation Rubric — [FEATURE NAME]

> Fill this in BEFORE spawning agents. Save to `plans/<feature>-rubrics.md`.

## Agent: [AGENT NAME / ROLE]
**Task:** [one-sentence description of what this agent was asked to build]
**Output location:** `plans/<feature>-outputs/<agent-name>/`

---

## Hard Requirements (FAIL on any violation)

| # | Criterion | How to check |
|---|-----------|--------------|
| H1 | [e.g., TypeScript compiles: `npx encore build` exits 0] | Run build command |
| H2 | [e.g., API endpoint returns `{id, status, createdAt}` — no extra or missing fields] | HTTP request + shape check |
| H3 | [e.g., No direct Continuum calls — all calls via typed wrapper] | Grep for `fetch(` / `axios.` targeting Continuum URLs |
| H4 | [e.g., Service has its own `encore.service.ts` at root] | File existence check |
| H5 | [e.g., No secrets committed: no API keys in `git diff`] | `git diff` grep for known patterns |

---

## Quality Signals (score 1–5 each)

### Q1: Completeness
How much of the specified API surface / feature scope is implemented?

| Score | Anchor |
|-------|--------|
| 5 | All specified endpoints / behaviours implemented and tested |
| 3 | Core path implemented; edge cases missing or stubbed |
| 1 | Less than half the spec is implemented |

### Q2: Error Handling
How robustly are validation, not-found, and unexpected errors handled?

| Score | Anchor |
|-------|--------|
| 5 | All error paths explicit: 400 with field errors, 404 for not-found, 401 for auth failures, 500 with correlation ID, no stack trace in response |
| 3 | Common errors return correct status codes; missing field-level detail and correlation IDs |
| 1 | No error handling; all failures return 500 or throw unhandled |

### Q3: [Add a domain-specific signal, e.g., "Data Model Quality"]
[Description]

| Score | Anchor |
|-------|--------|
| 5 | [what excellent looks like] |
| 3 | [what acceptable looks like] |
| 1 | [what poor looks like] |

### Q4: [Add another, e.g., "Test Coverage"]
[Description]

| Score | Anchor |
|-------|--------|
| 5 | [what excellent looks like] |
| 3 | [what acceptable looks like] |
| 1 | [what poor looks like] |

---

## Scoring Thresholds

| Mean quality score | Verdict |
|-------------------|---------|
| ≥ 3.5 | PASS (all hard requirements also must pass) |
| 2.5 – 3.4 | NEEDS_REVISION |
| < 2.5 | FAIL |

Any single hard requirement FAIL → overall verdict = FAIL regardless of quality scores.

---

## Notes

[Any context the judge needs to score correctly — link to contracts doc, known limitations, etc.]
