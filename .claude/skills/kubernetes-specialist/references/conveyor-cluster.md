---
description: "Conveyor production GKE cluster — full spec, node pools, taints, security posture, and scheduling patterns"
---

# Conveyor Production Cluster — `conveyor-gcp-production2`

**The primary Groupon GKE cluster.** All platform workloads (Kafka, monitoring, logging, MBNXT, CI/CD) run here.

## Cluster Specification

| Property | Value |
|----------|-------|
| **Project** | `prj-grp-conveyor-prod-8dde` |
| **Region** | `us-central1` (zones: `us-central1-a`, `us-central1-c`, `us-central1-f`) |
| **Kubernetes version** | `1.33.5-gke.2326000` (cluster) / `1.33.4-gke.1036000` (nodes) |
| **Release channel** | None — manual version management, no auto-upgrade |
| **Workload Identity pool** | `prj-grp-conveyor-prod-8dde.svc.id.goog` |
| **Node service account** | `project-service-account@prj-grp-conveyor-prod-8dde.iam.gserviceaccount.com` |
| **Network** | Shared VPC — `vpc-prod-sharedvpc01` (`prj-grp-shared-vpc-prod-2511`) |
| **Subnetwork** | `sub-vpc-prod-sharedvpc01-us-central1-conveyor` |
| **Cluster type** | Private (private nodes + private endpoint) |
| **Master authorized networks** | `10.0.0.0/8` only |
| **Autoscaling profile** | `optimize-utilization` |
| **VPA** | Enabled |
| **Managed Prometheus** | Enabled |
| **SNAT** | Disabled (`--disable-default-snat`) — pods use pod IPs for egress |
| **Maintenance window** | 03:00–07:00 UTC, daily (all days) |
| **Tags** | `gke-conveyor-gcp-production2`, `conveyor-gke`, `ingress-tcp-6443` |

---

## Node Pools

Each dedicated pool has a `NoSchedule` taint. **Workloads must declare matching tolerations to land on a specific pool.** Shared pools have no dedicated taint and accept general workloads.

| Pool | Machine Type | vCPU / RAM | Disk | Nodes (init) | Autoscale | Taint | Purpose |
|------|-------------|-----------|------|-------------|-----------|-------|---------|
| `relevance-platform` | `e2-highmem-8` | 8 / 64 GB | 30 GB pd-standard | 24 | 0–300 | `type=relevance-platform:NoSchedule` | Relevance / search workloads |
| `monitoring-platform` | `e2-highmem-16` | 16 / 128 GB | 45 GB pd-standard | 1 | 0–50 | `type=monitoring-platform:NoSchedule` | Thanos, Grafana, Alertmanager |
| `logging-platform` | `e2-custom-12-98304` | 12 / 96 GB | 35 GB pd-standard | 1 | 0–300 | `type=logging-platform:NoSchedule` | Elasticsearch, Logstash, Filebeat |
| `kafka-platform` | `e2-custom-12-65536` | 12 / 64 GB | 30 GB pd-standard | 1 | 0–300 | `type=kafka-platform:NoSchedule` | Strimzi Kafka brokers |
| `mbnext-platform` | `c2d-standard-32` | 32 / 128 GB | 80 GB pd-standard | 1 | 0–300 | `type=mbnext-platform:NoSchedule` | MBNXT Next.js / SSR (on-demand) |
| `mbnext-platform-spot` | `c2d-standard-32` | 32 / 128 GB | 80 GB pd-standard | 0 | 0–300 | `type=mbnext-platform:NoSchedule` | MBNXT overflow (spot, same taint) |
| `standard-shared` | `e2-standard-32` | 32 / 128 GB | 100 GB pd-balanced | 73 | 0–100 (BALANCED) | `cloud.google.com/compute-class=cost-optimized:NoSchedule` | General cost-optimised on-demand |
| `spot-shared` | `t2d-standard-4` | 4 / 16 GB | 100 GB pd-balanced | 40 | 0–100 | _(none)_ | General spot — fault-tolerant workloads only |
| `spot-shared-t2d` | `t2d-standard-32` | 32 / 128 GB | 100 GB pd-balanced | 0 | 0–100 | `cloud.google.com/compute-class=cost-optimized:NoSchedule` | Large spot (T2D AMD) |
| `spot-shared-n2d` | `n2d-standard-32` | 32 / 128 GB | 100 GB pd-balanced | 0 | 0–100 | `cloud.google.com/compute-class=cost-optimized:NoSchedule` | Large spot (N2D AMD) |
| `spot-shared-c2d` | `c2d-standard-32` | 32 / 128 GB | 100 GB pd-balanced | 0 | 0–100 | `cloud.google.com/compute-class=cost-optimized:NoSchedule` | Large spot (C2D compute-optimised) |
| `standard-standalone` | `e2-custom-8-40960` | 8 / 40 GB | 100 GB pd-balanced | 0 | 0–100 (BALANCED) | `type=standard-standalone:NoSchedule` | Isolated single-tenant workloads |
| `cicd-platform` | `c2d-highcpu-32` | 32 / ~64 GB | 150 GB pd-balanced | 0 | 0–100 | `type=cicd-platform:NoSchedule` | CI/CD build runners |

