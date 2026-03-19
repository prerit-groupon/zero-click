# Zero-Click — Claude Code Instructions

> This file is auto-loaded by Claude Code. It defines how the AI agent operates in this workspace.
> **This CLAUDE.MD takes precedence over all other CLAUDE.md files in this workspace.**

---

## Safety Rules (Non-Negotiable)

**Read this before anything else:**

@safety.md

---

## Session Start Protocol (Every Session, No Exceptions)

Before doing any work, the agent MUST:

1. **Read `improve/lessons.md`** — load every lesson from prior sessions
2. **Read `plans/todo.md`** — understand what is currently in-flight
3. Apply all lessons as active constraints for the session

These two reads take priority over everything else. Skipping them is not permitted.

---

## The Golden Rule: Think → Validate → Propose → Approve → Execute

Every non-trivial suggestion or task follows this exact sequence:

```
1. THINK      — Form an approach internally
2. VALIDATE   — Invoke /second-opinion to challenge it before speaking
3. PROPOSE    — Present the refined suggestion to the user
4. PLAN       — Write the plan to plans/todo.md with checkboxes
5. APPROVE    — Wait for explicit user approval before touching anything
6. EXECUTE    — Implement incrementally, ticking off plan items as you go
7. LEARN      — Write lessons to improve/lessons.md after each iteration
```

**Never skip step 2 (validate) or step 5 (approve).** These are the two most common failure modes.

> "Non-trivial" means: any suggestion that changes files, involves architecture, spans more than one step,
> or affects shared systems. If in doubt, treat it as non-trivial.

---

## Task Master AI Instructions

@./.taskmaster/CLAUDE.md

---

## About This Workspace

**Zero-Click** is the unified Groupon engineering intelligence hub — architecture context, tooling,
skills, and AI-assisted workflows for Platform Engineering teams.

Integrations:
- **Jira** and **Asana** via MCP tools (`tools/jira/` and `tools/asana/`)
- **Groupon architecture context** — shared knowledge bases in `context/data/`
- **Task Master** — structured task tracking in `.taskmaster/`
- **Skills** — 21 specialist plugins in `.claude/skills/`

---

## Workspace Map

| Directory | Purpose | When to Use |
|-----------|---------|-------------|
| `.claude/skills/` | All specialist skill plugins (21 skills) | Before any domain task — load the right skill |
| `context/data/` | Groupon architecture context (CICDO, Cloud) | Before advising on Groupon-specific infrastructure |
| `plans/` | All plans, design docs, ADRs — user must approve before execution | Write plan here, wait for approval |
| `improve/` | Lessons learned, corrections, retrospectives | Read at session start, write after every iteration |
| `temp/` | Throwaway scratch files — never in root | Experiments, one-off scripts, intermediate output |
| `tools/` | MCP tool configs + billing scripts (Jira, Asana, GCP, Cloudability) | When using external integrations |
| `docs/` | Groupon company context: processes, conventions, projects, bets | Background reading before cross-team decisions |
| `plans/archive/` | Completed plans (move from `plans/` when done) | After finishing any planned task |

---

## Architecture Context (Groupon Knowledge Base)

All Groupon-specific knowledge lives in `context/data/` — one folder per team.

| Folder | Team | Coverage |
|--------|------|----------|
| `context/data/cicdo-context-shared/` | CICDO | Jenkins, GHES, Artifactory, ELK, Thanos, CLAM, Grafana, Deploybot, SonarQube — 40 repos |
| `context/data/cloud-context-shared/` | Cloud Platform | GCP org, Conveyor, EKS/GKE, Hybrid Boundary, api-proxy, cmf-helm-charts — 18 repos, 7 layers |

**Navigation rule:** Always start with `INDEX.md` in the relevant folder.

```
INDEX.md              → Entry point: landscape overview and file map
domains/<domain>.md   → Deep dive per infrastructure area
gotchas/<domain>.md   → Known failure patterns — read before advising
runbooks/<topic>.md   → Incident response procedures
AGENT_ROUTING_RULES.md → Task → domain → repo → runbook routing
```

Read: `INDEX.md` → relevant `domains/` file → cross-check `gotchas/`. Most tasks need 2–3 files max.

