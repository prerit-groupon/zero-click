---
name: skill-creator
description: Create and iteratively improve Claude skills for this workspace. Use this skill when building a new Groupon-specific skill from scratch, refining an existing SKILL.md, writing test cases, or running evaluation workflows. Always check existing skills for overlap before creating a new one — the workspace already has skills for architecture (5 architects), workflow (compound-engineering, get-shit-done, build-with-agent-team), infrastructure (postgres, kubernetes-specialist), and utilities (second-opinion, new-project).
---

# Skill Creator

Source: https://skills.sh/anthropics/skills/skill-creator

## Existing Skills — Check Before Creating

| Skill | Owns |
|-------|------|
| `enterprise-architect` | Cross-platform strategy, Continuum/Encore/MBNXT/Data boundaries |
| `platform-architect` | Continuum + Encore backend, service design, migrations |
| `mbnxt-architect` | Next.js PWA, React Native, GraphQL API layer |
| `data-architect` | BigQuery, Kafka, Keboola, Airflow, CDC pipelines |
| `b2b-architect` | Merchant platform, Salesforce, Encore B2B tier, ads |
| `compound-engineering` | Quality-compounding dev cycle: plan → work → review → compound |
| `get-shit-done` | Spec-driven multi-phase projects, context document management |
| `build-with-agent-team` | Parallel multi-agent builds across system boundaries |
| `second-opinion` | Quick independent review via separate Claude session |
| `postgres` | PostgreSQL on Encore (Cloud SQL, Drizzle ORM, MySQL migration) |
| `kubernetes-specialist` | GKE workloads (data platform, Kafka/Strimzi, batch jobs) |
| `new-project` | Bootstrap new project folder + registry entry |
| `skill-creator` | This skill — create and improve other skills |

## Core Workflow

### 1. Capture Intent

Before writing a single line:
- **What does this skill do?** Be specific — not "helps with X" but "produces Y when Z happens"
- **When should it trigger?** List explicit trigger keywords and situations
- **What does good output look like?** Format, length, structure
- **Does it need test cases?** Yes if output is objectively verifiable (code, transforms, diagnostics). No if purely qualitative (architecture judgement, design review)
- **Does it overlap with an existing skill?** Check the table above — if it does, refine the existing skill instead

### 2. Research Edge Cases

Ask 2–3 clarifying questions:
- What is the 80% use case this skill will handle?
- What should it explicitly NOT do? (boundaries prevent overlap)
- What Groupon-specific context does it need? (architecture model, platform patterns, team conventions)

### 3. Write SKILL.md

**Required structure:**
```markdown
---
name: skill-name
description: Explicit trigger conditions. "Use when X. Do NOT use for Y (use Z instead)."
---

# Skill Name

## When to Use vs. Related Skills
(Table comparing this skill vs. the most similar existing skills)

## Workflow
(Numbered steps in imperative form)

## Groupon Integration
(Specific file paths, query commands, platform patterns)
```

**Writing rules:**
- Under 500 lines total
- Imperative form: "Query the architecture model" not "You should query"
- Explain the *why* behind instructions — reasoning beats rules
- Descriptions must be "pushy" — Claude undertriggers skills by default
- Every skill must have a "When to Use vs. Related Skills" table to prevent overlap
- Every skill must have a "Groupon Integration" section

### 4. Create Test Cases

Save to `.claude/skills/<name>/evals/evals.json`:

```json
{
  "evals": [
    {
      "id": "primary-use-case",
      "prompt": "Realistic user prompt that should trigger this skill",
      "assertions": []
    },
    {
      "id": "should-not-trigger",
      "prompt": "Prompt that should trigger a different skill instead",
      "assertions": [{ "type": "not_contains", "value": "wrong output marker" }]
    }
  ]
}
```

Always include a "should not trigger" test case to verify the description boundaries work.

### 5. Evaluate: With vs. Without

Spawn parallel runs:
- **with-skill**: Run the test prompt with the SKILL.md loaded
- **baseline**: Run the same prompt without the skill

Compare: Does the skill improve quality? Does it trigger correctly? Does it over-trigger?

### 6. Iterate

- Generalise from feedback — do not overfit to specific test cases
- Add detail only when it solves a real observed problem
- Explain reasoning behind rules, not just the rules themselves
- If the skill is getting too long, extract content to `references/` files

## Skill File Structure

```
.claude/skills/<name>/
├── SKILL.md              # Required
├── evals/
│   └── evals.json        # 2–3 test cases
├── references/           # Optional: loaded on demand
└── scripts/              # Optional: helper scripts
```

## Trigger Calibration

Claude undertriggers skills. Make descriptions explicit and "pushy":

**Weak:**
```
description: Helps with PostgreSQL tasks.
```

**Strong:**
```
description: PostgreSQL expert for Groupon's Encore platform — schema design, query optimisation,
indexing, MVCC/VACUUM, WAL, connection pooling, Cloud SQL configuration, Drizzle ORM patterns,
and MySQL-to-PostgreSQL migration from Continuum. Use this skill for any Postgres work on Encore
services, including schema migrations, performance tuning, and backup/recovery planning on GCP Cloud SQL.
```

Key techniques:
- List specific trigger keywords (nouns and verbs users will type)
- Add "Do NOT use for X (use Y instead)" to prevent overlap collisions
- Include the "Use this skill when" phrasing explicitly

## Output

When creating a skill, produce:

1. `SKILL.md` — complete, following the structure above
2. `evals/evals.json` — at least 2 test prompts including one "should not trigger" case
3. Brief explanation of design decisions (why this trigger wording, why these boundaries)
4. Instruction to add the new skill to the skills table in `CLAUDE.MD`

## Groupon Integration

- New skills go in `.claude/skills/<name>/SKILL.md`
- After creating, add a row to the skills table in `CLAUDE.MD` (section: Available Claude Skills)
- Skills querying Groupon architecture use `node context/scripts/query-manifest.mjs` and `node context/scripts/query-docs.mjs`
- Skills referencing Encore patterns should align with `platform-architect` / `b2b-architect` conventions
