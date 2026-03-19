---
name: new-project
description: Use when creating a new project. Bootstraps folder, registry entry, and living context. Self-improves after each use.
version: 1.0.0
last_improved: 2026-03-11
---

# New Project Skill

> **Self-Improving Skill** — After every project creation, append a `## Retrospective` entry at the bottom of this file with: what worked well, what was unclear, and one improvement applied to the steps above.

---

## What I Do

Skills are like recipes I follow. This one handles creating new projects so the setup is consistent every time. When you say "create a new project", I'll follow these steps automatically — and get better each time.

---

## Steps

### 1. Gather Project Details

Ask the user for:
- **Project name** — use-dashes-like-this (kebab-case)
- **One-line description** — what problem does it solve?
- **Team / Owner** — who is responsible?
- **Domain** — e.g. platform, consumer, data, infra, tooling
- **Stack hints** (optional) — e.g. Go, Node, Python, React

If any are missing, ask before proceeding. Do not guess.

---

### 2. Validate Name

- Must be lowercase, kebab-case (e.g. `auth-service`, `cost-optimizer`)
- No spaces, no underscores, no uppercase
- Check `docs/projects.md` — if name already exists, warn the user and stop

---

### 3. Create Project Folder Structure

```
projects/<project-name>/
├── README.md          ← project overview + quickstart
├── CLAUDE.md          ← living context file for Claude
└── docs/
    └── decisions.md   ← lightweight ADR log
```

**README.md** contents:
```markdown
# <Project Name>

> <one-line description>

## Owner
<team / owner>

## Domain
<domain>

## Quickstart
<!-- Fill in once bootstrapped -->

## Links
<!-- PRDs, Jira, Confluence, dashboards -->
```

**CLAUDE.md** contents:
```markdown
# <PROJECT_NAME>

<one-line description>

**Owner:** <team>
**Domain:** <domain>
**Stack:** <stack or "TBD">

---

## Domain Learnings

<!-- Claude captures key findings here as work progresses.
     One bullet per finding. Group by topic. Max ~100 lines.
     Format: `- [YYYY-MM-DD] <finding>` -->

---

## Patterns & Conventions

<!-- Recurring patterns, naming conventions, gotchas discovered -->

---

## Open Questions

<!-- Unresolved decisions or unknowns -->

---

## Improvement Log

<!-- After each session: one line on what changed or was learned -->
```

**docs/decisions.md** contents:
```markdown
# Decisions — <Project Name>

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| <!-- YYYY-MM-DD --> | <!-- what was decided --> | <!-- why --> | Active |
```

---

### 4. Register in Project Registry

Add a row to `docs/projects.md` (create the file if it doesn't exist):

| Name | Description | Owner | Domain | Status | Created |
|------|-------------|-------|--------|--------|---------|
| `<project-name>` | `<description>` | `<owner>` | `<domain>` | Active | `<today's date>` |

If `docs/projects.md` doesn't exist, create it with the header row first.

---

### 5. Confirm & Summarise

Print a confirmation summary:

```
✓ Created: projects/<project-name>/
✓ Files:   README.md, CLAUDE.md, docs/decisions.md
✓ Registered in: docs/projects.md

Next steps:
  1. Fill in the Quickstart section of README.md
  2. Add your PRD / Jira link under "Links"
  3. Say "work on <project-name>" to begin
```

---

### 6. Self-Improvement Step (Always Run)

After completing the above, append to the `## Retrospective` section below:

```markdown
### <YYYY-MM-DD> — <project-name>
- **What worked:** <observation>
- **What was unclear:** <observation>
- **Improvement applied:** <what was changed in the steps above, or "none">
```

---

## Quality Checklist

Before finishing, verify:
- [ ] Project name is valid kebab-case
- [ ] All 3 files created (README, CLAUDE.md, decisions.md)
- [ ] `docs/projects.md` updated
- [ ] CLAUDE.md has correct owner + domain filled in
- [ ] Summary printed to user

---

## Retrospective

> Each entry records what was learned and what changed. This section grows over time and drives skill evolution.

<!-- Entries added automatically after each use -->