---

## Skills Directory (`.claude/skills/`)

All skills live in `.claude/skills/`. Invoke with the `/skill-name` prefix.

### Architect Panel — invoke before any non-trivial design decision

| Skill | Use When |
|-------|----------|
| `/enterprise-architect` | Cross-platform strategy, system boundaries, org-wide standards, migration paths |
| `/platform-architect` | Backend services (Continuum/Encore), API contracts, commerce engine, service decomposition |
| `/data-architect` | Data pipelines, BigQuery, Kafka, event schemas, ML infrastructure |

> When unsure which architect to use → start with `/enterprise-architect`.

**Architect Routing:**
- Cross-cutting (2+ platforms) → Enterprise Architect leads, domain architects review
- API contract changes → owning platform architect leads, consuming architects review
- External integrations → Enterprise Architect approves, domain architect designs

### Infrastructure & Observability

| Skill | Use When |
|-------|----------|
| `/observability` | Thanos, Telegraf, CLAM, Grafana, ELK, APM, metrics pipeline |
| `/kubernetes-specialist` | GKE/EKS workloads, Strimzi Kafka, K8s resources |
| `/encore-monorepo` | Encore-based monorepo reference (78 TS + 2 Go + 16 Python services) — read before exploring the repo |
| `/encore-style` | Encore TS coding conventions, Drizzle ORM, service patterns |
| `/encore-verify` | Verification checklist before marking any Encore implementation done |
| `/deploybot` | Continuum deployment authorization and rollout workflow |

### FinOps

| Skill | Use When |
|-------|----------|
| `/cloud-cost-optimizer` | **Primary.** Daily GCP + AWS digest via Cloudability — anomaly detection, CUD analysis, recommendations |
| `/gcp-cost-optimizer` | GCP-only BigQuery billing drill-down (use when Cloudability is unavailable) |

### Engineering & Project Management

| Skill | Use When |
|-------|----------|
| `/jira-weekly-report` | Weekly epic health for CICDO, GDS, Cloud, AIOps, SRE teams |
| `/second-opinion` | **Validate any suggestion before presenting it to the user** |
| `/compound-engineering` | Quality-compounding dev cycles: plan → implement → review |
| `/build-with-agent-team` | Features spanning multiple independent system boundaries |
| `/get-shit-done` | New features or milestones needing spec-driven development across sessions |
| `/postgres` | PostgreSQL schema, query optimisation, indexing, Cloud SQL, Drizzle ORM |
| `/new-project` | Bootstrap a new project folder, registry entry, and living context |

### Planning & PRD

| Skill | Use When |
|-------|----------|
| `/platform-prd-generator` | Generate internal platform PRDs |
| `/platform-adm-generator` | Generate Architecture Decision Making documents |
| `/prerit-prd-analyser` | Analyse PRDs into structured work breakdowns |
| `/prd-breakdown-architect` | Transform PRDs into technical plans with effort estimates |

### Skill Development

| Skill | Use When |
|-------|----------|
| `/skill-creator` | Create or refine skills in this workspace |
| `/autoresearch` | Improve any skill via iterative test-score-mutate loop |
| `/agent-evaluation` | Judge sub-agent outputs using LLM-as-judge rubric scoring |

### Task Master (`tm:*`)

Full task lifecycle management. See Task Master section above for commands.

---

## The Improve Loop (Non-Negotiable)

**After every task or iteration, the agent MUST:**

1. Write a lesson to `improve/lessons.md` — even if nothing went wrong (confirm what worked)
2. Format: date, what happened, correction or validation, going-forward rule

**At the start of every session, the agent MUST:**

1. Read `improve/lessons.md` in full
2. Treat every lesson as an active constraint — not optional background reading

This is how the agent improves over time. Skipping the improve loop resets all prior learning.

```markdown
## improve/lessons.md format

### YYYY-MM-DD — <Short title>
**What happened:** <what went wrong or was misunderstood>
**Correction:** <what the user corrected or what the right approach was>
**Going forward:** <rule or principle to apply next time>
```

---

## Standard Workflow

### For Any New Task

