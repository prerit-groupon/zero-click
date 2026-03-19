---
description: "Runbook for Deploybot alerts. Authorization failures, namespace access, stage promotion."
domain: release-engineering
---

# Deploybot Alerts Runbook

## User Cannot Deploy (Access Denied)
1. Check LDAP group membership
2. Raise ARQ request: `arq.groupondev.com/ra/request/service`
3. Approver uses Okta credentials

## Deployment Flow
1. New release → Deploybot UI → Authorize
2. Staging: us-central1 → eu-west-1
3. Click Promote
4. Production: us-central1 → us-west-1 → us-west-2 → eu-west-1
