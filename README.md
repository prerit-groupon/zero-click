<<<<<<< HEAD
# zero_click
Skills &amp; Plugins
=======
# Zero-Click — Groupon Engineering Intelligence Hub

> **One workspace. Every team. Zero friction.**
>
> Zero-Click is Groupon Platform Engineering's unified AI-assisted workspace — architecture context,
> sprint intelligence, FinOps tooling, and 20+ Claude skills, all wired together so you spend
> zero time hunting for information and 100% of your time building.

---

## What Is This?

Think of Zero-Click as a **supercharged cockpit** for Groupon's Platform Engineering teams.
It sits on top of Claude Code and gives every engineer — whether they're new to the team or
a veteran — instant access to:

| Capability | What It Gives You |
|------------|-------------------|
| **Architecture Context** | Deep knowledge of 58+ Groupon repos (CICDO + Cloud Platform) |
| **AI Skills** | 20+ specialist agents: architects, FinOps advisors, code reviewers, report generators |
| **Sprint Intelligence** | Weekly Jira reports, stuck-ticket detection, KTLO analysis across 5 teams |
| **FinOps Tooling** | Daily GCP + AWS cost digests, CUD expiry alerts, anomaly detection |
| **Task Tracking** | Task Master integration for structured PRD-driven development |
| **Strategy Context** | Groupon's Beliefs, Bets, and GROW² execution framework — in one place |