```
1. Read improve/lessons.md           → Load prior learnings
2. Read plans/todo.md                → Check what is in-flight
3. task-master next                  → Find next pending task
4. Load relevant context/            → Read INDEX.md for the domain
5. Invoke /second-opinion            → Validate your intended approach
6. Write plan → plans/todo.md        → Break into checkboxes
7. Present plan to user              → WAIT FOR APPROVAL
8. task-master set-status in-progress
9. Implement incrementally           → Tick off plan items as you go
10. task-master update-subtask       → Log progress notes
11. Verify it works                  → Run tests, check output
12. task-master set-status done
13. Write lesson → improve/lessons.md
```

### For Any Architecture Decision

```
1. Read improve/lessons.md
2. Load relevant context/ folder
3. Invoke the right architect skill (/enterprise-architect if unsure)
4. Invoke /second-opinion on the architect's output
5. Write design doc → plans/<feature>-design.md
6. Present to user → WAIT FOR APPROVAL
7. Save decision record → plans/<feature>-adr.md
8. Write lesson → improve/lessons.md
```

### For Jira / Asana Work

```
1. /jira-weekly-report              → Weekly health for all 5 teams
2. /jira-analyser-engineering       → Single ticket quality check
3. /platform-jira-agent             → Create structured Jira breakdowns
4. /second-opinion                  → Validate before creating/updating tickets
```

---

## Behaviour Rules

### Plan Before Building

- For anything non-trivial (3+ steps): write a plan to `plans/todo.md` first
- Do not start implementation until the user has approved the plan
- If something goes wrong — stop and re-plan, do not push through

### Validate Before Suggesting

- For any recommendation, design proposal, or course of action:
  → invoke `/second-opinion` **before** presenting it to the user
- This applies to architecture, implementation approaches, Jira ticket suggestions, and workflow changes
- Exceptions: trivial read-only queries, confirming a fact, or direct user commands

### Track Everything

- Plans go in `plans/todo.md` with checkable items (`- [ ]`)
- Tick items complete as you go — do not batch
- Lessons go in `improve/lessons.md` after every iteration
- Use Task Master for structured task tracking on multi-step work

### Verify Before Done

- Never claim something is done without proving it works
- Run tests, check output, demonstrate correctness
- Ask: *"Would a senior engineer approve this?"*

### Keep It Simple

- Minimum complexity for the current task
- Do not add features, abstractions, or error handling beyond what is asked
- Three similar lines of code is better than a premature abstraction
- Find root causes — never apply quick hacks

---

## Navigation Quick Reference

| Path | Contents |
|------|----------|
| `.claude/skills/` | All 21 skill plugins |
| `context/data/cicdo-context-shared/` | CICDO: CI/CD, observability, monitoring, logging |
| `context/data/cloud-context-shared/` | Cloud: GCP infra, K8s, service mesh, routing, Helm |
| `plans/todo.md` | Active work-in-progress plan |
| `plans/archive/` | Completed plans |
| `improve/lessons.md` | Lessons learned — read at session start |
| `docs/projects.md` | All active projects |
| `docs/conventions.md` | Coding standards |
| `docs/processes.md` | Groupon operating principles |
| `docs/bets/` | Strategic bets and initiatives |
| `tools/jira/` | Jira MCP config |
| `tools/jira-analyser/` | Weekly report configs + dated results |
| `tools/asana/` | Asana MCP config |
| `tools/gcp-billing/` | GCP billing scripts |
| `tools/cloudability/` | Cloudability cost scripts |
| `temp/` | Scratch space — throwaway only |
| `.taskmaster/tasks/tasks.json` | Task Master database |
| `.taskmaster/config.json` | AI model config |

---

## currentDate

Today's date is 2026-03-19.

---

## Key Principles (In Order of Priority)

1. **Safety first** — safety.md rules are absolute
2. **Learn first** — read `improve/lessons.md` before every session
3. **Validate before suggesting** — invoke `/second-opinion` before recommending anything
4. **Plan before building** — write it in `plans/todo.md` and get approval
5. **Architect before designing** — invoke the right skill for non-trivial decisions
6. **Track as you go** — Task Master + `improve/lessons.md`
7. **Verify before done** — prove it works, do not assume
8. **Keep it simple** — minimum complexity for the current task
