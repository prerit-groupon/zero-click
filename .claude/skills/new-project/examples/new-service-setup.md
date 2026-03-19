# Example: New Project Setup — encore-audit-log

> Scenario: Creating a new `encore-audit-log` project in the Zero-Click workspace.
> The project is a shared Encore service for recording audit events across all B2B services.

---

## Step 1 — Skill Triggered

User says: `"Create a new project for the audit log service we're building"`

Skill `/new-project` activates. Questions are asked:

```
Project name:     encore-audit-log
Description:      Shared audit event logging service for Encore B2B platform
Team / Owner:     Platform Core Squad (Marcus Webb)
Domain:           platform
Stack hints:      TypeScript, Cloud Run, PostgreSQL (Drizzle ORM)
```

---

## Step 2 — Validate Name

```
✓ encore-audit-log — valid kebab-case, lowercase, no underscores
✓ docs/projects.md checked — name not already registered
```

---

## Step 3 — Create Folder Structure

```bash
projects/encore-audit-log/
├── README.md
├── CLAUDE.md
└── docs/
    └── decisions.md
```

**README.md created:**

```markdown
# encore-audit-log

> Shared audit event logging service for Encore B2B platform

## Owner
Platform Core Squad (Marcus Webb)

## Domain
platform

## Quickstart
<!-- Fill in once bootstrapped -->

## Links
<!-- PRDs, Jira, Confluence, dashboards -->
```

**CLAUDE.md created:**

```markdown
# encore-audit-log

Shared audit event logging service for Encore B2B platform

**Owner:** Platform Core Squad (Marcus Webb)
**Domain:** platform
**Stack:** TypeScript / Cloud Run / PostgreSQL (Drizzle ORM)

---

## Domain Learnings

- [2026-03-19] Audit log events must be append-only — no updates or deletes
- [2026-03-19] Consumer services should write via Encore RPC (not direct DB access)
- [2026-03-19] SOX-relevant events (order changes, payment overrides) require enhanced retention (7 years)

---

## Patterns & Conventions

- Event schema: { id, service, actor_id, action, resource_type, resource_id, payload, created_at }
- Use Drizzle's `timestamp('created_at').defaultNow()` — never allow caller to set timestamps
- Index on (service, created_at) for time-range queries; index on (actor_id, created_at) for user audit

---

## Open Questions

- [ ] Should EMEA events be stored in a separate EU Cloud SQL instance for GDPR?
- [ ] What's the retention policy for non-SOX events?

---

## Improvement Log

<!-- After each session: one line on what changed or was learned -->
```

**docs/decisions.md created:**

```markdown
# Decisions — encore-audit-log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-03-19 | Append-only event table | Audit integrity requires immutable records | Active |
| 2026-03-19 | Encore RPC (not direct DB) | Service owns its database — consumers must not access PostgreSQL directly | Active |
```

---

## Step 4 — Register in `docs/projects.md`

Row added:

| Name | Description | Owner | Domain | Status | Created |
|------|-------------|-------|--------|--------|---------|
| `encore-audit-log` | Shared audit event logging service for Encore B2B platform | Platform Core Squad (Marcus Webb) | platform | Active | 2026-03-19 |

---

## Step 5 — Summary Printed

```
✓ Created: projects/encore-audit-log/
✓ Files:   README.md, CLAUDE.md, docs/decisions.md
✓ Registered in: docs/projects.md

Next steps:
  1. Fill in the Quickstart section of README.md
  2. Add your PRD / Jira link under "Links"
  3. Say "work on encore-audit-log" to begin
```

---

## Step 6 — Retrospective Appended to SKILL.md

```markdown
### 2026-03-19 — encore-audit-log
- **What worked:** Domain Learnings section in CLAUDE.md captured append-only constraint upfront
- **What was unclear:** Whether EMEA geo-segregation was in scope — left as Open Question
- **Improvement applied:** Added SOX retention note to CLAUDE.md template as a prompt for future projects
```

---

## What Happens Next

Once the project folder exists, use `get-shit-done` (`/gsd:new-project`) to initialise the full
GSD context documents (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md) in `plans/`.

The `new-project` skill creates the folder and registers the project.
The `get-shit-done` skill drives the multi-phase implementation.
They complement each other — use both for any non-trivial Encore service.
