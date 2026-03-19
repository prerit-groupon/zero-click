---
description: "Binary checklist for evaluating context quality. Score interactions to drive improvements. Aligned with the observe → inspect → amend → evaluate self-improvement cycle."
---

# Context Quality Scoring Criteria

Score each interaction using yes/no questions. Track scores in `observations/log.jsonl`.

## Navigation — Did the agent find what it needed efficiently?

1. Did the agent start with INDEX.md? (yes/no)
2. Did the agent route to the correct domain on first try? (yes/no)
3. Did the agent read ≤5 files to answer the question? (yes/no)
4. Did the agent use repositories.json for repo lookup (not guessing)? (yes/no)

## Accuracy — Was the output correct?

5. Did the agent reference the correct runbook for the symptom? (yes/no)
6. Did the agent use accurate URLs/endpoints from references? (yes/no)
7. Did the agent avoid hallucinating commands, tools, or configurations? (yes/no)
8. Did the agent check gotchas before giving advice? (yes/no)

## Completeness — Did the agent cover everything needed?

9. Did the agent mention relevant cross-domain dependencies? (yes/no)
10. Did the agent provide actionable next steps (not just descriptions)? (yes/no)

## Self-Improvement — Is the system learning?

11. Did the agent log an observation after the interaction? (yes/no)
12. If something was wrong or missing, did the agent propose an update? (yes/no)

## Scoring

- **10-12 passing**: Context is working well. Minor refinements only.
- **7-9 passing**: Gaps exist. Review failing criteria and update relevant files.
- **Below 7**: Significant gaps. Run a full review of routing rules and domain MOCs.

## Amendment Process (from Vasilije's self-improving skills pattern)

When score drops below 7 for 3+ interactions:

1. **Inspect**: Which criteria keep failing? Group by category.
2. **Amend**: Propose a targeted change to the specific file causing failures.
3. **Evaluate**: Run the same type of task again. Did the score improve?
4. **Keep or revert**: If improved → keep and log in changelog. If not → revert and try a different amendment.
