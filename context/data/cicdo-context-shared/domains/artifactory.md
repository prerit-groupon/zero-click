---
description: "MOC for Artifactory domain. Covers JFrog Artifactory on GCP, Docker/NPM artifact management, AWS→GCP migration. Start here when the task involves artifact hosting, repository management, or Artifactory infrastructure."
domain: artifactory
repos: ["artifactory-gcp-vm-main"]
---

# Artifactory — Map of Content

## What We Own

JFrog Artifactory at Groupon: artifact hosting (Docker images, NPM packages, Maven artifacts) running on GCP VMs. Currently in AWS→GCP migration.

## Architecture

- **Artifactory** running on GCP VMs (not Kubernetes)
- **NGINX** as reverse proxy in front of Artifactory
- Docker, NPM, and Maven repositories
- Migration from AWS to GCP in progress — dual-environment during transition

## Runbooks

- [[runbooks/artifactory]] — Migration scripts (Docker/NPM distribution), manifest fixes, scanning, restore

Key migration tools:
- `docker_image_distributor.sh` — Docker image distribution (use this, not Python scripts)
- `artifact_distributor.sh` — General artifact migration
- `copy_multiplatform_image.sh` — Cross-platform Docker images
- `debug_docker.sh` / `debug_npm.sh` — Scanning and comparison
- `fix_manifest_data_v2.py` — Manifest repairs
- `restore_from_trash.sh` — Restore accidentally deleted artifacts
- Always use `-new` suffix for GCP Artifactory URLs
- Always run with `DRY_RUN=true` first

## Gotchas

See [[gotchas/general]] for cross-cutting issues. Artifactory-specific:
- ALWAYS use shell wrappers over deprecated Python/JavaScript scripts
- Avoid v2 JavaScript comparison scripts — they're deprecated
- GCP URLs use `-new` suffix (e.g., `artifactory-new.groupondev.com`)
- Attestation integrity must be verified post-migration

## Codebases

| Repo | Purpose |
|------|---------|
| `artifactory-gcp-vm-main` | Artifactory GCP VM setup, NGINX config, bootstrap |

All source in: `codebases/artifactory/`

## Key Links

- Artifactory: https://artifactory.groupondev.com/
- Grafana: https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/d/artifactory-metrics-gcp/artifactory-vm-gcp?orgId=1
- GitHub Org: https://github.groupondev.com/orgs/artifactory/repositories
