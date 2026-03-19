---
description: "Runbook for GHA runner controller and runners. Installation, sizing, DinD, troubleshooting."
domain: github
---

# GitHub Actions Runners Runbook

## Runner Sizes
| Label | CPU | Memory |
|-------|-----|--------|
| groupon-runner-sets-s | 1 | 3GB |
| groupon-runner-sets | 2 | 4GB |
| groupon-runner-sets-l | 4 | 8GB |
| groupon-runner-sets-xl | 8 | 16GB |

Workflow: `runs-on: groupon-runner-sets-xl`

## Controller: `helm install runners-ctlr . --namespace [runner-sets-dev|runner-sets-production]`

## Enable at BOTH Enterprise AND Org level for public repos

## DinD: Requires `sysctl -w fs.inotify.max_user_watches=524288`

## Auth: Enterprise headless user PAT — if expired, ALL runners stop

## Troubleshooting
- Jobs not picked up: Check listener pod logs, PAT validity
- Pods failing: Check GKE capacity, resource limits
- DinD failures: Verify inotify limits, privileged mode
- Scaling: Check CRD min/max in autoscalingrunners
