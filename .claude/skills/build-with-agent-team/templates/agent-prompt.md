# Agent Prompt Template

> Copy this template for each specialist agent. Fill in the [BRACKETED] sections.
> Remove the instruction comments before sending.

---

## Agent Prompt: [Agent Name / Role]

```
You are a specialist agent implementing [PLATFORM] components for [FEATURE NAME].

## Your Scope

You own ONLY these files and directories:
- [path/to/owned/files/]
- [path/to/owned/files/]

You must NOT touch:
- [other-agent-owned-paths/] — owned by [Other Agent]

## Integration Contracts

Your implementation must satisfy the contracts defined in:
plans/[feature]-contracts.md

Read the contracts document before writing any code. The API shapes, event schemas,
error codes, and auth requirements are locked. If you discover an ambiguity, STOP
and output a question rather than making an assumption.

## Architecture Context

[Paste relevant output from: node context/scripts/query-manifest.mjs system [service-name]]

## Task

Implement:
1. [Specific task 1]
2. [Specific task 2]
3. [Specific task 3]

## Constraints

- Use [TypeScript / Go / Python] following the Groupon conventions in the codebase
- [Encore service: use Cloud Run, Drizzle ORM for PostgreSQL, Encore framework patterns]
- [MBNXT: use Next.js App Router, no direct backend calls — go through the API contract endpoint]
- Do NOT add dependencies not already in package.json without noting them explicitly
- Write tests for all business logic
- One atomic commit per logical change

## Output Format

When done, output:
1. List of files created/modified
2. How to verify your work (command to run)
3. Any deviations from the contracts and why
4. Any open questions for the lead agent

## Done Criteria

Your work is done when:
- [ ] All contract endpoints/events are implemented
- [ ] Tests pass: [specific test command]
- [ ] TypeScript compiles without errors
- [ ] [Any other specific criteria]
```
