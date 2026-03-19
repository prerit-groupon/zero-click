---
description: "Kubernetes cluster lifecycle management — EKS (AWS) and GKE (GCP) infrastructure, platform services (ArgoCD, OPA, Karpenter, Kafka, Elastic), cluster promotion pipeline"
---

# Kubernetes Platform

## Overview

The **conveyor_k8s** repository manages the end-to-end lifecycle of EKS (AWS) and GKE (GCP) Kubernetes clusters. It encompasses cluster infrastructure provisioning via Terraform, platform service deployment via Ansible, cluster promotion across environments, and AMI/image baking via Packer.

## Key Responsibilities

### Cluster Infrastructure

#### EKS (AWS)
- Terraform modules in `terra-eks/`
- Node group configuration and auto-scaling
- Worker node IAM roles and security groups
- AWS-specific integrations (ALB Ingress Controller, EBS, etc.)

#### GKE (GCP)
- Terraform modules in `terra-gke/`
- Node pool configuration and auto-scaling
- Service account and workload identity setup
- GCP-specific integrations (Cloud Load Balancing, GCS, etc.)

### Platform Services (50+ Ansible Roles)

Core services deployed on all clusters:
- **ArgoCD** — GitOps continuous deployment
- **OPA (Open Policy Agent)** — policy enforcement
- **Wiz** — cloud security posture
- **Elastic Stack** — observability (logs, metrics, traces)
- **Kafka** — event streaming
- **Karpenter** — advanced node auto-scaling (AWS)
- **cert-manager** — TLS certificate lifecycle
- **Prometheus** — metrics collection
- **Flux** — alternative GitOps (if applicable)

Each service has dedicated Ansible roles with idempotent tasks.

### Cluster Promotion Pipeline

Clusters progress through environments in strict order:

```
sandbox → rapid → stable → production
```

- **sandbox:** Experimental features, testing (non-prod data)
- **rapid:** Pre-staging tests, rapid iteration
- **stable:** Production-like environment, stable features
- **production:** Live workloads, highest SLA

Do not skip environments. Test changes at each stage.

### Image Baking

- **Packer** builds AMIs with pre-installed base OS, Docker, kubelet, agents
- Fresh AMI bakes required for production deployments
- Stale AMIs cause node join failures
- AMI versioning via Packer manifest

### Deployed Services

Two key services provisioned by conveyor_k8s:

1. **service-fetcher** — Kubernetes service discovery agent
   - Deploys to all clusters
   - Provides service metadata to Hybrid Boundary

2. **hybrid-boundary-controller** — Kubernetes operator
   - Manages HBU Custom Resource Definitions (CRDs)
   - Creates Internal Load Balancers (ILBs) for services
   - Interfaces with Hybrid Boundary API

## Key Technologies

- **Terraform** — cluster infrastructure
- **Terragrunt** — DRY cluster configuration
- **Ansible** (50+ roles) — platform service deployment
- **Packer** — AMI baking
- **GitHub Actions / Jenkins** — CI/CD
- **Kustomize** — Kubernetes manifest templating (for some services)

## Key Paths

- `terra-eks/` — EKS cluster infrastructure
- `terra-gke/` — GKE cluster infrastructure
- `roles/` — Ansible roles (50+) for platform services
- `group_vars/` — environment-specific service configs
- `playbooks/` — Ansible playbooks orchestrating deployments
- `packer/` — Packer templates for AMI baking

## Dependencies

- **Depends on:**
  - `gcp-landingzone` (org policies, IAM)
  - `terraform-gcp-core` (GCP networking, subnets, DNS)
- **Provides to:**
  - `hybrid-boundary-controller` deployment
  - `service-fetcher` deployment
  - All application platforms (consumed by cmf-helm-charts)

## Environment Progression

- dev/sandbox → rapid (conveyor_k8s rapid clusters) → stable (staging) → production
- Each environment has distinct Ansible group_vars
- Changes tested in dev before stable/production

## Related Documentation

- See [gotchas/kubernetes.md](../gotchas/kubernetes.md) for cluster promotion rules, Ansible testing, and Karpenter warnings
- See [domains/cloud-foundation.md](./cloud-foundation.md) for org policies
- See [domains/infrastructure-networking.md](./infrastructure-networking.md) for networking dependencies
- See [domains/service-mesh.md](./service-mesh.md) for hybrid-boundary-controller and service-fetcher integration

---

**Repository:** `conveyor_k8s`
**Status:** Critical infrastructure path
**Maintainers:** Cloud Platform team
