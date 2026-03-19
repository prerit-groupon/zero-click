# STATE.md — [Project Name]

> **Current state snapshot.** Any session can resume from this file.
> Updated after every execute-phase and verify-work cycle.
> Last updated: YYYY-MM-DD HH:MM UTC

---

## Current Phase

**Phase:** N
**Status:** Discussing | Planning | Executing | Verifying | Complete

---

## What's Done

<!-- Completed phases and their key outputs -->

| Phase | Completed | Key output |
|-------|----------|-----------|
| 1 | YYYY-MM-DD | [What was delivered] |

---

## What's In Progress

| Task | Status | Blocker |
|------|--------|---------|
| | In Progress | — |
| | Blocked | [describe blocker] |

---

## What's Next

<!-- The very next action. Be specific enough that any session can pick this up cold. -->

1. Run `/gsd:execute-phase N` to start Phase N
2. First task: [specific description]
3. Then: [what follows]

---

## Recent Decisions

<!-- Last 5 key decisions. Full history in plans/CONTEXT.md -->

| Date | Decision | Rationale |
|------|---------|----------|
| YYYY-MM-DD | | |

---

## Verification Status

| Phase | Verified? | Issues found | Fixed? |
|-------|----------|-------------|--------|
| 1 | ✅ | None | — |
| 2 | ❌ | [list] | In progress |

---

## Files Written This Project

<!-- Useful for a new session to orient quickly -->

| File | Purpose |
|------|---------|
| `plans/PROJECT.md` | Project overview and goals |
| `plans/REQUIREMENTS.md` | Scoped requirements per phase |
| `plans/CONTEXT.md` | Design decisions from discuss phases |
| `plans/ROADMAP.md` | Delivery milestones |
| `plans/STATE.md` | This file |

---

## Session Resume Prompt

> Copy this into the next session to resume quickly:

```
Resume [Project Name] from STATE.md. Current phase: N ([status]).
Read plans/STATE.md, plans/REQUIREMENTS.md, and plans/CONTEXT.md before doing anything.
Next action: [copy from "What's Next" above]
```
