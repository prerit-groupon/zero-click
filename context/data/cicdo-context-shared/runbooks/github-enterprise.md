---
description: "Runbook for GHES production infrastructure. HA topology, networking, load balancing."
domain: github
---

# GitHub Enterprise Server Infrastructure

## Topology
```
Internet → GCP Load Balancer → NGINX → GHE Primary
                                     → GHE Replica (HA)
                                     → Backup Instance (DR)
```

## Ports: 80/443 via LB→NGINX→GHE | 8443 admin via NGINX→GHE | 22 SSH direct

## Key Checks
1. GHE Primary health
2. DB replication lag Primary ↔ Replica
3. Backup instance last sync
4. NGINX upstream availability
