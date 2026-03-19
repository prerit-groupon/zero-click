# Skill Graph Scoring Criteria

This document defines the 12-question scoring framework for evaluating interactions with the Groupon Cloud Platform context. Each question is a yes/no answer. Higher scores indicate better performance.

## Scoring Framework

### Navigation (4 questions)

**Question 1: Did the agent start by consulting INDEX.md?**
- YES (1 point): Agent read or referenced INDEX.md to understand context structure
- NO (0 points): Agent jumped directly into questions without understanding structure

**Question 2: Did the agent navigate to the correct domain MOC?**
- YES (1 point): Agent identified and read the relevant domain (cloud-foundation, kubernetes-platform, etc.)
- NO (0 points): Agent wandered through unrelated domains or skipped domain MOC entirely

**Question 3: Did the agent limit exploration to ≤5 files for the task?**
- YES (1 point): Agent efficiently found information with minimal file reads (≤5)
- NO (0 points): Agent read >5 files, suggesting inefficient search strategy

**Question 4: Did the agent reference repositories.json or DEPENDENCY_GRAPH.md?**
- YES (1 point): Agent consulted repo dependencies before making cross-repo recommendations
- NO (0 points): Agent ignored or didn't reference dependencies, risking incorrect advice

**Navigation Score = sum of answers (0-4)**

### Accuracy (4 questions)

**Question 5: Did the agent identify the correct repository?**
- YES (1 point): Agent named the right repo (e.g., hybrid-boundary for mTLS, gcp-landingzone for org governance)
- NO (0 points): Agent misidentified repo or said "I don't know which repo"

**Question 6: Did the agent apply the correct routing rule or concept?**
- YES (1 point): Agent gave advice aligned with documented gotchas or architecture (e.g., "always test in staging first")
- NO (0 points): Agent gave advice contradicting documented practices (e.g., "push directly to production")

**Question 7: Did the agent avoid hallucinations (making up details)?**
- YES (1 point): Agent's response matched documented facts or admitted uncertainty ("I don't see that documented")
- NO (0 points): Agent invented details not in context (e.g., "api-proxy uses gRPC" when it's actually Vert.x + .flexi)

**Question 8: Did the agent check gotchas before giving advice?**
- YES (1 point): Agent referenced gotchas/ documents when applicable (e.g., before routing changes: "test in staging first")
- NO (0 points): Agent gave advice without consulting gotchas (missed critical warnings)

**Accuracy Score = sum of answers (0-4)**

### Completeness (2 questions)

**Question 9: Did the agent note cross-repo dependencies?**
- YES (1 point): Agent mentioned or warned about coordinated changes (e.g., "hybrid-boundary-controller + cmf-helm-charts must change together")
- NO (0 points): Agent ignored dependencies (could result in broken deployments)

**Question 10: Did the agent provide actionable next steps?**
- YES (1 point): Agent gave a clear next step (e.g., "open PR to routing-config-staging, test with curl, then merge to production")
- NO (0 points): Agent stopped at explanation without actionable steps

**Completeness Score = sum of answers (0-4)**

### Self-Improvement (2 questions)

**Question 11: Did the agent log the interaction in observations/log.jsonl?**
- YES (1 point): Agent created or appended to observations log with timestamp, task, outcome
- NO (0 points): Agent did not log the interaction (lost data for improvement)

**Question 12: Did the agent propose a context update if a gap was found?**
- YES (1 point): Agent identified missing documentation and drafted an amendment (e.g., "add warning about X to gotchas/service-mesh.md")
- NO (0 points): Agent found a gap but did not propose updating context

**Self-Improvement Score = sum of answers (0-4)**

## Total Scoring

**Total Score = Navigation + Accuracy + Completeness + Self-Improvement**

**Range: 0-12 points**

### Scoring Bands

| Score | Grade | Interpretation | Action |
|-------|-------|---|---|
| 10-12 | A | Excellent navigation, accuracy, completeness, and self-awareness | Keep context as-is, celebrate improvements |
| 8-9 | B | Good performance with minor gaps | Log improvements, update context if patterns emerge |
| 5-7 | C | Acceptable but with notable gaps (missed gotchas, wrong repo, inefficient search) | Review failed question categories, update context to address gaps |
| 2-4 | D | Poor performance; significant guidance failures | Major context update needed, or agent needs retraining |
| 0-1 | F | Critical failures; unsafe or unusable guidance | Do not deploy context; requires major revision |

## Amendment Process

If a score is < 8:

1. **Identify failing questions** (which of the 12 scored poorly?)
2. **Categorize the gap:**
   - Navigation gaps → improve INDEX.md or domain MOCs
   - Accuracy gaps → add gotcha or clarify domain descriptions
   - Completeness gaps → document dependencies in DEPENDENCY_GRAPH.md
   - Self-Improvement gaps → not a context issue (agent behavior)
3. **Draft amendment** to affected documents
4. **Document in amendments/changelog.md** with date, failing question, and fix
5. **Re-test** the same scenario to verify improvement

## Example Scoring Scenario

**Scenario:** Agent asked "How do I add a new microservice to the platform?"

| # | Question | Answer | Points |
|---|----------|--------|--------|
| 1 | Consulted INDEX.md? | YES | 1 |
| 2 | Correct domain (application-deployment)? | YES | 1 |
| 3 | ≤5 files read? | YES (3 files) | 1 |
| 4 | Checked DEPENDENCY_GRAPH.md? | NO | 0 |
| 5 | Correct repo (cmf-helm-charts)? | YES | 1 |
| 6 | Correct routing/concept? | YES (helm + HBU CRD) | 1 |
| 7 | Avoid hallucinations? | YES | 1 |
| 8 | Checked gotchas? | NO (missed HTTP/2 opt-in warning) | 0 |
| 9 | Cross-repo deps noted? | YES (mentioned service-mesh) | 1 |
| 10 | Actionable next steps? | YES | 1 |
| 11 | Logged interaction? | NO | 0 |
| 12 | Proposed update? | NO | 0 |

**Total: 8/12 (Grade B)** — Good but needs to check gotchas and log interaction

**Amendment:** Add clearer gotchas for HTTP/2 to application-deployment.md or domain/service-mesh.md

---

## Using This Framework

- **Weekly Review:** Pick a representative interaction from the past week, score it
- **Trending:** Track which questions consistently fail (e.g., "agents never check gotchas")
- **Context Evolution:** Use failing scores to prioritize documentation improvements
- **Self-Improving Skill:** Update context based on amendment process, re-score similar scenarios
