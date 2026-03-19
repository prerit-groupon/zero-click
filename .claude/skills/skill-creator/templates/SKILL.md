---
name: [skill-name]
description: >-
  [One or two sentences describing when to trigger this skill and what it does.
  Include the most important keywords someone would use to invoke it.
  End with what it does NOT cover, routing to other skills: NOT for X (use /other-skill).]
---

# [Skill Title]

## When to Use vs. Related Skills

<!-- This routing table prevents misuse. Fill it in before writing anything else. -->

| Situation | Use This Skill | Use Instead |
|-----------|---------------|-------------|
| [Primary use case] | ✅ Yes | — |
| [Related but different] | ❌ No | `/[other-skill]` |
| [Overlap with sibling skill] | ❌ No | `/[sibling-skill]` |

---

## Philosophy

<!-- Optional but valuable for architect/workflow skills.
     What mental model should the user bring to this skill?
     What is the ONE thing that makes this skill work well?
     3–5 sentences max. -->

---

## Core Workflow

<!-- The main procedure. Use numbered steps. Keep each step atomic.
     Link to templates/ or references/ where relevant.
     For Groupon skills: always reference the architecture query pattern. -->

### Step 1 — [Name]

Description of what happens in this step.

```bash
# Commands or code blocks for this step
```

### Step 2 — [Name]

### Step 3 — [Name]

---

## [Domain-Specific Section]

<!-- Add sections for the main concepts this skill covers.
     For architect skills: add service/data patterns.
     For workflow skills: add phase descriptions.
     For infrastructure skills: add configuration reference. -->

---

## Common Anti-Patterns

<!-- What does this skill get misused for?
     Each entry: bold title, then 2–3 sentences explaining what goes wrong and why. -->

**[Anti-pattern name]** — Description of the misuse. Explain what actually happens as a result. State what to do instead.

**[Anti-pattern name]** — ...

---

## Groupon Integration

<!-- Where are the relevant files, configs, credentials, and scripts in THIS workspace? -->

| Resource | Location |
|---------|---------|
| [config / credentials] | `tools/[path]/.env` |
| [script] | `tools/[path]/script.js` |
| [related skill] | `/[skill-name]` |

---

<!-- Notes for skill authors:
  - Keep SKILL.md under 500 lines. Move deep content to references/
  - references/ = loaded on demand (deep docs, runbooks, API details)
  - templates/ = copy-paste starting points for users
  - examples/ = end-to-end walkthroughs of a real scenario
  - scripts/ = runnable automation
-->
