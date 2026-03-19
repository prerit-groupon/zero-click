# Git Worktrees — Compound Engineering Reference

> Used in `/ce:work` when the plan has independent parallel branches.
> Worktrees let multiple independent branches co-exist on disk simultaneously.

---

## When to Use Worktrees

Use worktrees when the `/ce:plan` output has **genuinely independent branches** that can be worked simultaneously. Do not create worktrees before the plan is written — parallel guessing wastes time.

**Good use case:** Plan has two independent tracks:
- Track A: New Encore service + schema (no dependencies on Track B)
- Track B: MBNXT component consuming the Track A API (depends on contract, not implementation)

**Not a good use case:** Steps 1, 2, 3 where each step depends on the previous.

---

## Basic Worktree Commands

```bash
# List current worktrees
git worktree list

# Create worktree for a new branch (branch created automatically)
git worktree add ../zero-click-feature-auth feature/encore-auth-service

# Create worktree from an existing branch
git worktree add ../zero-click-feature-ui feature/mbnxt-auth-ui

# Remove a worktree when done (does NOT delete the branch)
git worktree remove ../zero-click-feature-auth

# Force remove if there are uncommitted changes (use carefully)
git worktree remove --force ../zero-click-feature-auth

# Prune stale worktree references (after manual directory deletion)
git worktree prune
```

---

## Groupon Workspace Pattern

Worktrees live adjacent to the main workspace, never inside it:

```
~/
  zero-click/           ← main workspace (current branch: master or main)
  zero-click-<feature>-backend/   ← worktree A (feature/encore-deal-service)
  zero-click-<feature>-frontend/  ← worktree B (feature/mbnxt-deal-ui)
```

**Naming convention:** `zero-click-<feature>-<component>` — descriptive and tied to the feature.

---

## Worktree Setup for a CE Work Session

```bash
# From the main workspace
cd /Users/pmunjal/zero-click

# Create worktrees for parallel tracks (after /ce:plan is complete)
git worktree add ../zero-click-deal-backend feature/encore-deal-service
git worktree add ../zero-click-deal-frontend feature/mbnxt-deal-ui

# Open each in a separate terminal or IDE window
# Terminal 1: /Users/pmunjal/zero-click-deal-backend
# Terminal 2: /Users/pmunjal/zero-click-deal-frontend
```

Each worktree has its own working directory and index — changes in one do not affect the other until merged.

---

## Merging Worktrees After Completion

After both tracks are complete and reviewed:

```bash
# From main workspace
cd /Users/pmunjal/zero-click

# Merge each track (use --no-ff to preserve the branch structure)
git merge --no-ff feature/encore-deal-service -m "feat: add Encore deal service"
git merge --no-ff feature/mbnxt-deal-ui -m "feat: add MBNXT deal creation UI"

# Clean up worktrees
git worktree remove ../zero-click-deal-backend
git worktree remove ../zero-click-deal-frontend
```

If there are conflicts (usually only in shared files like `package.json`):
1. Resolve in the main workspace after both merges
2. Document the resolution in `improve/lessons.md` if it was non-trivial
3. Refine the ownership split in the plan to prevent the same conflict next time

---

## Atomic Commit Pattern (Inside Worktree)

Each commit should represent one logical change. If you need "and" in the message, split it.

```bash
# Inside a worktree — stage and commit specific files
git add packages/encore-deal-service/src/handlers/create-deal.ts
git add packages/encore-deal-service/src/db/schema.ts
git commit -m "feat(deal-service): add deal creation handler and Drizzle schema"

# Next logical change — separate commit
git add packages/encore-deal-service/src/handlers/get-deal.ts
git commit -m "feat(deal-service): add deal read handler"

# Do NOT do this (two logical changes in one commit):
# git add .
# git commit -m "add create handler, schema, read handler, and tests"
```

---

## Worktree Gotchas

| Gotcha | Prevention |
|--------|-----------|
| Shared files edited in both worktrees | Assign clear ownership — one worktree owns each shared file |
| Node modules out of sync | Run `npm install` in each worktree separately |
| Forgetting which terminal is which worktree | Use descriptive terminal titles; `git worktree list` shows all |
| Worktree on same branch as main | Each worktree must be on a different branch — Git enforces this |
| Stale worktree after manual directory deletion | Run `git worktree prune` to clean up stale refs |

---

## Integration with Task Master

Track progress across worktrees using Task Master:

```bash
# Terminal 1 (backend worktree) — update subtask as you complete steps
task-master update-subtask --id=3.1 --prompt="Created Drizzle schema, handlers pass type check"
task-master set-status --id=3.1 --status=done

# Terminal 2 (frontend worktree)
task-master update-subtask --id=3.2 --prompt="GraphQL query wired, component renders"
task-master set-status --id=3.2 --status=done
```

Both terminals read from the same `.taskmaster/tasks/tasks.json` — it's the shared source of truth across worktrees.
