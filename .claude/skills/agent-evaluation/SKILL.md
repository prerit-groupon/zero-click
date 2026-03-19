---
name: agent-evaluation
description: >-
  Evaluate spawned agent outputs using LLM-as-judge patterns, rubric scoring, and
  constraint satisfaction. Use this skill to judge whether a sub-agent completed its task
  correctly — for build-with-agent-team integration checks, CI quality gates, automated
  review pipelines, and architecture decision validation.
  NOT for human code review (use /compound-engineering /ce:review), single-file checks
  (use /second-opinion), or observability/metrics work (use /observability).
---

# Agent Evaluation

## Philosophy: Trust, But Verify with a Written Rubric

Spawned agents are autonomous — they succeed or fail without supervision. The only way to know the difference is to evaluate their output against explicit, pre-written criteria. Evaluation rubrics must be written *before* agents run, not after. Post-hoc rubrics are rationalisation, not evaluation.

**Before evaluating any agent output, ask:**
- What was the agent asked to produce? (check contracts doc or task description)
- What constitutes a passing output — specifically, not just "looks right"?
- Which criteria are hard requirements (fail on any violation) vs. soft quality signals?
- Who or what is the judge — another Claude instance, a script, or a human?

The output of evaluation is a structured verdict: PASS / FAIL / NEEDS_REVISION, with specific findings mapped to specific rubric criteria.

---

## When to Use This Skill

| Situation | Use |
|-----------|-----|
| Verifying a spawned agent completed its task correctly | **This skill** |
| Checking multi-agent integration contracts are satisfied | **This skill** |
| Automated CI quality gate for agent-generated code or docs | **This skill** |
| Designing rubrics before spawning agents in `build-with-agent-team` | **This skill** |
| Architecture review of a proposed design | `/second-opinion` or `/enterprise-architect` |
| Pre-merge code review of a feature | `/compound-engineering /ce:review` |
| Running observability checks | `/observability` |

## When NOT to Use This Skill

| Situation | Use Instead |
|-----------|-------------|
| Human-to-human code review | `/compound-engineering /ce:review` |
| Quick one-off review of a single file or decision | `/second-opinion` |
| Evaluating business metrics or cost anomalies | `/cloud-cost-optimizer` |
| Assessing architectural correctness of a new design | `/enterprise-architect` or `/platform-architect` |

---

## Core Concepts

### Evaluation Modes

| Mode | When to Use | Judge |
|------|-------------|-------|
| **Rubric scoring** | Agent produced structured output (code, doc, schema) | LLM-as-judge with scored criteria |
| **Constraint satisfaction** | Agent must not violate specific rules | Deterministic checker (script or LLM) |
| **Contract verification** | Multi-agent integration — did agent build to the agreed interface? | Contract diff + LLM judge |
| **Exact match** | Agent produced a deterministic output (SQL, config, command) | Script comparison |
| **Semantic equivalence** | Agent paraphrased a correct answer | LLM-as-judge with reference answer |

### Verdict Levels

- **PASS** — All hard requirements met; quality signals are acceptable
- **NEEDS_REVISION** — No hard requirement violations, but quality signals below threshold; return to agent with specific feedback
- **FAIL** — One or more hard requirements violated; task must be re-run from scratch

---

## Rubric Design

A rubric has three parts: **criteria**, **weight** (hard vs. soft), and **scoring scale**.

### Criterion Types

**Hard requirements (FAIL on any violation):**
- Output exists and is in the expected format
- No forbidden patterns (e.g., direct Continuum calls from Encore, new Teradata dependencies)
- Contract fields match exactly (API shape, event schema, status codes)
- Security constraints met (no PII in logs, auth boundary respected)

**Quality signals (scored 1–5, aggregate to PASS/NEEDS_REVISION):**
- Completeness — does the output cover all requirements?
- Correctness — is the logic sound?
- Consistency — does it match existing patterns in the codebase?
- Clarity — is it understandable without additional context?

### Scoring Threshold

Default: mean quality score ≥ 3.5 → PASS; 2.5–3.4 → NEEDS_REVISION; < 2.5 → FAIL

Adjust thresholds in your rubric file for the specific task. See `templates/rubric.md`.

---

## LLM-as-Judge Pattern

Use a separate Claude instance (not the agent being evaluated) to score outputs.

### Step 1: Prepare the judge prompt

```
You are an evaluator. Your job is to score the following agent output against the rubric below.
Do not infer intent. Score only what is present in the output.

## Task the agent was given:
<task>

## Agent output:
<output>

## Rubric:
<rubric>

## Instructions:
- Score each criterion separately
- For hard requirements: PASS or FAIL with one sentence of evidence
- For quality signals: score 1–5 with one sentence of evidence
- Output JSON: { "hard": [{"criterion": "...", "verdict": "PASS|FAIL", "evidence": "..."}], "quality": [{"criterion": "...", "score": N, "evidence": "..."}], "overall": "PASS|NEEDS_REVISION|FAIL", "summary": "..." }
```

### Step 2: Run the judge

```bash
python scripts/evaluate.py \
  --task "path/to/task-description.md" \
  --output "path/to/agent-output/" \
  --rubric "path/to/rubric.md" \
  --model claude-sonnet-4-6
```

See `scripts/evaluate.py` for implementation.

### Step 3: Handle the verdict

