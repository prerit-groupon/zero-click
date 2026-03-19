---
name: compound-engineering
description: Use for quality-compounding development cycles at Groupon — plan a feature before touching code (/ce:plan), execute with atomic commits and git worktrees (/ce:work), run multi-perspective code review (/ce:review), then capture learnings so the next feature is easier (/ce:compound). Trigger this skill when the goal is sustainable velocity through 80% planning/review and 20% coding. Do NOT use for large multi-phase projects spanning weeks (use get-shit-done instead) or for spawning independent parallel agents across platforms (use build-with-agent-team instead).
---

# Compound Engineering

Source: https://github.com/EveryInc/compound-engineering-plugin

## Philosophy

Each unit of engineering work should make subsequent units easier — not harder. Compound engineering inverts the typical ratio: 80% planning and review, 20% execution. Technical debt is prevented by design, not cleaned up later.

This works because plans catch mistakes before they are written into code, reviews catch them before they ship, and the compound phase means learnings are never lost between sessions.

## When to Use vs. Related Skills

| Situation | Use |
|-----------|-----|
| Single feature/fix needing a quality-first cycle | **This skill** |
| New project or multi-phase milestone needing context docs | `get-shit-done` |
| Feature spanning independent Groupon platforms built in parallel | `build-with-agent-team` |
| Quick one-off review of a single file or decision | `second-opinion` |

## Core Commands

| Command | Purpose |
|---------|---------|
| `/ce:plan` | Transform a feature idea into a structured, verifiable implementation plan |
| `/ce:work` | Execute the plan with git worktrees and atomic per-task commits |
| `/ce:review` | Spawn parallel review agents (correctness, security, performance, Groupon patterns) |
| `/ce:compound` | Extract and save learnings, patterns, and decisions for future sessions |

## The Cycle

```
/ce:plan → /ce:work → /ce:review → /ce:compound
                ↑________________________________| (next cycle is faster)
```

---

### `/ce:plan` — Plan Before Touching Code

1. Clarify the feature scope and acceptance criteria
2. Identify which Groupon systems are touched (run `node context/scripts/query-manifest.mjs search <keyword>` if needed)
3. Map affected Encore services, Continuum wrappers, or MBNXT surfaces
4. Define the implementation strategy and key decisions
5. Break into atomic tasks — each independently testable and committable
6. Document assumptions, open questions, and rollback approach
7. Write the plan to `plans/<feature>.md`

**Output:** A plan file in `plans/` with task breakdown, ordered steps, and verification criteria.

**Groupon checks before planning:**
- New capability → which platform? (Encore / Continuum / MBNXT / Data — use `/enterprise-architect` if unsure)
- Touches Continuum from Encore? → use an existing typed wrapper or create a new one
- New B2B Encore service? → confirm service-owns-database, Cloud Run, PostgreSQL
- Consumer-facing? → confirm SSR strategy and market scope with `/mbnxt-architect`

---

### `/ce:work` — Execute with Discipline

1. Read the plan from `plans/<feature>.md`
2. Create git worktrees for parallel workstreams if the plan has independent branches
3. Follow the task order — do not skip or reorder without updating the plan first
4. Commit atomically after each task (one logical change per commit; if you need "and" in the message, split it)
5. Update task status in the plan as you go
6. Flag blockers immediately — do not push through with workarounds

**Groupon standards during execution:**
- Encore TypeScript: flat modular decomposition (controllers → domain modules; no deep layers)
- Reuse Encore shared infra: Gateway, AuthN/Z, Topics, Audit Log — do not rebuild these
- Service-owns-database: no cross-service schema access
- Every feature flag needs a removal date

---

### `/ce:review` — Multi-Perspective Code Review

Use `/ce:review` for thorough pre-merge review of a complete feature.
For a quick one-off review of a single file or decision, use `/second-opinion` instead.

Spawn parallel review agents, each with a distinct lens:

| Agent | Checks |
|-------|--------|
| Correctness | Does it do what the plan says? Edge cases handled? |
| Security | Auth boundaries, input validation, secrets, PII handling (GDPR for EMEA) |
| Performance | N+1 queries, missing indexes, hot paths, Redis TTLs |
| Groupon patterns | Approved patterns followed? Anti-patterns introduced? Migration aligned? |

Steps:
1. Review against the original plan — is everything implemented?
2. Each agent produces a prioritised finding list (critical / high / medium / low)
3. Merge findings into a single review report
4. Block merge on all critical and high findings
5. Document deferred medium/low findings as tech debt tasks in Task Master

**Output:** Review report with findings by severity and a clear merge recommendation.

---

### `/ce:compound` — Capture Learnings

Run after every completed feature — this is the step that makes the next cycle faster.

1. Extract reusable patterns discovered during the work
2. Document what worked, what didn't, and the root cause of any blockers
3. Update `improve/lessons.md` with concrete lessons (one bullet per lesson)
4. Write an ADR to `plans/<feature>-adr.md` if an architectural decision was made
5. Update `docs/conventions.md` if a new pattern should become standard for the codebase

**Output:** Updated `improve/lessons.md`; ADR and conventions update if applicable.

---

## Key Principles

- **Plan first, always.** If you cannot write the plan, you do not understand the task well enough to code it.
- **Atomic commits.** Each commit is one logical change. "and" in the commit message = split the commit.
- **Worktrees for parallelism.** Use `git worktree add` for independent branches — not multiple uncommitted changes.
- **Review before merge.** Never merge without `/ce:review` for anything beyond a trivial one-liner.
- **Compound the learnings.** A session with no `/ce:compound` step leaves the next session starting from scratch.

## Common Anti-Patterns

**Skipping `/ce:plan` Under Time Pressure** — Starting with `/ce:work` because the task "seems obvious." The plan is not overhead — it is the mechanism that catches the edge cases that will otherwise surface mid-implementation. If you cannot write the plan in 10 minutes, the task is not obvious.

**Splitting `/ce:review` from `/ce:work`** — Running the work in one session and deferring the review to "later." Reviews deferred past the same session are reviews that never happen. The cycle only compounds value when plan → work → review → compound runs to completion before the session ends.

**Skipping `/ce:compound`** — Treating `/ce:compound` as optional cleanup. It is the step that makes the next cycle faster. A session that ends without updating `improve/lessons.md` and writing an ADR for any architectural decision is a session that erased its own value.

**Using This for Multi-Week Projects** — Compound engineering is a single-cycle quality tool for individual features. Projects that span multiple sessions with multiple features and phases need `get-shit-done` for context persistence. Trying to use CE for a week-long initiative will produce a plans directory full of disconnected feature files with no milestone-level coordination.

**Worktrees Without a Plan** — Creating git worktrees before `/ce:plan` is complete. Worktrees are for executing parallel independent branches of a *known* plan. Starting parallel implementation before the plan is written is parallel guessing.

---

## Groupon Integration

| Artefact | Location |
|----------|----------|
| Plans | `plans/<feature>.md` |
| Learnings | `improve/lessons.md` |
| ADRs | `plans/<feature>-adr.md` |
| Conventions | `docs/conventions.md` |

- Consult the appropriate architect skill before `/ce:plan` for cross-cutting changes
- Track tasks in Task Master alongside the CE cycle
- Architecture queries: `node context/scripts/query-manifest.mjs` and `node context/scripts/query-docs.mjs`
