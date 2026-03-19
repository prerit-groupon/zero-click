# Example: Evaluating an Encore Service Agent

## Scenario

`build-with-agent-team` spawned two agents for a "deal creation" feature:
- Agent 1: Encore backend `deal-service`
- Agent 2: MBNXT frontend `deals/create` page

This example shows how to evaluate Agent 1 (Encore service).

---

## Step 1: Rubric (written before agents ran)

Saved to `plans/deal-creation-rubrics.md` (Agent 1 section):

```markdown
## Agent 1: Encore Backend — deal-service

Hard Requirements:
- H1: encore.service.ts exists at apps/encore-ts/deal-service/encore.service.ts
- H2: POST /deals returns {id: UUID, status: "draft"|"active", createdAt: ISO8601} — no other fields
- H3: No direct fetch() or axios calls to Continuum URLs (use typed wrapper only)
- H4: npx encore build exits 0

Quality Signals:
- Q1 Completeness: POST /deals and GET /deals/:id both implemented
- Q2 Error Handling: 400 with field-level errors, 404 for not-found, 401 for auth failure
- Q3 Data Model: Drizzle schema with UUID pk, correct field types, merchantId index
- Q4 Test Coverage: at least one test each for create success, validation failure, not-found
```

---

## Step 2: Run evaluation

```bash
python .claude/skills/agent-evaluation/scripts/evaluate.py \
  --task plans/deal-creation-task-agent1.md \
  --output plans/deal-creation-outputs/agent-1-deal-service/ \
  --rubric plans/deal-creation-rubrics.md \
  --agent "Agent 1: deal-service"
```

---

## Step 3: Example output

```
# Evaluation Report — Agent 1: deal-service
**Verdict:** ⚠️ NEEDS_REVISION
**Mean quality score:** 3.25 / 5.0

## Summary
The service compiles and the POST endpoint returns the correct shape. However, error
handling is minimal and test coverage is missing for the not-found case.

## Hard Requirements
- ✅ **encore.service.ts exists**: File present at apps/encore-ts/deal-service/encore.service.ts
- ✅ **POST /deals response shape**: Returns {id, status, createdAt} — verified in handler return type
- ✅ **No direct Continuum calls**: No fetch() or axios imports found in service files
- ✅ **TypeScript build**: npx encore build exits 0

## Quality Signals
- **Completeness**: 4/5 ████░ — POST /deals and GET /deals/:id both implemented; DELETE missing but not required
- **Error handling**: 2/5 ██░░░ — 400 returned for invalid input but no field-level detail; 404 present; 401 missing entirely
- **Data model**: 4/5 ████░ — Drizzle schema correct; merchantId index present; updatedAt field missing
- **Test coverage**: 3/5 ███░░ — Create success and validation failure tested; no test for not-found path

## Revision Instructions
Fix the following and resubmit:
1. Add 401 handling for requests where Encore Gateway does not populate x-groupon-user-id header
2. Return field-level error detail on 400: {errors: [{field: "title", message: "required"}]}
3. Add test for GET /deals/:id with non-existent ID — should return 404
```

---

## Step 4: Return to agent

Send verdict + revision instructions back to Agent 1:

```
Your evaluation result: NEEDS_REVISION

Fix these specific issues, then resubmit:
1. Add 401 handling: when x-groupon-user-id header is absent, return HTTP 401 with {error: "unauthenticated"}
2. Improve 400 responses: include field-level error detail — {errors: [{field: string, message: string}]}
3. Add test: GET /deals/:id where id does not exist → should return 404

Do not change anything else. The passing items are correct.
```

---

## Notes

- The rubric was written from the contracts doc (`plans/deal-creation-contracts.md`) before the agent ran
- Hard requirements all passed — only quality signals drove NEEDS_REVISION
- Revision instructions are specific enough for the agent to act without further clarification
- After revision, re-run the evaluator; if quality mean reaches ≥3.5, verdict becomes PASS
