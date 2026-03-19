# Second Opinion Review Prompts — Templates

> Copy the relevant template, fill in the context, and run via `claude -p "..."`.
> Keep prompts under 4,000 words for best results.

---

## Architecture Review Prompt

```
You are a senior Groupon platform engineer reviewing the following architecture proposal.
Be critical and specific. List concrete issues — not vague concerns.

Output format: Strengths / Concerns / Recommendations

Groupon architecture context (from query-manifest.mjs):
<paste: node context/scripts/query-manifest.mjs system <name>>
<paste: node context/scripts/query-manifest.mjs depends-on <name>>

Proposal:
<paste the design doc or proposal here>

Check specifically:
- Platform alignment: is this on Encore (new logic) or Continuum (maintain only)?
- Data ownership: does each service own exactly one database?
- Integration boundaries: are typed wrappers used for Continuum calls (not direct REST)?
- Migration direction: does this move toward Encore, or create new Continuum lock-in?
- Shared services: does this reuse Gateway, AuthN/Z, Topics, Audit Log, or rebuild them?
- Blast radius: how many teams and platforms are affected?
```

---

## Code Review Prompt

```
You are a senior Groupon engineer reviewing the following code change.
Be critical and specific. List findings with file paths and line numbers.

Output format: Strengths / Concerns (by severity: critical/high/medium/low) / Recommendations

Code:
<paste diff or file contents here>

Context:
- Purpose: <what this code is supposed to do>
- Platform: Encore / Continuum / MBNXT
- Service: <service name>

Check specifically:
- Correctness: does it handle edge cases and error paths?
- Groupon patterns: flat modular structure (not deep layers)? Service-owns-database?
- Performance: N+1 queries? Missing Drizzle indexes? Redis TTLs set?
- Feature flags: does any new flag have a removal date?
```

---

## Security Audit Prompt

```
You are a security engineer reviewing the following for vulnerabilities.
List findings by severity: critical / high / medium / low.
For each finding: describe the vulnerability, the exploit path, and the remediation.

Code:
<paste code here>

Context:
- Service: <service name>
- Platform: Encore (TypeScript/Cloud Run) / Continuum (Java or Ruby)
- Handles PII: yes/no
- EMEA traffic: yes/no (GDPR applies if yes)

Check specifically:
- Injection: SQL injection, command injection, path traversal
- Auth bypass: does this rely on Encore Gateway for auth? Is there any direct bypass?
- Secrets exposure: any hardcoded credentials, tokens in logs, or unmasked PII in responses?
- Input validation: are all external inputs validated at the boundary?
- GDPR: if EMEA, is PII masked in logs and responses? Is right-to-deletion supported?
```

---

## ADR / Decision Review Prompt

```
You are a senior Groupon engineer reviewing the following architecture decision record.
Be direct. Identify any decision that violates Groupon's operating principles.

Output format: Endorsement / Concerns / Recommendations

ADR:
<paste ADR here>

Groupon operating principles to check against:
1. Extreme Ownership — is there a single named team owner? Single database owner?
2. Speed Over Comfort — is this Encore-first? Or is Continuum chosen for comfort?
3. Impact Obsessed — is there a named KPI this decision moves?
4. Simplify to Scale — could this be a module in an existing service? Is a new DB justified?
5. Disciplined — GCP-first? Cloud Run over GKE? ADR written before shipping?

Also check:
- Does this create a new Teradata or AWS dependency? (blocked)
- Does this introduce a reverse dependency (Continuum calling Encore)? (blocked)
- Does this skip an existing typed wrapper? (blocked)
```

---

## Plan Review Prompt

```
You are a senior Groupon engineer reviewing the following implementation plan.
Identify gaps, incorrect assumptions, and missing steps. Be specific.

Output format: What's good / What's missing or wrong / Recommended changes

Plan:
<paste plans/<feature>.md here>

Context:
- Feature: <feature name>
- Platform: <Encore / Continuum / MBNXT / cross-platform>
- Team: <team name>

Check specifically:
- Are all Continuum integration points using typed wrappers?
- Is the migration impact section present?
- Are acceptance criteria verifiable (not "it works" but specific assertions)?
- Are rollback steps documented?
- Does the task order have hidden dependencies that would force sequential execution?
```
