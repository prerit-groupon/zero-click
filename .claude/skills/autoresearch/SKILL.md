---
name: autoresearch
description: Autonomously improve any Claude skill through iterative testing, scoring, and mutation — inspired by Karpathy's autoresearch method. Use this skill whenever the user says "run autoresearch", "auto-improve my skill", "optimize my skill", "autoresearch on my [skill name]", "make my skill better automatically", or any variation of wanting to iteratively and autonomously improve a Claude Code or Cowork skill's quality using measured evaluation criteria. Also trigger when someone mentions "autoresearch", "auto-research", "skill optimization loop", or wants to run an automated improve-test-score cycle on any skill or prompt.
---

# Autoresearch for Skills

Autonomously improve any Claude skill by running it in a loop: test, score, mutate, keep or discard. Inspired by Karpathy's autoresearch — the same "try a small change, measure, keep or revert" loop that took ML training code from baseline to state-of-the-art overnight.

The core idea: instead of you manually tweaking a skill prompt, an agent does it for you. It makes one small change, runs the skill multiple times, scores every output with binary yes/no checks, and decides whether the change helped. Then it does it again. And again. Autonomously, until quality plateaus or hits your target.

## Before You Start

When the user says "run autoresearch on my [skill name]", gather these three things:

1. **Target skill location** — the path to the SKILL.md to improve
2. **Test inputs** — 3-5 realistic prompts that exercise the skill across varied scenarios. These should be the kind of thing a real user would actually say. The user can provide them, or you can help draft them together.
3. **Evaluation criteria** — 3-6 binary (yes/no) questions that define what "good output" means. Read `eval-guide.md` (bundled with this skill) for how to write these well. The sweet spot is 3-6 questions. More than 6 and the skill starts gaming the checklist instead of genuinely improving.

Also confirm:
- **Runs per experiment** (default: 5) — how many times to run the skill per mutation to get a reliable score
- **Max experiments** (default: 10) — when to stop if quality hasn't plateaued
- **Target score** (default: 95%) — stop early if this threshold is hit 3 times in a row

If the user doesn't have eval criteria ready, help them create some. Ask what "good" looks like for their skill, then translate their vibes into specific yes/no questions. Offer to pull from existing style guides or examples if they have them.

## Step 1: Read and Understand the Target Skill

Before touching anything, read the target skill's SKILL.md completely. Understand:
- What the skill does and why
- The expected output format
- Any existing quality checks or constraints
- Edge cases or known failure modes

You cannot improve what you don't understand. Take a moment to really internalize the skill's purpose.

## Step 2: Build the Eval Suite

Convert the user's evaluation criteria into structured binary tests. Each eval must be answerable with yes or no — never use rating scales.

Use this format for each eval:

```
EVAL [N]: [Short descriptive name]
Question: [Yes/no question about the output]
Pass: [What "yes" looks like — one specific sentence]
Fail: [What triggers "no" — one specific sentence]
```

Good evals are:
- **Binary** — yes/no only, never scales
- **Specific** — test one observable thing, not a vibe
- **Distinct** — each eval checks something different (no overlap)
- **Scorable by an agent** — another Claude instance should be able to grade it consistently
- **Hard to game** — the skill can't pass by doing something weird or stilted

Read the bundled `eval-guide.md` for detailed examples across different skill types (copy, visual, code, documents).

Save the eval suite to `eval-criteria.md` in the workspace.

## Step 3: Create the Dashboard

Build a self-contained HTML dashboard file that tracks the autoresearch progress. The dashboard should include:

- **Score progression chart** — line graph showing baseline and each experiment's score over time
- **Experiment status** — green (kept), red (discarded), blue (baseline) status indicators
- **Detailed results table** — each experiment with its score, what was changed, and whether it was kept
- **Per-eval breakdown** — which specific evals are passing/failing across experiments
- **Current status** — what the agent is doing right now

The dashboard should auto-refresh every 10 seconds by reading from a `results.json` file. Save it to the workspace.

Open the dashboard for the user so they can watch progress (or walk away and come back later).

## Step 4: Establish Baseline

Before making any changes:

1. **Back up the original skill** — copy the original SKILL.md to `original-skill-backup.md` so it's never lost
2. **Run the unmodified skill** N times (default: 5) using the test inputs
3. **Score every output** against the eval criteria
4. **Record the baseline score** — this is your starting point
5. **Update the dashboard** with baseline results

