# Groupon Operating Principles — Architecture Reference

> Source: SKILL.md — enterprise-architect
> These are architecture gates, not guidelines. Every design decision must pass through them.

---

## The 5 Principles as Architecture Filters

### 1. Extreme Ownership

**Rule:** One service, one team, one database. If you cannot name a single owner, the design is not ready.

**Architecture implications:**
- Every service maps to exactly one team in the org chart
- No shared database access — services expose data only via API or event
- Shared ownership is a design smell: if two teams both "own" a service, it needs to be split or ownership reassigned
- Ownership includes build, deploy, and production operation — not just code authorship

**Violation smells:**
- "Team X and Team Y both maintain this"
- Services with no team mapping in the architecture model
- Shared MySQL schemas across team boundaries (Continuum legacy — do not replicate)
- Features owned by a platform team but operated by an application team

**Decision test:** Can you write a single team name next to this service with no qualifiers? If not, resolve ownership before proceeding.

---

### 2. Speed Over Comfort

**Rule:** Encore-first for new builds. Ship increments, not monoliths. Do not wait for a perfect migration plan.

**Architecture implications:**
- New business logic goes on Encore, full stop. "Continuum is easier right now" is comfort, not speed.
- Prefer a working increment on Encore over a complete solution on Continuum
- Strangler fig is the migration pattern: thin typed wrappers first, data migration second, Continuum decommission third
- Do not block shipping on solving every migration dependency at once

**Violation smells:**
- Months of design before any code lands
- "We'll build this on Continuum because migrating the shared MySQL is complex"
- Waiting to ship until the entire domain is migrated
- Perfect becoming the enemy of the good: building a complete new service when a thin wrapper would unblock the team

**Decision test:** Can we ship a working increment on Encore that delivers value to the user today, even if it wraps Continuum? If yes, do that.

---

### 3. Impact Obsessed

**Rule:** Every new service or capability must connect to a measurable business outcome. Vanity services do not get built.

**Architecture implications:**
- Unit economics lens: does this improve gross profit per unit, reduce customer acquisition cost, or increase lifetime value?
- Every new service needs a metric connection: "this reduces merchant onboarding time by X hours" not "this improves the architecture"
- Technical improvements are valid when they reduce operational cost (incident reduction, deployment frequency, on-call load) — but must be quantified
- Architecture work that cannot be tied to a metric is overhead, not investment

**Violation smells:**
- "This is good architecture debt paydown" with no metric
- Services created to "enable future flexibility"
- Refactoring projects with no user-visible or business-measurable outcome

**Decision test:** What changes in the business if this ships? What KPI does it move? If the answer is vague, the proposal is not ready.

---

### 4. Simplify to Scale

**Rule:** Reduce system count. Consolidate before expanding. Fewer services, fewer databases, fewer languages. Reuse Encore shared infrastructure.

**Architecture implications:**
- Before creating a new service, check if an existing service can own this capability
- Reuse Gateway, AuthN/Z, Topics, Audit Log, Websocket, Service Management — do not rebuild
- Three modules in one service is usually better than three microservices
- New languages require explicit justification: TypeScript and Go for Encore, Java and Ruby for Continuum maintenance only
- New databases require explicit justification: PostgreSQL for Encore services, nothing else new

**Collision with Speed Over Comfort:** Simplify to Scale wins. A fast, complex solution is worse than a slightly slower simple one. Speed applies to iteration velocity (ship increments), not to cutting architectural corners (adding complexity to ship faster today).

**Violation smells:**
- "We need our own feature flag system" (4 exist already)
- New language for a 2-person team feature
- A new microservice for what is effectively a new endpoint on an existing service
- Infrastructure rebuilt from scratch when Encore shared services provide it

**Decision test:** What is the simplest change that achieves this capability? Can this be a module in an existing service?

---

### 5. Disciplined

**Rule:** GCP-first, no new AWS. Managed services over self-hosted. Cloud Run over GKE unless proven need. ADRs for every significant decision. Deprecation plans for every decommission.

**Architecture implications:**
- All new resources are on GCP. AWS resources are consolidated toward GCP over time (Strimzi/Conveyor Kafka → GCP migration is the live example)
- Cloud Run is the default compute. GKE is justified only for: Strimzi Kafka operators, data platform batch/Spark, GPU workloads, or legacy Continuum services
- Every significant architecture decision gets an ADR with rationale, alternatives considered, and consequences
- Every decommission has a timeline and a migration plan before shutdown begins
- Feature flags have a removal date when created

**Violation smells:**
- New EC2 instances, RDS, or S3 buckets (AWS resources)
- Self-hosted Kafka, Elasticsearch, or Redis without strong justification
- "We'll write the ADR after we ship"
- Decommission targets without migration plans (Teradata, HDFS, OptimusPrime are examples in flight)
- No removal date on a new feature flag

**Decision test:** Is this on GCP? Is this managed? Does this use Cloud Run? Does it have a written rationale?

---

## Principle Conflict Resolution

When two principles conflict, resolve as follows:

| Conflict | Resolution |
|---------|-----------|
| Speed vs Simplify | **Simplify wins.** Speed applies to iteration velocity, not to adding complexity to ship faster. |
| Speed vs Disciplined | **Disciplined wins** on infrastructure. Speed wins on product scope (ship less, not worse). |
| Impact vs Extreme Ownership | **Extreme Ownership wins.** An impactful feature with unclear ownership is unshippable anyway. |
| Simplify vs Impact | **Impact is the goal; Simplify is the constraint.** If the simplest solution doesn't achieve the impact, add complexity deliberately and document why. |

---

## Quick Application

For any new proposal, score it against the 5 principles before writing a design doc:

```
Extreme Ownership: Team = [name]. DB owned by = [service]. ✅ / ❌
Speed Over Comfort: Platform = Encore / Continuum / MBNXT? Increment or monolith? ✅ / ❌
Impact Obsessed: KPI moved = [metric]. Measurement = [method]. ✅ / ❌
Simplify to Scale: New services = N. Languages = N. DBs = N. Reused infra = [list]. ✅ / ❌
Disciplined: GCP? Managed? Cloud Run? ADR written? Deprecation plan? ✅ / ❌
```

Any ❌ is a blocker before the design proceeds.
