---
name: get-shit-done
description: Use for new Groupon features or multi-phase milestones that need structured spec-driven development to prevent context rot across sessions. Initialise with /gsd:new-project to produce PROJECT.md, REQUIREMENTS.md, ROADMAP.md and STATE.md, then cycle through discuss → plan → execute → verify phases. Use /gsd:quick for small ad-hoc tasks. Do NOT use for single-cycle quality work on an existing feature (use compound-engineering instead) or for one-off tasks that do not need persistent context documents.
---

# Get Shit Done (GSD)

Source: https://github.com/gsd-build/get-shit-done

## What Problem This Solves

As an AI fills its context window across a long project, output quality degrades — "context rot". GSD prevents this by:
1. Keeping all persistent project knowledge in modular files (PROJECT.md, REQUIREMENTS.md, etc.) rather than in the conversation
2. Using parallel executors with fresh contexts, so each task starts clean
3. Maintaining STATE.md so any session can resume without re-reading history

## When to Use vs. Related Skills

| Situation | Use |
|-----------|-----|
| New project or multi-phase milestone | **This skill** |
| Single feature with a quality-first cycle | `compound-engineering` |
| Feature needing parallel independent agents | `build-with-agent-team` |
| Ad-hoc fix or config change | `/gsd:quick` (this skill, quick mode) |

## Core Commands

| Command | Purpose |
|---------|---------|
| `/gsd:new-project` | Initialise: questions → research → requirements → roadmap |
| `/gsd:discuss-phase [N]` | Capture design decisions before planning begins |
| `/gsd:plan-phase [N]` | Research, write atomic plans, verify against requirements |
| `/gsd:execute-phase <N>` | Execute in parallel dependency-aware waves |
| `/gsd:verify-work [N]` | User acceptance + automated debugging |
| `/gsd:complete-milestone` | Archive milestone, tag release |
| `/gsd:new-milestone` | Start next version cycle |
| `/gsd:quick [--discuss] [--full]` | Ad-hoc tasks with GSD guarantees, skipping full phases |
| `/gsd:progress` | Show current state and next steps |

## Standard Workflow

```
new-project → discuss-phase → plan-phase → execute-phase → verify-work → complete-milestone
                   ↑__________________________________|  (repeat per phase)
```

---

### Phase 1: Initialise `/gsd:new-project`

1. Ask clarifying questions until the concept is fully understood
2. Spawn parallel researchers to investigate the domain
3. Extract scoped requirements with a phased roadmap
4. Create the context documents (see below)

**For Groupon projects, also:**
- Run `node context/scripts/query-manifest.mjs overview` to ground the context in actual architecture
- Identify which Groupon platform owns the capability (Encore / Continuum / MBNXT / Data)
- Invoke the appropriate architect skill if the scope crosses platform boundaries
- Link the new project in `docs/projects.md`

---

### Phase 2: Discuss `/gsd:discuss-phase [N]`

1. Surface implementation grey areas before planning begins
2. Capture decisions about APIs, data models, integration points, UX patterns
3. Output saved to `CONTEXT.md` — this is the living decision log

**For Groupon projects, discuss:**
- Which Encore wrapper services are needed for Continuum integration?
- Which Encore shared services are reused (Gateway, AuthN/Z, Topics, Audit Log)?
- Salesforce integration pattern? (If B2B — use Salesforce Wrapper, not direct API)
- GraphQL schema changes? (If consumer-facing — consult MBNXT Architect first)

---

### Phase 3: Plan `/gsd:plan-phase [N]`

1. Research ecosystem patterns relevant to the phase
2. Create 2–3 atomic task plans in XML structure
3. Verify plans satisfy requirements through up to 2 iteration rounds
4. Plans stored in `plans/.planning/phase-N/`

---

### Phase 4: Execute `/gsd:execute-phase <N>`

1. Group tasks into dependency-aware waves
2. Run independent tasks in parallel — each gets a fresh 200k-token context
3. Each task committed atomically (one logical change per commit)
4. State tracked in `STATE.md`

---

### Phase 5: Verify `/gsd:verify-work [N]`

1. Extract testable deliverables from the phase plans
2. Walk through each verification item
3. Diagnose failures automatically
4. Create fix plans and re-execute immediately

---

## Quick Mode

For small, unambiguous tasks — bug fixes, config changes, small improvements:

```bash
/gsd:quick                   # Spawn planner + executor, skip research and verify
/gsd:quick --discuss         # Add lightweight discussion for ambiguous tasks
/gsd:quick --full            # Add plan-checking and post-execution verification
```

Use quick mode rather than the full workflow when the approach is already clear.

---

## Context Engineering Documents

GSD maintains modular context files that replace conversation history:

| File | Location in Workspace | Purpose |
|------|-----------------------|---------|
| `PROJECT.md` | `plans/PROJECT.md` | Project overview, goals, Groupon platform context |
| `REQUIREMENTS.md` | `plans/REQUIREMENTS.md` | Scoped requirements per phase |
| `ROADMAP.md` | `plans/ROADMAP.md` | Phased delivery milestones |
| `STATE.md` | `plans/STATE.md` | Current state — what's done, what's next |
| `CONTEXT.md` | `plans/CONTEXT.md` | Design decisions captured in discuss phase |

Keep these in `plans/` alongside other project planning docs.

---

## Key Technical Properties

- **Context engineering** — Modular docs prevent quality degradation across long sessions
- **Parallel execution** — Independent tasks run simultaneously in fresh contexts
- **Wave execution** — Tasks grouped by dependencies; blocked tasks wait for their wave
- **Atomic commits** — Each task produces one bisect-friendly commit
- **XML task structure** — Plans use structured XML format with embedded verification steps

---

## Common Anti-Patterns

**Skipping Context Documents for "Small" Projects** — Deciding that PROJECT.md and REQUIREMENTS.md are overkill because the project is "only a few days." Context rot starts at session two. By session four, an agent without these documents will re-ask questions already answered and re-make decisions already documented. The documents take 20 minutes to write; the rework they prevent takes hours.

**Treating GSD and Task Master as Redundant** — Using only one of the two tools for a multi-phase project. Task Master tracks *what* needs to be done. GSD tracks *how* to do it well (context docs, phase structure, discussion decisions, verification). They are complementary. Running GSD without Task Master means phase handoffs are undocumented outside the conversation. Running Task Master without GSD means each execution phase starts without requirements or roadmap context.

**Cramming Multiple Features into One Phase** — Packing an oversized phase so that `execute-phase` spawns more agents than the scope warrants. GSD phases should be independently deliverable increments. If a phase cannot be demo-ed to a stakeholder on its own, it is too large. Split it.

**Skipping `/gsd:discuss-phase` Before Planning** — Moving directly from `/gsd:new-project` to `/gsd:plan-phase`. The discussion phase surfaces grey areas before they become implementation surprises. Skipping it does not save time — it moves the ambiguity later in the cycle where it is more expensive to resolve.

**Continuing Past a Failed Verify Without a Fix Plan** — When `/gsd:verify-work` reveals failures, the correct response is to create a fix plan and re-execute — not to mark the phase done with caveats. A phase is done when it passes verification, not when implementation is complete.

---

## Groupon Integration

- All GSD context docs go in `plans/` (consistent with workspace conventions)
- Use Task Master alongside GSD for cross-session task tracking (Task Master = what to do, GSD = how to do it well)
- Before `/gsd:new-project`, run the relevant architect skill for architectural input
- Architecture queries during planning: `node context/scripts/query-manifest.mjs` and `node context/scripts/query-docs.mjs`
- After milestone completion: run `/ce:compound` to extract lessons and update `improve/lessons.md`
