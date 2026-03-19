---
name: build-with-agent-team
description: Use when implementing Groupon features that span multiple independent system boundaries (e.g., Encore backend + MBNXT frontend, Encore B2B + Data platform, Encore service + GKE infra) and those boundaries can be built in parallel. The lead agent writes integration contracts first — exact API shapes, topic event schemas, status codes — then spawns specialist agents simultaneously. Do NOT use for sequential tasks, single-platform work, or when one agent can do the full job.
---

# Build with Agent Team

Source: https://github.com/coleam00/context-engineering-intro/blob/main/use-cases/build-with-agent-team/SKILL.md

## When to Use vs. Related Skills

| Situation | Use |
|-----------|-----|
| Components truly independent AND cross system boundaries | **This skill** |
| Single feature with quality-first cycle | `compound-engineering` |
| Multi-phase milestone needing context docs | `get-shit-done` |
| Quick one-off review | `second-opinion` |

Only use multi-agent when the work is genuinely parallel. A feature with 3 sequential steps does not need 3 agents — it needs 1 agent working through the steps in order.

## The Critical Rule: Contracts Before Agents

**Anti-pattern:** Spawn agents → they diverge → integration fails → rework.

**Correct pattern:**
1. Lead defines all integration contracts first (API shapes, event schemas, topic names)
2. Contracts are written to `plans/<feature>-contracts.md`
3. Lead spawns all agents simultaneously with contracts embedded in each prompt
4. Agents build to agreed interfaces → integration works on first attempt

---

## Step-by-Step Workflow

### Step 1: Confirm This Needs Multiple Agents

Ask: Can a single agent build this sequentially in one session?
- If yes → use `compound-engineering` with `/ce:plan` + `/ce:work`
- If no (genuinely independent components across system boundaries) → continue

### Step 2: Invoke the Right Architect First

Before writing any contracts:
- Cross-platform (Encore + MBNXT): consult `/enterprise-architect` → `/mbnxt-architect` + `/platform-architect`
- Encore service + Data pipeline: consult `/enterprise-architect` → `/platform-architect` + `/data-architect`
- B2B merchant feature: consult `/b2b-architect`

Do not skip this step. Contracts must reflect Groupon's approved patterns.

### Step 3: Define Integration Contracts

Write to `plans/<feature>-contracts.md`. Be precise — vague contracts produce integration failures.

**Encore API contract:**
```
POST /api/v1/deals
Request:  { "merchantId": string (UUID), "title": string, "price": number }
Response: { "id": string (UUID), "status": "draft" | "active", "createdAt": string (ISO8601) }
Status:   201 Created | 400 Bad Request | 409 Conflict
Auth:     Encore Gateway JWT (x-groupon-user-id header populated by Gateway)
```

**Encore Topic event contract:**
```
Topic:    deals.created
Producer: deal-service
Consumer: notification-service, analytics-service
Schema:   { "dealId": string, "merchantId": string, "timestamp": string (ISO8601) }
Ordering: By merchantId (use as partition key)
```

**GraphQL field contract (if MBNXT is involved):**
```
type Deal {
  id: ID!
  title: String!
  price: Float!
  status: DealStatus!
}
enum DealStatus { DRAFT ACTIVE EXPIRED }

Query:  deal(id: ID!): Deal
Mutation: createDeal(input: CreateDealInput!): Deal
```

Include for every contract:
- Exact field names and types (TypeScript notation)
- Status codes for success AND each failure case
- Auth mechanism (Encore Gateway, API token, public)
- Event topic names and partition key strategy (for Encore Topics)

### Step 4: Assign Exclusive Ownership

Prevent merge conflicts by giving each agent exclusive directory ownership:

```
Agent 1 (Encore Backend):   packages/deal-service/
Agent 2 (MBNXT Frontend):   apps/web/src/features/deals/
Agent 3 (Infra/Config):     k8s/, .encore/, terraform/
```

Shared files (`package.json`, `tsconfig.json`) are owned by one designated agent; others request changes through the lead.

### Step 5: Write Agent Prompts and Spawn Simultaneously

Each agent prompt must include:
- Their role and exclusive file ownership
- The full contracts document (paste from `plans/<feature>-contracts.md`)
- What they cannot touch
- Their specific task description
- Their validation checklist

