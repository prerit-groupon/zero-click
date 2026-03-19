---
description: "GitHub architecture overview. GHES HA topology and GHA runner lifecycle."
domain: github
---

# GitHub Architecture

## GHES Production Topology

```
Internet
    │
    ▼
GCP Load Balancer (HTTP/HTTPS: 80, 443)
    │
    ▼
NGINX Reverse Proxy
    │
    ├──► GHE Primary (main instance)
    │       │
    │       ├──► Database Replication ──► GHE Replica (HA)
    │       │
    │       └──► Backup Sync ──► Backup Instance (DR)
    │
    └──► Admin (port 8443) ──► GHE Primary

SSH (port 22) ──► GHE Primary (direct, public key auth)
```

## GHA Runner Lifecycle

```
Workflow triggered (push, PR, etc.)
    │
    ▼
GHES notifies Listener Pod (connected via PEM/PAT)
    │
    ▼
Listener requests runner from Controller (Helm-managed)
    │
    ▼
Controller reads CRD (autoscalingrunners: min/max per type)
    │
    ▼
Runner Pod created in GKE
    │
    ▼
Job assigned to runner, logs stream back to GHA
    │
    ▼
Job completes → Listener destroys pod
```

## Runner Sizes

| Label | CPU | Memory |
|-------|-----|--------|
| groupon-runner-sets-s | 1 | 3GB |
| groupon-runner-sets | 2 | 4GB |
| groupon-runner-sets-l | 4 | 8GB |
| groupon-runner-sets-xl | 8 | 16GB |
