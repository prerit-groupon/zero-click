---
description: "Workspace routing instructions for Claude Code and Cowork. Agent: read this at session start to understand how to navigate this context."
---

# CICDO Context — Claude Instructions

## Session Start Protocol

1. **Read `INDEX.md`** — Understand the landscape. Do NOT read every file.
2. **Classify the task** — Use `AGENT_ROUTING_RULES.md` to determine the domain.
3. **Load minimal context** — Read only the domain MOC + relevant runbook/gotcha. 2-3 files max for most tasks.
4. **Check gotchas** — Always read `gotchas/<domain>.md` before giving recommendations.
5. **Log the interaction** — Append to `.meta/observations/log.jsonl` after significant interactions.

## Navigation Rules

- **Start broad, go narrow**: INDEX.md → domain MOC → specific runbook/reference
- **Never read all files**: This context has 50+ files. You need 2-3 per task.
- **Use YAML frontmatter**: Every file has a `description` field. Scan descriptions to decide what to read.
- **Use repositories.json programmatically**: Don't guess repo names. Search the JSON by domain, tags, or description.
- **Check DEPENDENCY_GRAPH.md for cross-cutting tasks**: When a change spans domains, understand the blast radius.

## File Modification Rules

You may improve this context when you discover errors or gaps:

- **Gotchas**: Add new failure patterns as you encounter them
- **Runbooks**: Update procedures if they're outdated
- **repositories.json**: Add new repos or update descriptions
- **references/**: Update links, dashboards, team info

**Always log changes** in `.meta/amendments/changelog.md` with: what changed, why, files affected, and result.

## Anti-Patterns

- Don't read codebases — this shared context intentionally excludes source code. Use `repositories.json` to point engineers to the right repo.
- Don't make infrastructure changes — this is a knowledge context, not an automation tool. Recommend changes, don't execute them.
- Don't skip the routing sequence — follow AGENT_ROUTING_RULES.md even if you think you know the answer.
- Don't give advice without checking gotchas — the gotchas files contain failure patterns that override general knowledge.

## Self-Improvement Loop

After every significant interaction:

```json
{"timestamp": "ISO-8601", "task": "brief description", "domain": "domain-name", "context_used": ["files read"], "outcome": "success|partial|failure", "notes": "what worked or didn't", "improvements_needed": ["specific gaps found"]}
```

Append to: `.meta/observations/log.jsonl`
