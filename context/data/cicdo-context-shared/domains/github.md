---
description: "MOC for GitHub domain. Covers GitHub Enterprise Server (GHES), GitHub Actions runners (GHA), CodeRabbit, Actions sync from GitHub.com. Start here when the task involves GHES admin, GHA runner issues, or GitHub infrastructure."
domain: github
repos: ["github_enterprise_config-master", "github-cloud-arc-main"]
---

# GitHub — Map of Content

## What We Own

GitHub Enterprise Server (GHES) and GitHub Actions (GHA) infrastructure at Groupon. Also CodeRabbit integration for AI code review.

## Architecture

### GHES Production
- **GCP Load Balancer** → **NGINX reverse proxy** → **GHE Primary instance**
- **GHE Replica** for high availability (database replication from Primary)
- **Backup instance** for disaster recovery
- HTTP/HTTPS (80, 443) routed through LB → NGINX → GHE
- Admin (8443) routed through NGINX → GHE Primary
- SSH (22) with public key authentication

### GitHub Actions Runners
- **Runner Controller** (Helm-managed) installed in GKE
- **CRDs** (autoscalingrunners) define min/max runners per type
- **Listener pods** connect to GHES via PEM/PAT
- Workflow triggers → Listener → Controller creates runner pod → Job runs → Pod destroyed
- Runner sizes: `s` (1 CPU/3GB), standard (2 CPU/4GB), `l` (4 CPU/8GB), `xl` (8 CPU/16GB)
- Workflow syntax: `runs-on: groupon-runner-sets-xl`

See: [[architecture/github]] for detailed diagrams.

## Runbooks

- [[runbooks/github-enterprise]] — GHES production infrastructure, HA, networking topology
- [[runbooks/gha-runners]] — Runner controller installation, sizing, DinD, inotify, troubleshooting
- [[runbooks/sync-actions]] — Mirroring Actions repos from GitHub.com → GHES

## Gotchas

See [[gotchas/github]] for known failure patterns. Key ones:
- GHA runner controller uses Helm Chart v0.13.1 (customized at github-cloud-arc) — not the upstream chart
- Public repo runner access must be enabled at BOTH Enterprise AND Org level — missing either causes silent failures
- DinD workloads need inotify sysctl tuning (max_user_watches=524288) or builds crash
- Enterprise headless user PAT is used for authentication — if expired, all runners stop
- SSH port 22 conflicts if multiple services listen — GHE expects exclusive SSH access

## Codebases

| Repo | Purpose |
|------|---------|
| `github_enterprise_config-master` | GHES configuration and management |
| `github-cloud-arc-main` | GHA runner controller Helm charts (customized ARC) |

Additional:
- **CodeRabbit**: SOP documentation in `codebases/github/`

All source in: `codebases/github/`

## Key Links

- Grafana (GitHub & GHA): https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/af9matsixik8we/github
- GitHub Org: https://github.groupondev.com/orgs/rapt/repositories
