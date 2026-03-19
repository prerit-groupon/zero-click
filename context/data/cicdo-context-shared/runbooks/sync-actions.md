---
description: "Runbook for syncing Actions repos from GitHub.com to GHES."
domain: github
---

# Sync Actions from GitHub.com → GHES

## New Mirror
1. Create repo in GHES under `actions` org
2. `git clone git@github.com:actions/<repo>`
3. `git remote add ghes git@github.groupondev.com:actions/<repo>.git`
4. `git push ghes master:main` (note master→main mapping)
5. `git fetch origin --tags && git push ghes --tags`

## Update Existing
```bash
git pull git@github.com:actions/<repo>
git push ghes master:main
git fetch origin --tags
git push ghes --tags
```
