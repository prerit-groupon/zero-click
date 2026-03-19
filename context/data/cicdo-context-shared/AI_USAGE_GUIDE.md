---
description: "Guide for engineers using AI agents (Claude Code, Cowork, Cursor) with CICDO systems. Read this to get the most out of AI-assisted work on CICDO infrastructure."
---

# AI Usage Guide for CICDO Systems

## How This Context Works

This folder is a **skill graph** — a navigable knowledge structure designed for both humans and AI agents. Instead of dumping raw code, it gives agents (and you) structured knowledge to reason with.

### The Structure

```
INDEX.md              ← Start here. Always.
├── domains/          ← One file per CICDO domain. Architecture + repos + links.
├── runbooks/         ← Operational procedures for incidents.
├── architecture/     ← Pipeline diagrams and topology.
├── gotchas/          ← Known failure patterns. The highest-signal content.
├── references/       ← Links, repos, dashboards.
├── repositories.json ← Machine-readable repo manifest (40 repos).
├── AGENT_ROUTING_RULES.md ← How the agent decides where to look.
├── DEPENDENCY_GRAPH.md    ← How repos and pipelines connect.
└── .meta/            ← Self-improvement: observations, amendments, scoring.
```

### Progressive Disclosure

Every file has YAML frontmatter with a `description` field. The agent reads descriptions first, then only opens files relevant to your task. This means:

- Asking about Thanos → agent reads `domains/monitoring.md`, not all 40 repos
- Reporting an ELK alert → agent reads `runbooks/elk-alerts.md` + `gotchas/logging.md`
- Finding a repo → agent searches `repositories.json` by tags

**You don't need to tell the agent where to look.** The routing rules handle that.

---

## Best Practices

### 1. Be Specific About the Domain

Instead of: "Something is broken with our metrics"
Say: "Thanos receiver pods are crash-looping in the observability-cluster namespace"

The more specific you are, the faster the agent routes to the right runbook.

### 2. Reference Alerts by Name

Instead of: "We got an alert"
Say: "PagerDuty fired 'Thanos Receive High Replication Failures'"

The agent maps alert names directly to runbooks.

### 3. Ask for Gotchas

After getting a recommendation, ask: "Are there any gotchas I should know about?"

The agent will check the gotchas files, which contain hard-won knowledge from real incidents that might not be obvious.

### 4. Help the Context Improve

If the agent gives you wrong or outdated information:
- Tell it what was wrong
- Ask it to update the relevant gotchas or runbook file
- The `.meta/` system tracks these improvements

This is how the context gets better over time — through real use.

### 5. Use for Code Navigation, Not Code Dumps

This shared context does NOT contain source code (16,000+ files would be counterproductive). Instead it has `repositories.json` which tells the agent exactly which repo to point you to.

If you need to work with actual code, clone the specific repo the agent identifies.

---

## What the Agent Can Help With

| Task | What to ask | Agent uses |
|------|-------------|------------|
| Incident response | "Thanos receiver alerts are firing, walk me through the runbook" | Runbooks + gotchas |
| Architecture questions | "How do metrics flow from an application to Grafana?" | Domain MOCs + architecture |
| Finding repos | "Which repo has the Telegraf deployment configs?" | repositories.json |
| Understanding dependencies | "If I change the DSL util library, what else breaks?" | DEPENDENCY_GRAPH.md |
| Dashboard links | "Where's the Grafana dashboard for Artifactory?" | references/dashboards.md |
| Access requests | "How do I get write access to deploy via Deploybot?" | Runbooks + references |
| Code review context | "What does this service do and who owns it?" | Domain MOCs + team.md |

---

## What the Agent Should NOT Do

- **Make code changes without you reviewing** — It can point you to the right repo and file, but changes to production infrastructure should always be reviewed
- **Assume standard configs** — CICDO systems have customizations. The gotchas files exist for this reason
- **Skip the routing sequence** — If the agent jumps straight to a recommendation without checking the domain MOC and gotchas, ask it to follow the routing rules

---

## Contributing to This Context

This context is a living system. If you find something wrong or missing:

1. **Gotcha discovered?** → Add it to `gotchas/<domain>.md`
2. **Runbook outdated?** → Update the relevant file in `runbooks/`
3. **New repo?** → Add an entry to `repositories.json`
4. **Architecture changed?** → Update `architecture/<domain>.md` and `DEPENDENCY_GRAPH.md`

Log all changes in `.meta/amendments/changelog.md` so we can track what improves outcomes.
