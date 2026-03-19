---
description: "Release Engineering architecture. Deploybot authorization flow and regional rollout."
domain: release-engineering
---

# Release Engineering Architecture

## Deploybot Authorization Flow

```
New Release Created
    │
    ▼
Appears in Deploybot UI
    │
    ▼
Deployer clicks "Authorize"
    │
    ▼
Staging Rollout:
    us-central1 → eu-west-1
    │
    ▼
Deployer clicks "Promote"
    │
    ▼
Production Rollout:
    us-central1 → us-west-1 → us-west-2 → eu-west-1
```

## Components

- **Deploybot**: Deployment authorization and stage promotion UI
- **Mergebot**: Automated merge management for release branches
- **Releasegen**: Generates release notes from PRs, JIRA tickets, and deployment data. Java/Maven service with GraphQL API.

## Access Control

- Deployer needs write access to target namespace (LDAP group)
- Approver uses Okta credentials for namespace deployments
- Access requests via ARQ: arq.groupondev.com/ra/request/service
