---
description: "Step-by-step execution workflow for the Jira weekly report — reading config, fetching data, computing metrics, and writing the report"
---

# Jira Weekly Report — Execution Workflow

## Step 1 — Read config and team data

```bash
cat tools/jira-analyser/config.yaml
```

For each team in `[CICDO, GDS, Cloud, AIOps, SRE]`:
```bash
cat tools/jira-analyser/teams/<TEAM>/epics.yaml
cat tools/jira-analyser/teams/<TEAM>/members.yaml
```

Build an in-memory structure:
```
{
  team: "CICDO",
  epics: [{ key, name, ktlo }],
  members: { accountId → name }
}
```

---

## Step 2 — Fetch Jira data for each epic

Use `mcp__atlassian-jira__jira_get` for all queries.
Base URL: `https://groupondev.atlassian.net`
Auth: credentials in `tools/jira/.env`

Run all 5 queries per epic. Use `fields=key,summary,status,assignee,priority,created,updated,comment,issuetype,labels,issuelinks`
and `maxResults=100`. Paginate if `total > 100`.

### Query A — All open tickets (epic health baseline)
```
GET /rest/api/3/search
  ?jql="Epic Link" = {EPIC_KEY} AND status NOT IN ("Won't Do", "Cancelled")
  &fields=key,summary,status,assignee,priority,created,updated,issuetype
  &maxResults=100
```

### Query B — Stuck tickets (no update in 7+ days, not done)
```
GET /rest/api/3/search
  ?jql="Epic Link" = {EPIC_KEY} AND updated < -7d AND status NOT IN ("Won't Do", "Cancelled", "Done", "Closed")
  &fields=key,summary,status,assignee,priority,updated,created
  &maxResults=100
```

For each stuck ticket, compute `days_idle = today - updated`.
Flag `unassigned = true` if `assignee` is null.

### Query C — New tickets this week
```
GET /rest/api/3/search
  ?jql="Epic Link" = {EPIC_KEY} AND created >= -7d
  &fields=key,summary,status,assignee,priority,created,issuetype
  &maxResults=100
```

### Query D — Unassigned open tickets
```
GET /rest/api/3/search
  ?jql="Epic Link" = {EPIC_KEY} AND assignee is EMPTY AND status NOT IN ("Won't Do", "Cancelled", "Done", "Closed")
  &fields=key,summary,status,priority,created,updated
  &maxResults=100
```

### Query E — Blockers
```
GET /rest/api/3/search
  ?jql="Epic Link" = {EPIC_KEY} AND (labels = "blocker" OR priority = Blocker OR issueFunction in linkedIssuesOf("is blocked by"))
      AND status NOT IN ("Won't Do", "Cancelled", "Done", "Closed")
  &fields=key,summary,status,assignee,priority,issuelinks,labels
  &maxResults=50
```

> **Note on Epic Link field**: Some Groupon projects use next-gen task hierarchy. If `"Epic Link"` JQL
> returns 0 results, retry with `parent = {EPIC_KEY}` (next-gen projects use `parent`).

---

## Step 3 — Compute epic health metrics

For each epic, from Query A results:

| Metric | Calculation |
|--------|-------------|
| Total open | count of all issues from Query A |
| In Progress | count where `status.name` ∈ ["In Progress", "In Review", "Development"] |
| To Do / Backlog | count where `status.statusCategory.name` = "To Do" |
| Unassigned | count from Query D |
| Stuck | count from Query B |
| New this week | count from Query C |
| Blockers | count from Query E |
| Health | see below |

**Health classification:**
- 🔴 Critical — blockers > 0 AND stuck > 20% of open tickets
- 🟡 At Risk — stuck > 10% of open tickets OR unassigned > 30% of open tickets
- 🟢 Healthy — everything else

---

## Step 4 — KTLO analysis (only if `ktlo: true` in epics.yaml)

Using Query A results filtered to the KTLO epic:

**Metrics to compute:**
- Total KTLO tickets (open)
- Unassigned KTLO tickets
- Average age of open KTLO tickets: `avg(today - created)` in days
- Oldest open KTLO ticket: max `(today - created)`, note the ticket key
- KTLO outliers: tickets where `(today - created) > 2 × average_age`

**Assignee distribution** (resolve accountId → name via `members.yaml`):
- For each assignee, count open KTLO tickets and tickets closed in last 7 days

**Done in last 7 days** (for velocity context):
```
GET /rest/api/3/search
  ?jql="Epic Link" = {KTLO_EPIC_KEY} AND status CHANGED TO ("Done", "Closed") DURING (-7d, now())
  &fields=key,summary,assignee,resolutiondate
  &maxResults=100
```

---

## Step 5 — Write the report

Determine the report date: `today = YYYY-MM-DD`
Report path: `tools/jira-analyser/results/{YYYY-MM-DD}/report.md`

Write the full report using the template in `templates/weekly-report.md`.

After writing the report, print the path to the user:
```
✅ Report written to tools/jira-analyser/results/{YYYY-MM-DD}/report.md
```
