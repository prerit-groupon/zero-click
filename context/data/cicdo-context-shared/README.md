---
description: "Landing page for the CICDO shared context. Read this if you're a human. If you're an AI agent, read CLAUDE.md or INDEX.md instead."
---

# CICDO Platform Context (Shared)

Shared knowledge base for Groupon's CI/CD & Observability platform. Designed for both humans and AI agents.

## What's Inside

This is NOT a code repository. It's a **navigable knowledge graph** for the CICDO platform — the infrastructure every Groupon engineer depends on.

| Folder | What's in it | When to use it |
|--------|-------------|----------------|
| `domains/` | One-page overview per domain (monitoring, logging, jenkins, etc.) | "How does X work?" |
| `runbooks/` | Operational procedures for incidents | "Something is broken" |
| `architecture/` | Pipeline diagrams and system topology | "Show me how data flows" |
| `gotchas/` | Known failure patterns and hard-won lessons | "What should I watch out for?" |
| `references/` | Links, dashboards, repos, team info | "Where's the URL for X?" |
| `repositories.json` | Machine-readable manifest of all 40 repos | "Which repo has the code for X?" |

## For AI Agents

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Session start protocol for Claude Code / Cowork |
| `INDEX.md` | Master entry point — agent reads this first |
| `AGENT_ROUTING_RULES.md` | How to route tasks to the right domain/repo/runbook |
| `AI_USAGE_GUIDE.md` | Best practices for engineers working with AI on CICDO systems |

## Quick Start

**Human?** Start with `ARCHITECTURE.md` for the big picture, then dive into `domains/<whatever-you-need>.md`.

**AI agent?** Read `INDEX.md` first. Follow the links relevant to the current task. Check `gotchas/` before giving advice.

## Why No Source Code?

This context intentionally excludes the 16,000+ source files across 40 repositories. Instead, `repositories.json` tells you (or your AI agent) exactly which repo to clone for any task. This keeps the context fast, navigable, and focused on operational knowledge that lives in people's heads — not in code.

## Contributing

This is a living system. Help it improve:

1. **Found a gotcha?** → Add it to `gotchas/<domain>.md`
2. **Runbook outdated?** → Update it in `runbooks/`
3. **New repo?** → Add to `repositories.json`
4. **Architecture changed?** → Update `architecture/` and `DEPENDENCY_GRAPH.md`

Log changes in `.meta/amendments/changelog.md`.

## Owner

CICDO Team — Prerit Munjal (pmunjal@groupon.com)