| Verdict | Action |
|---------|--------|
| PASS | Proceed — agent output accepted |
| NEEDS_REVISION | Send specific findings back to the same agent with: "Fix the following: [findings]" |
| FAIL | Re-run the agent from scratch; do not patch a failed output |

---

## Contract Verification (Multi-Agent)

After running `build-with-agent-team`, verify each agent built to the agreed contracts.

### Automated contract check

For REST API contracts:
```python
# Check response shape matches contract
import requests, json
response = requests.post(endpoint, json=payload)
assert response.status_code == expected_status
assert set(response.json().keys()) == set(expected_fields)
```

For Encore Topic event contracts:
```typescript
// Type-check event shape at compile time — TypeScript will catch mismatches
const event: DealCreatedEvent = publishedEvent; // fails if schema diverged
```

For GraphQL contracts:
```bash
# Schema diff against the agreed contract
npx graphql-inspector diff schema.graphql expected-schema.graphql
```

### LLM contract review

For contracts that cannot be checked programmatically (e.g., code structure, naming, documentation):

1. Paste the contracts doc into the judge prompt
2. Ask: "Does the agent output satisfy every field in the contract? List any deviations."
3. Any deviation is a FAIL on the hard requirement for that contract field

---

## Groupon-Specific Evaluation Criteria

When evaluating agent outputs in the Groupon context, always check:

### For Encore service tasks
- [ ] Service has `encore.service.ts` — not just a route file
- [ ] Owns its own PostgreSQL instance via Encore's database primitive
- [ ] No cross-service database access
- [ ] Uses Encore shared infra (Gateway, AuthN/Z, Topics) — not custom implementations
- [ ] No direct Continuum calls — goes through typed wrapper
- [ ] TypeScript compiles cleanly (`npx encore build`)

### For Continuum wrapper tasks
- [ ] Wrapper is in `apps/encore-ts/` under the correct domain
- [ ] Translates Continuum's REST/JSON to typed TypeScript interface
- [ ] Does not leak Continuum data model into caller
- [ ] Error mapping covers Continuum's error response patterns

### For data pipeline tasks
- [ ] Targets BigQuery, not Teradata
- [ ] Source, transformations, and destination are all documented
- [ ] PII handling is explicit — masked or encrypted at every stage
- [ ] Pipeline registered in OpenMetadata

### For MBNXT frontend tasks
- [ ] SSR pages use `getServerSideProps` or App Router `async` components — not client-side fetching for initial data
- [ ] GraphQL queries are typed via generated types
- [ ] i18n strings go through the translation system — no hardcoded English

---

## Workflow: Evaluate an Agent Team

```
1. Write rubrics (before spawning agents)
      plans/<feature>-rubrics.md

2. Spawn agents (via /build-with-agent-team)

3. Collect outputs
      plans/<feature>-outputs/
        agent-1-encore-service/
        agent-2-mbnxt-frontend/
        agent-3-infra/

4. Run contract verification (automated)
      python scripts/evaluate.py --mode contract ...

5. Run rubric scoring (LLM judge per agent)
      python scripts/evaluate.py --mode rubric --agent 1 ...
      python scripts/evaluate.py --mode rubric --agent 2 ...

6. Consolidate verdicts
      plans/<feature>-eval-report.md

7. Act on verdicts
      PASS     → merge / deploy
      NEEDS_REVISION → return specific findings to agent, re-run task only
      FAIL     → re-run agent from scratch with improved task description
```

---

## Common Anti-Patterns

**Writing the Rubric After Seeing the Output** — Post-hoc rubrics are rationalisation. You will unconsciously write criteria that the output satisfies. Rubrics must be written from the task description before the agent runs.

**Treating NEEDS_REVISION as PASS** — "It's mostly right" is not a verdict. If the quality signals average below 3.5, the agent needs to revise. Accepting sub-threshold output compounds into poor final quality when multiple agents are in play.

**Patching a FAIL Output** — When an agent produces a FAIL (hard requirement violated), do not patch the output manually. Re-run the agent with an improved task description that makes the violated requirement explicit. Patched FAILs introduce unreviewed changes outside the agent's documented scope.

**Using the Same Claude Instance to Judge Its Own Output** — LLM-as-judge only works when the judge is independent of the author. The evaluating Claude instance must not have seen the task prompt that produced the output.

**Skipping Evaluation Under Time Pressure** — "We'll check it in review" means the review is now doing two jobs: feature review AND agent evaluation. Contract violations found late are expensive. Evaluation is fastest immediately after the agent run, before the context is lost.

---

## References

| File | When to Read |
|------|-------------|
| `references/llm-judge-patterns.md` | Detailed judge prompt engineering, calibration, inter-rater reliability |
| `references/rubric-design.md` | How to write criteria that are unambiguous and scoreable |
| `references/evaluation-criteria.md` | Taxonomy of criterion types with examples for each task class |

## Templates

| File | Use |
|------|-----|
| `templates/rubric.md` | Blank rubric — copy and fill per task before spawning agents |
| `templates/eval-report.md` | Evaluation report output format |

## Artefact Locations

| Artefact | Location |
|----------|----------|
| Task rubrics | `plans/<feature>-rubrics.md` |
| Agent outputs | `plans/<feature>-outputs/` |
| Evaluation reports | `plans/<feature>-eval-report.md` |
| Evaluation script | `.claude/skills/agent-evaluation/scripts/evaluate.py` |