Do not proceed to mutations until the baseline is recorded. The baseline anchors everything — without it, you can't tell if changes are helping.

## Step 5: Run the Experiment Loop

This is the heart of autoresearch. Once started, run autonomously — never pause to ask for permission.

For each experiment:

### 5a. Analyze Failures
Look at which evals are failing most often. Read the actual outputs, not just the scores. Understand *why* the skill is producing outputs that fail specific checks.

### 5b. Form a Hypothesis
Pick the most common failure pattern and form a single-change hypothesis. For example: "The skill keeps using buzzwords because there's no banned-words list. Adding one should fix eval 3."

The key constraint: **one change per experiment**. Never make multiple changes at once — you won't know which one helped (or hurt).

### 5c. Implement the Mutation
Make the change to the skill's SKILL.md. Changes might include:
- Adding a specific rule or constraint
- Adding a banned/required word list
- Including a worked example of good output
- Rewording an instruction to be more specific
- Removing an instruction that's causing problems
- Adding structural guidance (word counts, section requirements)

### 5d. Run and Score
Run the mutated skill N times with the same test inputs. Score every output against the eval suite.

### 5e. Keep or Discard
- **Score improved** → Keep the change. This is now the new baseline for the next experiment.
- **Score stayed the same or got worse** → Revert the change. Go back to the previous version.

### 5f. Log the Result
Record the experiment in both `results.json` (for the dashboard) and `changelog.md` with:
- Experiment number
- Score (before → after)
- What was changed and why
- Whether it was kept or discarded
- Which evals improved/regressed

### 5g. Repeat
Go back to 5a with the current best version. Keep going until:
- You hit the target score 3 times in a row
- You've run the max number of experiments
- Score has plateaued (3 experiments with no improvement)

## Step 6: Write the Changelog

The changelog is arguably the most valuable output. It's a complete record of what works and what doesn't for this specific skill. Format each entry like:

```markdown
## Experiment [N] — [Kept/Discarded]
**Score:** [X]% → [Y]%
**Change:** [One sentence describing what was changed]
**Reasoning:** [Why this change was tried — what failure pattern it targeted]
**Result:** [What happened — which evals improved, which regressed]
**Remaining failures:** [What's still failing and possible next steps]
```

This changelog transfers to future models. When smarter models come out, hand them this changelog and they pick up right where the last agent left off.

## Step 7: Deliver Results

When the loop completes, present:

1. **Score summary** — baseline score → final score (e.g., "56% → 92%")
2. **Total experiments** — how many were run
3. **Keep rate** — how many changes were kept vs discarded
4. **Top 3 changes** — the mutations that had the biggest positive impact
5. **Remaining failure patterns** — what's still not passing and ideas for fixing it
6. **File locations:**
   - `improved-skill.md` — the optimized skill (saved separately, original untouched)
   - `original-skill-backup.md` — the original skill for reference
   - `results.json` — structured results data
   - `results.tsv` — tab-separated log of all experiments
   - `changelog.md` — detailed mutation research log
   - `eval-criteria.md` — the eval suite used
   - `dashboard.html` — the visual dashboard

The improved skill is saved as a separate file. The original is never overwritten.

## Important Principles

**One change at a time.** This is non-negotiable. Multiple simultaneous changes make it impossible to attribute improvements. Like a scientist changing one variable per experiment.

**Binary evals only.** Never use rating scales (1-10, 1-5, etc.). Scales introduce variance that drowns out the signal from small improvements. Yes/no gives you a clean, reliable score.

**3-6 eval criteria.** Fewer than 3 and you're not measuring enough. More than 6 and the skill starts optimizing for the test rather than genuinely improving — like a student who memorizes answers without understanding the material.

**Generalize, don't overfit.** The test inputs are a small sample. Every change should make the skill better *in general*, not just for these specific inputs. If a change feels too narrow or fiddly, it probably is. Prefer changes that explain *why* something matters over rigid rules.

**Autonomy once started.** After the user confirms the setup (skill, inputs, evals), the loop runs without interruption. The user can watch the dashboard, walk away, or do something else. Don't stop to ask permission mid-loop.

**Explain the why.** When adding rules or constraints to a skill, always explain the reasoning. Today's LLMs are smart — they respond better to understanding *why* something matters than to rigid MUST/NEVER directives.
