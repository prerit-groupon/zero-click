# Safety Rules

> These rules are **non-negotiable**. They apply to every task, every session, every agent in this workspace.
> Read this before taking any destructive, irreversible, or shared-system action.

---

## The Prime Rule

**Never delete, overwrite, or irreversibly modify anything without explicit user approval.**

If in doubt: **stop and ask**.

---

## Deletion — Always Requires Approval

Before deleting **anything**, the agent must:

1. State clearly what will be deleted and why
2. Show the exact command or action that would run
3. Wait for explicit user confirmation (not implied, not assumed)
4. Only proceed after the user says **yes**

This applies to:

- Files and directories (`rm`, `rmdir`, `git clean`, etc.)
- Git branches (`git branch -d`, `git branch -D`)
- Database records or tables
- Cloud resources (GCP, AWS, Kubernetes objects)
- Jira/Asana tasks or projects
- Any data that cannot be trivially recovered

**Never use `rm -rf` without explicit user approval and showing the exact path first.**

---

## Destructive Git Operations — Always Requires Approval

The following git operations require explicit user confirmation before running:

| Command | Risk |
|---------|------|
| `git reset --hard` | Discards all local changes permanently |
| `git push --force` / `git push -f` | Overwrites remote history |
| `git rebase` (on shared branches) | Rewrites commit history |
| `git checkout -- .` / `git restore .` | Discards all working tree changes |
| `git clean -f` / `git clean -fd` | Deletes untracked files |
| Amending published commits | Rewrites shared history |

**Never force-push to `main` or `master`. Warn the user and refuse.**

---

## Shared Systems — Always Requires Approval

Actions that affect systems beyond the local machine require confirmation:

- **Pushing code** to remote repositories
- **Creating or closing** GitHub PRs, issues, or reviews
- **Creating, updating, or deleting** Jira tickets or Asana tasks
- **Posting messages** (Slack, email, webhooks, external services)
- **Modifying infrastructure** (Kubernetes, Terraform, GCP/AWS configs)
- **Modifying CI/CD pipelines** or deployment configs
- **Changing shared permissions** or access controls

---

## Files and Data

- Do not overwrite files with uncommitted changes without showing the diff and asking first
- Do not create files in the root of the workspace — use `temp/` for scratch work
- Do not commit `.env` files, credentials, or API keys — warn the user if asked
- Do not truncate or replace large files without confirming the intent

---

## Unexpected State — Investigate Before Acting

If the agent encounters:

- Unfamiliar files or directories
- Unexpected branches or commits
- Lock files held by another process
- Config files with unusual values

**Stop and investigate before deleting or overwriting.** This may be in-progress work from the user.
Resolve conflicts rather than discarding changes. Remove lock files only after identifying the holding process.

---

## Confirmation Protocol

When asking for approval, always include:

```
Action: <what will happen>
Target: <exact file/resource/command>
Reason: <why this is needed>
Risk: <what cannot be undone>

Proceed? [yes/no]
```

A user approving an action once does **not** mean it is approved in all future contexts.
Re-confirm for each distinct occurrence unless explicitly pre-approved in this file or `CLAUDE.MD`.

---

## Pre-Approved (Low-Risk) Operations

These do **not** require confirmation:

- Reading any file or directory
- Running read-only queries (architecture scripts, `git status`, `git diff`, `git log`)
- Creating new files in `plans/`, `improve/`, `temp/`, `docs/`
- Editing files the user has explicitly asked to modify in the current session
- Running tests (non-destructive)
- Task Master read operations (`task-master list`, `task-master show`, `task-master next`)

---

## Summary Checklist

Before any action, ask:

- [ ] Does this delete something? → **Ask first**
- [ ] Does this overwrite uncommitted work? → **Ask first**
- [ ] Does this affect a shared system? → **Ask first**
- [ ] Does this force-push or rewrite history? → **Ask first, refuse on main/master**
- [ ] Is this irreversible? → **Ask first**
- [ ] Am I unsure? → **Ask first**
