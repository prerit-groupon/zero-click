---
description: "Runbook for Artifactory operations and AWS→GCP migration."
domain: artifactory
---

# Artifactory Runbook

## Migration Tools (AWS → GCP)

**IMPORTANT**: Always use shell wrappers. Python/JavaScript scripts are deprecated.

### Scanning: `debug_docker.sh`, `debug_npm.sh`
### Distribution: `docker_image_distributor.sh`, `artifact_distributor.sh`, `copy_multiplatform_image.sh`
### Fixes: `fix_manifest_data_v2.py`, `restore_from_trash.sh`

### Environment Variables
```bash
ARTIFACTORY_URL=<target-url>     # Use -new suffix for GCP
ARTIFACTORY_LINK=<link-url>
DRY_RUN=true                     # ALWAYS start with dry run
REGION=<region>
```

## Workflow: Scan → Dry run → Execute → Verify → Fix
