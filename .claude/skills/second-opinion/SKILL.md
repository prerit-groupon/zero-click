---
name: second-opinion
description: Get a fast, independent review of a plan, proposal, code snippet, or decision by spawning a separate Claude session. Use for quick one-off reviews of a single file, ADR, or design decision. For thorough pre-merge review of a complete feature, use compound-engineering /ce:review instead. For Groupon architecture reviews, always include query-manifest.mjs output as context.
---

# Second Opinion

Get a fresh, independent review by running a separate Claude CLI session. Useful when you want a genuinely different perspective — the separate session has no memory of the current conversation and cannot be influenced by prior context.

## When to Use vs. Related Skills

| Need | Use |
|------|-----|
| Quick review of a single file, decision, or plan | **This skill** |
| Full pre-merge review of a complete feature | `compound-engineering /ce:review` |
| Architecture design review (Groupon systems) | An architect skill (`/enterprise-architect`, etc.) |

## Workflow

### 1. Prepare the Review Context

Gather relevant context into a compact prompt. Include:
- **Architecture review**: The design proposal, relevant systems from `node context/scripts/query-manifest.mjs`, trade-offs under consideration
- **Security audit**: The code under review, trust boundaries, input handling, auth paths
- **Code review**: The diff or file contents, what the code is supposed to do, Groupon patterns to check against
- **Decision review**: The options considered, the recommendation, and what is being given up

For Groupon architecture reviews, always include the relevant query output before spawning the review session:
```bash
node context/scripts/query-manifest.mjs system <name>
node context/scripts/query-manifest.mjs depends-on <name>
```

### 2. Run the Review

```bash
claude -p "You are a senior Groupon engineer reviewing the following. Be critical and specific.
List concrete issues — not vague concerns. Output: Strengths / Concerns / Recommendations.

Context:
<paste prepared context here>"
```

For security audits:
```bash
claude -p "You are a security engineer. Review the following for: injection vulnerabilities,
auth bypass, secrets exposure, PII handling, GDPR compliance (EMEA), and input validation.
List findings by severity: critical / high / medium / low.

Code:
<paste code here>"
```

### 3. Present Results

1. Flag **critical issues** (security, data loss, correctness) immediately
2. List **actionable recommendations** — "do X instead of Y", never "consider alternatives"
3. Surface any finding missed in the original session

## Review Types

| Type | Focus | Groupon-specific checks |
|------|-------|------------------------|
| Architecture | Platform alignment, boundaries | Encore vs Continuum? Typed wrappers used? Service-owns-database? |
| Security | Auth, injection, secrets | Encore Gateway auth enforced? PII masked? GDPR for EMEA data? |
| Code | Correctness, edge cases | Approved patterns followed? Anti-patterns introduced? |
| Decision / ADR | Trade-offs, migration alignment | Moves toward Encore? New Teradata/AWS dependencies introduced? |

## Tips

- Keep review prompts under 4,000 words for best results
- Include file paths and line numbers for code reviews
- Paste `query-manifest.mjs` output for architecture context — the reviewer cannot run queries independently
- Ask for specific, actionable feedback; generic praise is not useful
