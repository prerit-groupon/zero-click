# Rubric Design Guide

## What Makes a Good Rubric Criterion

A criterion is well-formed when a third party can score it the same way you would, without asking for clarification.

**Bad (ambiguous):** "The code is clean"
**Good (specific):** "Each function has a single responsibility and is ≤40 lines"

**Bad (subjective):** "The architecture feels right"
**Good (verifiable):** "The service has its own dedicated database and does not read any other service's tables"

**Bad (binary when gradient is needed):** "The documentation exists"
**Good (graduated):** "The README includes: setup instructions, API shape, example request/response, and known limitations (score 1 per missing element, 5 = all present)"

---

## Hard Requirement vs. Quality Signal

**Hard requirement:** A binary check where FAIL means the output cannot be accepted regardless of quality scores.

Use for:
- Output format compliance ("TypeScript compiles without errors")
- Contract adherence ("POST /deals returns `{id, status, createdAt}` — no extra or missing fields")
- Security constraints ("No API keys in committed code")
- Groupon architectural rules ("No direct Continuum calls from Encore business logic")

**Quality signal:** A graduated score (1–5) representing how well the output meets a non-binary goal.

Use for:
- Completeness ("How much of the spec is implemented")
- Error handling ("How robustly edge cases are covered")
- Code clarity ("How understandable the logic is without inline comments")
- Test coverage ("How thoroughly happy path and error paths are tested")

---

## Criterion Count

- 3–5 hard requirements per task (fewer is better — each one you add is a potential FAIL)
- 3–5 quality signals per task
- Total: 6–10 criteria; beyond 10 becomes expensive to evaluate and harder to calibrate

---

## Writing Anchor Examples for Quality Signals

Anchors prevent LLM score inflation. For each quality signal, write what a 1, 3, and 5 look like:

```markdown
## Quality Signal: Error Handling

Score the robustness of error handling in the agent's output.

| Score | Description |
|-------|-------------|
| 5 | All error paths handled explicitly: validation errors return 400 with field-level messages; not-found returns 404; auth failures return 401; unexpected errors return 500 with a correlation ID and no stack trace in response |
| 3 | Happy path works; common error cases (not-found, invalid input) return appropriate status codes; missing correlation IDs and some edge cases unhandled |
| 1 | No error handling; all failures return 500 or throw unhandled exceptions |
```

---

## Groupon-Specific Rubric Elements

Include these hard requirements in any Encore service rubric:

```markdown
## Hard Requirements

- [ ] **Service definition exists:** `encore.service.ts` present at service root
- [ ] **Data isolation:** No imports from another service's database schema
- [ ] **Typed wrapper only:** No `fetch()` or `axios` calls to Continuum URLs (all Continuum calls via typed wrapper)
- [ ] **TypeScript clean:** `npx encore build` exits 0
- [ ] **No leaked secrets:** No API keys, tokens, or passwords in committed files
```

Include these quality signals in any Encore service rubric:

```markdown
## Quality Signals (score 1–5)

- **Completeness:** How much of the specified API surface is implemented?
- **Error handling:** How robustly are validation, not-found, and auth errors handled?
- **Data model:** How well does the Drizzle schema match the domain (correct types, indexes, constraints)?
- **Test coverage:** Are happy path and key error paths covered by tests?
```
