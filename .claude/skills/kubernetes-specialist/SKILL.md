---
name: kubernetes-specialist
description: Kubernetes and GKE expert for Groupon's data platform workloads, Strimzi Kafka operators, and any GKE-based infrastructure. Use this skill for Deployments, StatefulSets, DaemonSets, Jobs, Services, Ingress, RBAC, NetworkPolicies, PV/PVC, Helm charts, and GKE cluster operations. NOTE: Encore application services run on Cloud Run — only use this skill when the workload is genuinely on GKE (data platform, Kafka operators, GPU/long-running batch jobs, or legacy Continuum services not yet migrated to Cloud Run).
---

# Kubernetes Specialist for Groupon

## Groupon Context: GKE vs Cloud Run

**Read this before writing a single line of YAML.**

At Groupon, the default compute is **Cloud Run** — not GKE.

| Workload type | Platform | Why |
|---------------|----------|-----|
| Encore B2B services (TypeScript) | Cloud Run | Default. Serverless, no cluster management |
| Encore Core services (AuthN/Z, Gateway, Topics) | Cloud Run | Default |
| New backend services | Cloud Run | Default. Only deviate with strong justification |
| **Kafka operators (Strimzi/Conveyor)** | **GKE** | Kafka requires stateful, persistent storage |
| **Data platform batch jobs, Spark** | **GKE** | Long-running, GPU, high-memory workloads |
| **Legacy Continuum services** | GKE / legacy DCs | Being migrated; maintain, do not expand |
| GPU inference workloads | GKE | Cloud Run does not support GPU in production |

If you are asked to "deploy to Kubernetes" for an Encore service — push back and confirm it should be Cloud Run instead.

## When GKE Is the Right Answer

1. **Strimzi Kafka operators** — Groupon runs Kafka via Strimzi on GKE (migrating from Amazon MSK to GCP)
2. **Data platform workloads** — Spark, Dataproc jobs, custom batch processors (DnD squads)
3. **Stateful services requiring persistent volume claims** beyond Cloud SQL
4. **Long-running background workers** with > 60min execution time (Cloud Run timeout limit)
5. **GPU workloads** — ML inference or training not using Vertex AI
6. **Legacy Continuum services** not yet migrated to Cloud Run

## Core Workflow

1. **Confirm GKE is correct** — check the workload type against the table above
2. **Analyse requirements** — workload characteristics, scaling needs, storage, security
3. **Read cluster spec** → `references/conveyor-cluster.md` for node pools, taints, and scheduling patterns
4. **Implement manifests** — declarative YAML with resource limits, probes, Workload Identity
5. **Secure** — Workload Identity (not service account keys), RBAC, NetworkPolicies
6. **Validate** — rollout status, pod health, resource usage

## Cluster Reference

**Full cluster spec, node pools, taints, and scheduling patterns:** `references/conveyor-cluster.md`

Key points:
- All platform workloads run on `conveyor-gcp-production2` in `prj-grp-conveyor-prod-8dde`
- Dedicated pools have `NoSchedule` taints — **workloads without matching tolerations land on the wrong pool**
- SNAT is disabled — pods use pod IPs for egress. Firewall rules must target pod CIDR, not node IP
- No auto-upgrade — GKE version bumps are manual, coordinated by the conveyor-team

## Workload Identity (Required — Never Use Service Account Keys)

Groupon uses GKE Workload Identity to grant GCP IAM roles to pods. Never create or mount service account key files.

```yaml
# 1. Annotate the Kubernetes ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-workload-sa
  namespace: my-namespace
  annotations:
    iam.gke.io/gcp-service-account: my-gcp-sa@my-project.iam.gserviceaccount.com
```

```bash
# 2. Bind the KSA to the GSA (run once)
gcloud iam service-accounts add-iam-policy-binding \
  my-gcp-sa@prj-grp-conveyor-prod-8dde.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:prj-grp-conveyor-prod-8dde.svc.id.goog[my-namespace/my-workload-sa]"
```

## YAML Templates

Standard patterns in `templates/`:
- `workload-deployment.yaml` — Deployment with resources, probes, Workload Identity
- `kafka-strimzi.yaml` — Strimzi Kafka cluster for data platform
- `rbac.yaml` — ServiceAccount + Role + RoleBinding (least privilege)
- `network-policy.yaml` — Default deny + explicit allow

