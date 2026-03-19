# Conventions

> Coding standards, naming rules, and patterns for this workspace.
> Grows over time as decisions are made — add a convention when one is established.

---

## General

- Language: English only in code, docs, and commit messages
- Line length: 100 characters max
- Indentation: 2 spaces (JS/TS/JSON), 4 spaces (Python)
- Files: lowercase-with-hyphens for filenames, `SCREAMING_CAPS.md` for top-level workspace files

## Git

- Commit messages: `<type>: <imperative description>` (e.g., `feat: add sprint health dashboard`)
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
- Branch names: `<type>/<short-description>` (e.g., `feat/jira-sprint-reporter`)
- Never commit `.env` files or credentials

## File Organisation

| Type | Location |
|------|----------|
| Plans and design docs | `plans/` |
| Lessons and retrospectives | `improve/` |
| Scratch / throwaway work | `temp/` |
| Documentation | `docs/` |
| Groupon architecture context | `context/` |
| MCP tool configs | `tools/<tool>/` |

## Jira / Asana

- Ticket titles: `[VERB] [OBJECT] — [context]` (e.g., "Add sprint health report to CCLOUD board")
- Acceptance criteria must be present on all tickets before implementation

## Architecture

- Invoke the relevant architect skill before designing anything non-trivial
- All design decisions get a record in `plans/<feature>-adr.md`
- Query architecture data to validate assumptions on critical paths

---

_Last updated: 2026-03-11_