---

## Pool Scheduling Patterns

### Dedicated pool (requires toleration + nodeSelector)

```yaml
tolerations:
  - key: "type"
    operator: "Equal"
    value: "kafka-platform"
    effect: "NoSchedule"
nodeSelector:
  node_pool: kafka-platform
```

### MBNXT (on-demand and spot pools share the same taint)

```yaml
tolerations:
  - key: "type"
    operator: "Equal"
    value: "mbnext-platform"
    effect: "NoSchedule"
nodeSelector:
  node_pool: mbnext-platform   # or mbnext-platform-spot
```

### Cost-optimised shared pool (`standard-shared` and `spot-shared-*`)

```yaml
tolerations:
  - key: "cloud.google.com/compute-class"
    operator: "Equal"
    value: "cost-optimized"
    effect: "NoSchedule"
```

### Spot-shared (no taint — use for fault-tolerant batch/workers)

```yaml
# No toleration needed. Add spot interruption handler.
nodeSelector:
  node_pool: spot-shared
```

---

## Security Posture

- **Private cluster**: nodes have no public IPs; control plane endpoint is private
- **Master authorized networks**: `10.0.0.0/8` (RFC-1918 only — no public internet access to API server)
- **Workload Identity**: enabled — use `prj-grp-conveyor-prod-8dde.svc.id.goog` pool
- **Shielded nodes**: integrity monitoring enabled, secure boot disabled
- **Binary Authorization**: `EVALUATION_MODE_UNSPECIFIED` (audit mode)
- **Security posture / vuln scanning**: disabled (managed separately)
- **SNAT disabled**: pods retain pod IP for egress — firewall rules must target pod CIDR, not node IP
- **No auto-upgrade**: version bumps are manual and coordinated by the conveyor-team

---

## Cluster Monitoring & Logging

Managed Prometheus is enabled. The following metrics components are scraped by GKE:

```
SYSTEM, API_SERVER, SCHEDULER, CONTROLLER_MANAGER, STORAGE,
POD, DEPLOYMENT, STATEFULSET, DAEMONSET, HPA, CADVISOR
```

**Pool assignment for observability workloads:**
- Thanos, Grafana → `monitoring-platform` pool
- Elasticsearch, Logstash → `logging-platform` pool

---

## Namespace Conventions

| Namespace | Owner | Purpose |
|-----------|-------|---------|
| `data-platform` | DnD squads | Kafka, Spark, ingestion |
| `continuum-*` | Platform team | Legacy Continuum services |
| `tooling` | CICDO | Internal tools and operators |
| `logging` | CICDO | ELK stack, Filebeat, Elastic Agent, Grafana |

---

## Storage Classes

| Class | Use for |
|-------|---------|
| `standard-rwo` | General ReadWriteOnce (default) |
| `premium-rwo` | High-IOPS for Kafka brokers, Zookeeper |
| `standard-rwx` | ReadWriteMany (NFS-backed, rare) |

For Strimzi Kafka: always use `premium-rwo` for broker storage.