```bash
# Spawn in separate terminals or via the Agent tool
claude --context "$(cat plans/<feature>-contracts.md)
You are the Encore Backend agent. Ownership: packages/deal-service/.
Cannot touch: apps/web/, k8s/.
Task: Implement the Deal service endpoints as per contracts above.
Validation: TypeScript compiles, unit tests pass, API returns correct shapes."

claude --context "$(cat plans/<feature>-contracts.md)
You are the MBNXT Frontend agent. Ownership: apps/web/src/features/deals/.
Cannot touch: packages/deal-service/, k8s/.
Task: Implement the deal creation UI consuming the GraphQL API per contracts above.
Validation: Component renders, form submits, error states handled."
```

### Step 6: Lead Stays in Delegate Mode

While agents run:
- Do not implement anything yourself — coordinate only
- Relay questions between agents if they need to clarify a contract detail
- Approve any contract deviation (check with user if it affects shared boundaries)
- If an agent is blocked on a contract ambiguity, resolve it and notify all affected agents

### Step 7: Validate End-to-End

After all agents complete:
1. Run the full integration test suite
2. Verify every contract is satisfied (API shape, event schema, GraphQL types)
3. Test cross-agent flows end-to-end (e.g., UI creates deal → API persists → event fires → consumer receives)
4. Fix integration mismatches before declaring done
5. Run `/ce:compound` to capture learnings from the multi-agent session

---

## Groupon Team Compositions

| Feature type | Agent breakdown |
|--------------|-----------------|
| Full-stack Encore + MBNXT feature | Agent 1: Encore service; Agent 2: GraphQL schema + MBNXT UI |
| B2B merchant tool | Agent 1: Encore B2B API; Agent 2: Admin FE (Next.js); Agent 3: Salesforce wrapper if needed |
| Data pipeline + service | Agent 1: Encore service (producer); Agent 2: Keboola/Airflow pipeline (consumer) |
| Encore service + GKE infra | Agent 1: Encore service code; Agent 2: Cloud Run/GKE manifests + Terraform |
| Continuum migration | Agent 1: New Encore service; Agent 2: Encore typed wrapper over Continuum; Agent 3: Traffic migration config |

## Team Size Guidelines

| Task scope | Agents |
|------------|--------|
| Single platform, 1 component | 1 — use `compound-engineering` instead |
| 2 independent system boundaries | 2 agents |
| 3+ independent system boundaries | 3–4 agents |
| Full system (API + UI + infra + data) | 4 agents with clear ownership split |

## Common Anti-Patterns

**Spawning Agents Before Contracts Are Written** — The most common failure mode. "We'll align as we go" produces incompatible API shapes, mismatched type definitions, and integration rework that costs more time than the parallel execution saved. Contracts must be complete and in `plans/<feature>-contracts.md` before any agent is spawned.

**Giving Agents Overlapping File Ownership** — Two agents that can both edit `package.json`, `tsconfig.json`, or a shared schema file will produce merge conflicts. Designate exactly one owner for every shared file. Other agents request changes through the lead; the lead applies them.

**Using Multi-Agent for Sequential Work** — Spawning 3 agents for a feature where step 2 requires step 1's output and step 3 requires step 2's output is parallel theatre. Sequential dependencies mean sequential execution. Use `compound-engineering` with `/ce:work` instead.

**Skipping the Architect Consultation** — Writing contracts without first running the relevant architect skill. Contracts that violate Groupon patterns (e.g., an Encore service calling Continuum directly, a new Teradata dependency, missing typed wrapper) will produce agents that build to incorrect interfaces. The architect consultation is not optional — it determines what the contracts should say.

**Lead Agent Implementing During Agent Run** — The lead agent's job during agent execution is to coordinate, not build. Implementing features in the lead session while agents run produces a messy state where the lead's work and agents' work overlap. The lead stays in delegate mode until all agents complete.

---

## Artefact Locations

| Artefact | Location |
|----------|----------|
| Integration contracts | `plans/<feature>-contracts.md` |
| Agent ownership assignments | `plans/<feature>-contracts.md` (append after contracts) |
| Post-session learnings | `improve/lessons.md` (via `/ce:compound`) |