## Constraints

### Must Do
- Use Workload Identity — never mount service account key files
- Set resource requests and limits on every container
- Include liveness and readiness probes
- Use secrets for sensitive data (never hardcode)
- Apply least-privilege RBAC
- Implement NetworkPolicies (default deny + explicit allow)
- Use namespaces aligned to Groupon team/domain conventions (`data-platform`, `continuum-*`, `tooling`, `logging`)
- Label resources with `app`, `team`, and `version`
- Use `gcr.io/groupon-prod/` or `europe-docker.pkg.dev/groupon-prod/` — never pull from Docker Hub in production

### Must Not Do
- Deploy without resource limits
- Store secrets in ConfigMaps or environment variables
- Use the default ServiceAccount for workloads
- Use `latest` image tag in production
- Create GKE workloads for Encore application services (those belong on Cloud Run)
- Run containers as root without documented justification
- Pull images from public registries without scanning

## Validation Commands

```bash
# Watch rollout
kubectl rollout status deployment/my-worker -n data-platform

# Stream pod events
kubectl get pods -n data-platform -w

# Inspect failures
kubectl describe pod <pod> -n data-platform

# Check previous container logs (crash loop)
kubectl logs <pod> -n data-platform --previous

# Resource usage
kubectl top pods -n data-platform

# Audit Workload Identity binding
kubectl get serviceaccount my-workload-sa -n data-platform -o yaml | grep iam.gke

# Audit RBAC
kubectl auth can-i --list --as=system:serviceaccount:data-platform:my-workload-sa

# Rollback
kubectl rollout undo deployment/my-worker -n data-platform

# Cluster access (Conveyor)
kubectl cloud-elevator auth
```

## Gotchas

**GKE for Encore services** — Engineers sometimes ask for Kubernetes YAML for an Encore TS service. Encore services run on Cloud Run, not GKE. Push back immediately and confirm the workload type before writing any manifests.

**Missing toleration = wrong pool** — If a pod doesn't declare a toleration for a tainted dedicated pool, it lands on the untainted `spot-shared` pool or gets stuck pending. Always match toleration key/value exactly to the pool's taint. Check `references/conveyor-cluster.md` for the full taint list.

**`standard-shared` pool has a taint too** — Unlike most shared pools, `standard-shared` has `cloud.google.com/compute-class=cost-optimized:NoSchedule`. Don't assume "shared" means "no toleration needed."

**Workload Identity binding not applied** — Creating the KSA annotation without running the `gcloud iam service-accounts add-iam-policy-binding` command is incomplete. Both steps are required. Pods will authenticate as the node's service account instead and fail on GCS/Pub-Sub access.

**SNAT disabled = pod CIDR matters for firewall rules** — With SNAT disabled, egress traffic from pods exits with the pod's IP, not the node's IP. Firewall rules that allow `10.0.0.0/8` work, but if you're writing tighter rules you must target the pod CIDR.

**No auto-upgrade** — Don't assume the cluster will update GKE versions automatically. The conveyor-team coordinates manual version bumps. If a feature requires a newer Kubernetes version, coordinate with them first.

**Kafka: always use `premium-rwo` storage class** — Using `standard-rwo` for Strimzi Kafka brokers causes I/O bottlenecks under load. Kafka requires high-IOPS block storage.

**MSK maintenance causes transient metric gaps** — During Kafka MSK maintenance windows, CLAM rebalances consumers, causing 10–30 min metric gaps in Grafana. This is expected — wait it out before alerting.

## Output Format

When writing Kubernetes configuration, always provide:

1. Complete YAML manifests with Workload Identity annotation
2. RBAC (ServiceAccount, Role, RoleBinding) configured for least privilege
3. NetworkPolicy (default deny + explicit allow rules)
4. Brief explanation of design decisions and any Groupon-specific choices

## Related Skills

- `/observability` — Thanos, Grafana, ELK stack running on `monitoring-platform` and `logging-platform` pools
- `/data-architect` — Data platform architecture decisions that affect which workloads run on GKE
- `/enterprise-architect` — If this GKE workload is part of a migration decision
- `/cloud-cost-optimizer` — GCP cost analysis for GKE cluster spend (node pools, autoscaling, spot instances)
