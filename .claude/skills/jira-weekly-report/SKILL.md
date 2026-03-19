---
name: jira-weekly-report
description: >
  Weekly Jira epic analysis for Groupon Platform Engineering teams (CICDO, GDS, Cloud, AIOps, SRE).
  Produces a dated .md report in tools/jira-analyser/results/YYYY-MM-DD/ covering stuck tickets,
  new tickets, blockers, epic health, and KTLO analysis.
  Trigger keywords: "weekly report", "jira report", "epic analysis", "stuck tickets", "KTLO analysis",
  "platform engineering report", "team health".
  Do NOT use for ad-hoc single-ticket analysis (use /jira-analyser-engineering instead).
---

# Jira Weekly Report

Produces a weekly Markdown report for all 5 Platform Engineering teams, stored as a dated snapshot
in `tools/jira-analyser/results/` — building a knowledge base of epic health over time.

---

## When to Use vs. Related Skills

| Situation | Use This Skill | Use Instead |
|-----------|---------------|-------------|
| Weekly team health report | ✅ Yes | — |
| KTLO epic deep-dive | ✅ Yes | — |
| Single ticket quality review | ❌ No | `/jira-analyser-engineering` |
| Sprint health for CCLOUD board | ❌ No | `/cloud-sprint-manager` |

---

## Config Structure

All configuration lives in `tools/jira-analyser/`:

```
tools/jira-analyser/
├── teams/
│   ├── CICDO/
│   │   ├── epics.yaml      # Epic keys + KTLO flag
│   │   └── members.yaml    # name → Jira accountId mapping
│   ├── GDS/    ...
│   ├── Cloud/  ...
│   ├── AIOps/  ...
│   └── SRE/    ...
├── config.yaml             # Jira base URL, report settings
└── results/
    └── YYYY-MM-DD/
        └── report.md       # Dated weekly report
```

---

## Execution

Full step-by-step workflow (JQL queries, metric calculations, KTLO analysis): **`references/execution-workflow.md`**

Report template with all sections and formatting: **`templates/weekly-report.md`**

---

## Jira URL Format

All ticket links follow: `https://groupondev.atlassian.net/browse/{KEY}`

Resolve accountId → display name using `members.yaml`. If an accountId is not in `members.yaml`,
fetch from Jira and add it:
```
GET /rest/api/3/user?accountId={accountId}
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| JQL returns 0 results with `"Epic Link"` | Retry with `parent = {EPIC_KEY}` |
| Epic key not found (404) | Log `⚠️ Epic {KEY} not found — check epics.yaml` in report |
| Pagination needed (total > 100) | Increment `startAt` by 100 and fetch next page |
| AccountId not in members.yaml | Fetch from Jira `/rest/api/3/user?accountId=...` |
| Jira API rate limit (429) | Wait 2s and retry once |

---

## Output Location

```
tools/jira-analyser/results/
├── 2026-03-14/
│   └── report.md
├── 2026-03-21/
│   └── report.md
└── ...
```

After writing, print the path:
```
✅ Report written to tools/jira-analyser/results/{YYYY-MM-DD}/report.md
```

---

## Groupon Integration

| Resource | Location |
|----------|----------|
| Jira credentials | `tools/jira/.env` |
| Team configs | `tools/jira-analyser/teams/<TEAM>/` |
| Report output | `tools/jira-analyser/results/YYYY-MM-DD/report.md` |
| Jira base URL | `https://groupondev.atlassian.net` |
| Related skill | `/jira-analyser-engineering` (single-ticket analysis) |

---

## Gotchas

**"Epic Link" vs `parent` JQL** — Classic Jira projects use `"Epic Link" = EPIC-KEY`. Next-gen projects use `parent = EPIC-KEY`. Always try `"Epic Link"` first; if it returns 0 results, retry with `parent`. Don't assume all teams use the same project type.

**Pagination silently truncates** — The Jira API silently cuts off at `maxResults=100`. If `total > 100`, you must paginate with `startAt`. Forgetting this means the report looks healthy when dozens of tickets are missing.

**AccountId ≠ display name** — `members.yaml` maps accountIds to names. If a ticket's assignee accountId is missing from the file, always fetch the display name from Jira (`/rest/api/3/user?accountId=...`) and add it. Never show raw accountIds in the report.

**KTLO flag not set** — If `ktlo: false` is set on an epic that should be KTLO, the analysis is skipped silently. Before running, verify `epics.yaml` has the correct `ktlo` flags for all teams.

**Rate limiting (429) is common for large runs** — With 5 teams × 5 epics × 5 queries each, you're making ~125 API calls. Space them slightly and always handle 429 with a 2s wait-and-retry. Do not retry immediately.

**Stuck threshold is 7 days** — The JQL `updated < -7d` catches tickets with no update (comment, status change, assignee change) in 7+ days. Tickets that had a comment but no status change still appear as stuck — this is intentional; movement means actual progress.