**New to the team?** Start with the [Quick Start](#quick-start) section.
**Power user?** Jump straight to [Skills Reference](#skills-reference) or [Tools](#tools).

---

## Table of Contents

- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Skills Reference](#skills-reference)
- [Tools](#tools)
- [Architecture Context](#architecture-context)
- [MCP Integrations](#mcp-integrations)
- [Task Master Workflow](#task-master-workflow)
- [Strategy & Bets](#strategy--bets)
- [Operating Principles](#operating-principles)
- [Setup & Configuration](#setup--configuration)
- [Safety Rules](#safety-rules)

---

## Quick Start

### Prerequisites

- [Claude Code CLI](https://claude.ai/claude-code) installed
- Node.js 18+ (for billing tools)
- API keys configured (see [Setup](#setup--configuration))

### First Steps

```bash
# 1. Open the workspace in Claude Code
cd zero-click && claude

# 2. Check what tasks are queued
task-master list

# 3. Get your next task
task-master next

# 4. Need architecture guidance?
# Just type: /enterprise-architect
# or for backend specifics: /platform-architect

# 5. Run a weekly team health report
# Type: /jira-weekly-report

# 6. Check today's cloud costs
# Type: /cloud-cost-optimizer
```

> **Tip for beginners:** Every `/skill-name` command summons a specialist AI agent.
> You don't need to know everything upfront — just ask the right agent.

---

## Directory Structure

```
zero-click/
│
├── .claude/
│   └── skills/                  ← All Claude skill definitions (20+ skills)
│       ├── enterprise-architect/
│       ├── platform-architect/
│       ├── jira-weekly-report/
│       ├── cloud-cost-optimizer/
│       ├── observability/
│       └── ... (17 more)
│
├── context/
│   └── data/                    ← Groupon architecture knowledge bases
│       ├── cicdo-context-shared/   ← CI/CD, Jenkins, Deploybot, ELK, Thanos (40 repos)
│       └── cloud-context-shared/   ← GCP, K8s, service mesh, Helm, routing (18 repos)
│
├── docs/
│   ├── bets/                    ← Groupon's Company Bets + Functional Bets
│   │   ├── company/             ← 6 cross-functional company initiatives
│   │   └── functional/          ← 15 department-led functional bets
│   ├── conventions.md           ← Coding standards and naming rules
│   ├── processes.md             ← GROW² framework, strategic principles
│   └── projects.md              ← Active project registry
│
├── tools/
│   ├── gcp-billing/             ← GCP BigQuery + CUD billing fetcher (Node.js)
│   ├── cloudability/            ← Multi-cloud cost fetcher via Cloudability API (Node.js)
│   ├── jira-analyser/           ← Weekly report config (5 teams, epics, members)
│   │   ├── teams/               ← Per-team YAML configs (CICDO, GDS, Cloud, AIOps, SRE)
│   │   └── results/             ← Dated weekly report archive (YYYY-MM-DD/report.md)
│   ├── jira/                    ← Jira MCP credentials
│   └── asana/                   ← Asana MCP credentials
│
├── plans/                       ← Work-in-progress plans (todo.md, feature plans, ADRs)
├── improve/                     ← Lessons learned and retrospectives
├── temp/                        ← Scratch space — never commit here
│
├── CLAUDE.MD                    ← Master AI instructions for this workspace
├── safety.md                    ← Non-negotiable safety rules
├── .mcp.json                    ← MCP server config (Jira + Asana)
└── .env                         ← API keys (never commit this)
```

> **Rule:** New files go in `plans/`, `improve/`, `temp/`, or `docs/`. Never drop files in the
> workspace root — that's what `temp/` is for.

---

## Skills Reference

Skills are specialist AI agents you invoke with a `/` command inside Claude Code.
Each one has deep domain knowledge and pre-loaded context for its area.

### Architecture Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| **Enterprise Architect** | `/enterprise-architect` | Cross-platform strategy, system boundaries, tech governance, migration paths — **start here if unsure** |
| **Platform Architect** | `/platform-architect` | Backend services, Continuum/Encore, API contracts, commerce engine, orders, payments |
| **Data Architect** | `/data-architect` | BigQuery, Kafka, Airflow, data pipelines, event schema design, Teradata migration |

> **Routing rule:** Not sure which architect to use? Always start with `/enterprise-architect`.
> They'll route you to the right specialist.

### Infrastructure & Observability Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| **Observability** | `/observability` | Thanos, Telegraf, CLAM, Grafana, ELK/Elastic, APM, metrics pipeline |
| **Kubernetes Specialist** | `/kubernetes-specialist` | GKE workloads, Strimzi Kafka, Helm, K8s deployments |
| **Encore Monorepo** | `/encore-monorepo` | Full reference for the Encore TS monorepo (78 TS + 2 Go + 16 Python services) |
| **Encore Style** | `/encore-style` | TypeScript/Encore coding conventions and testing practices |
| **Encore Verify** | `/encore-verify` | Confirm Encore TS changes actually work before merging |
| **Postgres** | `/postgres` | PostgreSQL schema design, query optimisation, Drizzle ORM, Cloud SQL |
| **Deploybot** | `/deploybot` | Groupon Deploybot deployment authorisation and release workflow |

### FinOps Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| **Cloud Cost Optimizer** | `/cloud-cost-optimizer` | **Primary FinOps skill** — GCP + AWS via Cloudability: daily digest, anomaly detection, CUD analysis |
| **GCP Cost Optimizer** | `/gcp-cost-optimizer` | GCP-only drill-down via BigQuery billing export (use when Cloudability unavailable) |

### Sprint & Project Management Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| **Jira Weekly Report** | `/jira-weekly-report` | Weekly epic health for all 5 Platform teams — stuck tickets, KTLO, new tickets |
| **Jira Analyser (Engineering)** | `/jira-analyser-engineering` | Single-ticket quality and readiness analysis |

### Planning & Design Skills

| Skill | Command | When to Use |
|-------|---------|-------------|
| **Platform PRD Generator** | `/platform-prd-generator` | Generate internal platform PRDs |
| **Platform ADM Generator** | `/platform-adm-generator` | Architecture Decision Making documents |
| **Prerit PRD Analyser** | `/prerit-prd-analyser` | Analyse PRDs into structured work breakdowns (EPICs → Stories → Tasks) |
| **PRD Breakdown Architect** | `/prd-breakdown-architect` | Transform PRDs into technical plans with effort estimates |

### Engineering Workflow Skills

| Skill | Command | What the Cycle Looks Like |
|-------|---------|--------------------------|
| **Compound Engineering** | `/ce:plan` → `/ce:work` → `/ce:review` → `/ce:compound` | Quality-compounding development: 80% planning/review, 20% coding |
| **Build with Agent Team** | `/build-with-agent-team` | Spawn parallel agents across independent platform boundaries |
| **Get Shit Done** | `/gsd:new-project` | Multi-phase milestones needing context persistence across sessions |
| **New Project** | `/new-project` | Bootstrap a new service or project with folder, registry, and context |
| **Second Opinion** | `/second-opinion` | Fast independent review of a plan, PR, or architectural decision |
| **Agent Evaluation** | `/agent-evaluation` | Score and judge outputs from sub-agents using LLM-as-judge patterns |
| **Simplify** | `/simplify` | Review changed code for quality, reuse, and efficiency |
| **Autoresearch** | `/autoresearch` | Autonomously improve any SKILL.md via iterative test-score-mutate loop |
| **Skill Creator** | `/skill-creator` | Build or improve Claude skills for this workspace |

### Task Master Skills (`tm:*`)

| Command | Purpose |
|---------|---------|
| `tm:list` | List all tasks with status |
| `tm:next-task` | Get the next task to work on |
| `tm:show-task` | Show detailed task with context |
| `tm:set-status:to-in-progress` | Start a task |
| `tm:set-status:to-done` | Mark a task complete |
| `tm:expand-task` | Break a complex task into subtasks |
| `tm:add-task` | Add a new task with AI assistance |
| `tm:parse-prd` | Generate tasks from a PRD document |

---

## Tools

### GCP Billing (`tools/gcp-billing/`)

Fetches live GCP billing data from BigQuery and the Cloud Billing API.

```bash
cd tools/gcp-billing
npm install

# Full daily digest (costs + CUDs + anomaly detection)
node fetch-costs.js --mode daily

# Raw costs from BigQuery only
node fetch-costs.js --mode costs

# CUD portfolio + expiry alerts
node fetch-costs.js --mode cuds

# Ranked savings recommendations
node fetch-costs.js --mode recommend
```

**What it does:**
- Queries BigQuery billing export for daily costs by project/service/region
- Detects cost anomalies vs 7-day moving average (±15% threshold)
- Tracks Committed Use Discount (CUD) expiry dates and warns at ≤45 days
- Generates ranked savings recommendations (currently ~$1,817/mo / ~$21,810/yr addressable)

**Setup:** Copy `.env.example` → `.env` and set `GCP_BILLING_PROJECT`, `GCP_BILLING_DATASET`,
and `GOOGLE_APPLICATION_CREDENTIALS` pointing to your service account key JSON.

---

### Cloudability Multi-Cloud (`tools/cloudability/`)

Fetches unified GCP + AWS costs via the Cloudability by IBM API.

```bash
cd tools/cloudability

# Full daily digest (GCP + AWS)
node fetch-costs.js --mode daily

# Raw cost data
node fetch-costs.js --mode costs

# List all linked cloud accounts
node fetch-costs.js --mode accounts

# CUD portfolio + expiry alerts (GCP)
node fetch-costs.js --mode cuds
```

**When to use this vs GCP billing:** Use Cloudability as the primary FinOps source — it
covers both GCP and AWS in one report. Use the GCP billing tool only when you need
BigQuery-level drill-down or when Cloudability is unavailable.

**Setup:** Copy `.env.example` → `.env` and set `CLOUDABILITY_API_TOKEN`. Optionally set
`SLACK_WEBHOOK_URL` to auto-post daily digests to Slack.

---

### Jira Analyser (`tools/jira-analyser/`)

Configuration for the weekly Jira report. Covers 5 Platform Engineering teams.

```
teams/
├── CICDO/   epics.yaml + members.yaml   ← CI/CD & Observability
├── GDS/     epics.yaml + members.yaml   ← GDS team
├── Cloud/   epics.yaml + members.yaml   ← Cloud Platform
├── AIOps/   epics.yaml + members.yaml   ← AI/Ops
└── SRE/     epics.yaml + members.yaml   ← Site Reliability Engineering

results/YYYY-MM-DD/report.md             ← Dated weekly report archive
```

To generate a report, just run `/jira-weekly-report` in Claude Code.
Reports are saved to `tools/jira-analyser/results/YYYY-MM-DD/report.md` — building a
historical knowledge base of epic health over time.

---

## Architecture Context

The `context/data/` folder contains two **shared knowledge bases** — one per engineering
team — built from the actual source repos. They use a skill-graph architecture with domain
MOCs (Maps of Content), gotchas, and runbooks.

### Available Knowledge Bases

| Folder | Team | What's Covered | Repos |
|--------|------|----------------|-------|
| `context/data/cicdo-context-shared/` | CICDO | Jenkins, GitHub/GHES, Artifactory, ELK stack, Thanos/CLAM/Grafana, Deploybot, SonarQube | 40 repos |
| `context/data/cloud-context-shared/` | Cloud Platform | GCP org governance, Conveyor networking, EKS/GKE clusters, Hybrid Boundary service mesh, api-proxy/routing, cmf-helm-charts | 18 repos across 7 infra layers |

### How to Navigate

Each context folder follows the same structure. **Always start with `INDEX.md`.**

```
INDEX.md                  → Start here: landscape overview, file map
domains/<domain>.md       → Deep dive per infrastructure area
gotchas/<domain>.md       → Known failure patterns and mitigations (read before advising!)
runbooks/<topic>.md       → Incident response and operational procedures
repositories.json         → Machine-readable repo manifest
ARCHITECTURE.md           → How domains connect into the platform
DEPENDENCY_GRAPH.md       → Cross-repo dependencies and blast radius
AGENT_ROUTING_RULES.md    → Which task → which domain → which repo → which runbook
```

> **Pro tip:** Read `INDEX.md` → pick the relevant domain MOC → cross-check `gotchas/`.
> Most questions need only 2–3 files to answer.

---

## MCP Integrations

Zero-Click connects to Jira and Asana via MCP (Model Context Protocol) servers, configured
in `.mcp.json`. This means Claude Code can query and update tickets directly from the conversation.

### Configured Servers

| Server | MCP Package | What It Enables |
|--------|-------------|-----------------|
| **Atlassian Jira** | `@aashari/mcp-server-atlassian-jira` | Query tickets, update status, add comments, run JQL searches |
| **Asana** | `@roychri/mcp-server-asana` | Read/write Asana tasks, projects, and project statuses |

### Credentials Setup

```bash
# Jira
cp tools/jira/.env.example tools/jira/.env
# Set: ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN

# Asana
cp tools/asana/.env.example tools/asana/.env
# Set: ASANA_ACCESS_TOKEN
```

The `.env` in the workspace root is auto-loaded by the MCP servers when Claude Code starts.

---

## Task Master Workflow

[Task Master](https://github.com/eyaltoledano/claude-task-master) is the structured task
tracking system built into this workspace. Use it to break down PRDs into tasks, track
progress across sessions, and never lose context.

### Daily Development Loop

```bash
# 1. Find your next task
task-master next

# 2. Read the full task details
task-master show <id>

# 3. Start work
task-master set-status --id=<id> --status=in-progress

# 4. Log implementation notes as you go
task-master update-subtask --id=<id> --prompt="what I did / what I found"

# 5. Mark done
task-master set-status --id=<id> --status=done
```

### Task IDs

| Format | Meaning |
|--------|---------|
| `1` | Top-level task |
| `1.2` | Subtask 2 of task 1 |
| `1.2.3` | Sub-subtask 3 of subtask 1.2 |

### Starting from a PRD

```bash
# Put your PRD in .taskmaster/docs/prd.txt then:
task-master parse-prd .taskmaster/docs/prd.txt

# Analyse complexity and expand into subtasks
task-master analyze-complexity --research
task-master expand --all --research
```

---

## Strategy & Bets

Groupon's strategy lives in `docs/` — not just as background reading, but as active context
that shapes how architecture decisions are made and which work gets prioritised.

### The Strategy Stack

| Layer | Horizon | Purpose |
|-------|---------|---------|
| **Beliefs** | 3–5 years | How Groupon wins in local commerce |
| **North Star Metrics** | 2 years | Proof we're moving in the right direction |
| **Company Bets** | 6–18 months | 6 large cross-functional initiatives (see `docs/bets/company/`) |
| **Functional Bets** | 6–18 months | 15 department-led initiatives (see `docs/bets/functional/`) |
| **Team Initiatives** | 0–6 months | Scoped delivery work cascading from Bets |

### Core Beliefs

1. **Curated Quality & Trusted Value, Owned End-to-End, Wins Loyalty**
2. **Hyperlocal Supply Paired with Precision & Personalization Wins Local**
3. **The Next-Generation of Local Commerce Will Be AI-Native**

### Current Company Bets (Cycle A: Oct → Mar)

| # | Bet | Focus |
|---|-----|-------|
| 1 | MBNXT Ramp-Up & Legacy Shutdown | Scale Next.js PWA to full production, shut down legacy |
| 2 | Foundry AI | AI-native platform capabilities |
| 3 | Internal Search Relevance | Better search for merchants and consumers |
| 4 | Intent Engine | Personalisation and discovery |
| 5 | Data Unification | Single source of truth for data |
| 6 | SEO/Geo Discovery Growth | Organic acquisition |

Full details in [`docs/bets/company/`](docs/bets/company/).

---

## Operating Principles

Five principles — non-negotiable, applied to every task and decision in this workspace:

| Principle | The Rule |
|-----------|----------|
| **Extreme Ownership** | One owner per outcome. No committees, no shared buckets. |
| **Speed Over Comfort** | Ship fast, learn faster. Perfect is too slow. |
| **Impact Obsessed** | Only work tied to measurable customer or merchant outcomes. |
| **Simplify to Scale** | Complexity kills. Choose the simplest path that achieves 80% of value. |
| **Disciplined** | Do more with less. Every investment needs a clear ROI. |

---

## Setup & Configuration

### 1. Clone and open

```bash
git clone <repo-url> zero-click
cd zero-click
claude  # Opens Claude Code in this workspace
```

### 2. Configure API keys

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Key | Required For |
|-----|-------------|
| `ANTHROPIC_API_KEY` | Claude Code (all skills) |
| `ATLASSIAN_SITE_NAME` | Jira MCP |
| `ATLASSIAN_USER_EMAIL` | Jira MCP |
| `ATLASSIAN_API_TOKEN` | Jira MCP |
| `ASANA_ACCESS_TOKEN` | Asana MCP |
| `CLOUDABILITY_API_TOKEN` | Multi-cloud cost reports |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP billing tool (path to SA key JSON) |
| `GCP_BILLING_PROJECT` | GCP billing tool |
| `GCP_BILLING_DATASET` | GCP billing tool |
| `PERPLEXITY_API_KEY` | Task Master research mode (recommended) |

### 3. Install tool dependencies

```bash
cd tools/gcp-billing && npm install
cd ../cloudability && npm install
```

### 4. Verify Task Master

```bash
task-master list  # Should show tasks if .taskmaster/ is initialised
```

### 5. Test a skill

Open Claude Code and type `/jira-weekly-report` to confirm skills are loading.

---

## Standard Workflows

### For a New Feature or Fix

```
1. task-master next                              → Find next task
2. /enterprise-architect (if cross-cutting)     → Consult architect
3. Write plan → plans/todo.md                   → Plan before building
4. task-master set-status --id=X --status=in-progress
5. Implement incrementally
6. task-master update-subtask --id=X.Y --prompt="progress"
7. Verify it works (run tests, check output)
8. task-master set-status --id=X --status=done
```

### For Architecture Decisions

```
1. /enterprise-architect or domain architect skill
2. Query context/data/ if needed
3. Write design doc → plans/<feature>-design.md
4. Get /second-opinion if cross-cutting
5. Save decision → plans/<feature>-adr.md
```

### For Weekly Team Reporting

```
1. /jira-weekly-report
   → Queries 5 teams × epics via Jira MCP
   → Writes results to tools/jira-analyser/results/YYYY-MM-DD/report.md
```

### For Daily Cost Monitoring

```
1. /cloud-cost-optimizer
   → Fetches GCP + AWS costs via Cloudability
   → Detects anomalies vs 7-day average
   → Shows CUD expiry alerts and ranked savings recommendations
```

---

## Safety Rules

**The Prime Rule: Never delete, overwrite, or irreversibly modify anything without explicit user approval.**

Key safety requirements (full rules in [`safety.md`](safety.md)):

- Deletion of any file, branch, or resource → **ask first**
- Destructive git ops (`reset --hard`, `push --force`) → **ask first**
- Actions affecting shared systems (Jira, Asana, GitHub, GCP) → **ask first**
- Force-push to `main` or `master` → **always refused**

Pre-approved (no confirmation needed): reading files, `git status/diff/log`, creating files
in `plans/` or `temp/`, running tests, Task Master read operations.

---

## Contributing

### Adding a New Skill

```bash
# Use the skill-creator skill
# Type: /skill-creator
# Follow the prompts to generate SKILL.md + plugin.json
# Place in .claude/skills/<your-skill-name>/
```

### Updating Architecture Context

Context folders in `context/data/` are generated from source repos.
Use the `groupon-infra-context-builder` agent to regenerate after significant repo changes.

### Coding Standards

See [`docs/conventions.md`](docs/conventions.md) for:
- File naming, indentation, line length
- Git commit format (`feat:`, `fix:`, `docs:`, etc.)
- Jira/Asana ticket naming conventions
- Architecture decision process

---

## Getting Help

| I need to... | Do this |
|-------------|---------|
| Understand how a Groupon system works | Read `context/data/<team>/domains/<domain>.md` |
| Make an architecture decision | `/enterprise-architect` |
| Review code before merging | `/ce:review` or `/second-opinion` |
| Debug a cost spike | `/cloud-cost-optimizer` |
| See what the team is working on | `/jira-weekly-report` |
| Break down a PRD into tasks | `/prerit-prd-analyser` or `task-master parse-prd` |
| Create a new service | `/new-project` → `/enterprise-architect` → `/ce:plan` |
| Learn about this workspace | Read [`CLAUDE.MD`](CLAUDE.MD) |
| Report a problem | Open an issue or drop a note in `improve/lessons.md` |

---

<div align="center">

**Built for Groupon Platform Engineering · Zero friction, maximum signal**

_Last updated: 2026-03-19_

</div>
>>>>>>> 3cf9de7 (Initial commit)
