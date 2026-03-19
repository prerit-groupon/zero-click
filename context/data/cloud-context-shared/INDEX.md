# Comprehensive Index — Groupon Cloud Platform

This file provides a detailed index of all 18 repositories, their relationships, and key concepts across the 7 infrastructure layers.

---

## Quick Navigation

- [By Infrastructure Layer](#by-infrastructure-layer)
- [By Repository](#by-repository)
- [By Concept](#by-concept)
- [By Common Task](#by-common-task)
- [Dependencies Graph](#dependencies-graph)

---

## By Infrastructure Layer

### Layer 1: Cloud Foundation (1 repo)

**Purpose:** GCP organization governance, project factory, IAM, shared VPCs, org policies

**Repository:** `gcp-landingzone`
- **Domain MOC:** [domains/cloud-foundation.md](domains/cloud-foundation.md)
- **Gotchas:** [gotchas/cloud-foundation.md](gotchas/cloud-foundation.md)
- **Key Files:** `envs/`, `modules/`, `bin/setup-new-project.py`
- **Bootstrap Sequence:** 0-seed → 1-bootstrap → 2-org → 3-networks
- **Key Concept:** Terraform state management, LDAP IAM groups, shared VPC firewall rules

---

### Layer 2: Infrastructure Networking (1 repo)

**Purpose:** Conveyor VPCs, VPC peering, subnets, Cloud Router, NAT, firewall, DNS

**Repository:** `terraform-gcp-core`
- **Domain MOC:** [domains/infrastructure-networking.md](domains/infrastructure-networking.md)
- **Gotchas:** Referenced in [gotchas/general.md](gotchas/general.md) and [gotchas/kubernetes.md](gotchas/kubernetes.md)
- **Key Files:** `terra-gcp-networks/`, `env/`, `modules/`
- **Key Concept:** Subnet CIDR ranges, VPC peering, Cloud Router, private DNS zones
- **Dependencies:** Depends on gcp-landingzone (shared VPC, org policies)

---

### Layer 3: Kubernetes Platform (1 repo)

**Purpose:** EKS/GKE cluster lifecycle, platform services (50+ Ansible roles), cluster promotion, AMI baking

**Repository:** `conveyor_k8s`
- **Domain MOC:** [domains/kubernetes-platform.md](domains/kubernetes-platform.md)
- **Gotchas:** [gotchas/kubernetes.md](gotchas/kubernetes.md)
- **Key Files:** `terra-eks/`, `terra-gke/`, `roles/` (50+), `group_vars/`, `packer/`
- **Cluster Promotion:** sandbox → rapid → stable → production
- **Key Concept:** Ansible playbooks, Terraform modules, Packer AMI baking, environment-specific vars
- **Dependencies:** Depends on gcp-landingzone, terraform-gcp-core; deploys service-fetcher, hybrid-boundary-controller

---

### Layer 4: Service Mesh & Edge Proxy (7 repos)

**Purpose:** Multi-cloud service mesh, mTLS, edge proxying, service discovery, data classification

**Repositories:**
1. `hybrid-boundary` — AWS service mesh agent (Go, Envoy, Lambda, DynamoDB, Route53)
2. `hybrid-boundary-gcp` — GCP service mesh agent (Go, Envoy, Cloud Functions, Firestore, Cloud DNS)
3. `hybrid-boundary-controller` — K8s operator managing ~422 CRDs (Go, Kubernetes)
4. `service-fetcher` — K8s service discovery agent (Go)
5. `par-automation` — PAR workflow and data classification (Python)
6. `mtls-sidecar` — Envoy mTLS sidecar (Envoy, iptables)
7. `hybrid-boundary-ui` — Self-service portal (Angular)

**Domain MOC:** [domains/service-mesh.md](domains/service-mesh.md)
**Gotchas:** [gotchas/service-mesh.md](gotchas/service-mesh.md)
**Key Concepts:**
- xDS (Extensible Discovery Service) for dynamic Envoy config
- HBU CRDs (HBUCluster, HBUService, HBUPolicy)
- mTLS sidecar injection via cmf-helm-charts
- HTTP/2 opt-in (default: false)
- PAR auto-approval based on data classification
- Service Registry (DynamoDB/Firestore), DNS resolution

**Dependencies:**
- Depends on: conveyor_k8s (cluster infra), cmf-helm-charts (HBU CRD templates)
- Provides to: routing-proxy (backend ILB creation), all applications (mTLS encryption)

---

### Layer 5: Traffic Routing & Proxy (6 repos)

**Purpose:** Public traffic routing, CDN integration, TLS termination, request routing, api-proxy (Vert.x + .flexi)

**Repositories:**
1. `api-proxy` — Request router (Java, Vert.x, .flexi DSL)
2. `proxy-config` — Proxy configuration (JSON)
3. `routing-config-production` — Prod routing rules (.flexi DSL)
4. `routing-config-staging` — Staging routing rules (.flexi DSL)
5. `web-config` — nginx configuration (Mustache templates)
6. `routing-deployment` — K8s deployment (Kustomize, 10 containers)

**Domain MOC:** [domains/routing-proxy.md](domains/routing-proxy.md)
**Gotchas:** [gotchas/routing.md](gotchas/routing.md)
**Traffic Path:** Client → CDN → HB edge proxy → routing-service ILB → nginx (TLS) → api-proxy → backend ILBs
**Key Concepts:**
- Two api-proxy deployments: routing-service (no mTLS) + standalone (with mTLS)
- routing-service ILB is static (not HBU-managed)
- Config repos trigger full deploy chain (Jenkins auto-update image tags)
- .flexi DSL validation: `gradlew validate`
- nginx ↔ api-proxy: HTTP/1.1 on localhost:9000 (no TLS between them)

**Dependencies:**
- Depends on: service-mesh (backend HBU ILBs), cmf-helm-charts (mTLS variant)
- Provides to: All client traffic (public entry point)

---

### Layer 6: Application Deployment (1 repo)

**Purpose:** Standard Helm charts, HBU CRD emission, mTLS sidecar injection, SOX compliance

**Repository:** `cmf-helm-charts`
- **Domain MOC:** [domains/application-deployment.md](domains/application-deployment.md)
- **Key Files:** `common/` (library), `charts/` (framework charts: generic, java, rails, jTier, i-tier)
- **Templates:** `_tls-sidecar.tpl` (mTLS injection)
- **Key Concept:** HBU CRD emission, HTTP/2 opt-in, SOX compliance, Artifactory publishing
- **Helm Values:** `mtls.enabled`, `mtls.http2: false` (default), `hbu.dataClassification`

**Dependencies:**
- Depends on: service-mesh (HBU CRDs, mTLS sidecar implementation)
- Provides to: All Groupon applications (standardized deployment)

---

### Layer 7 (Implicit): AI Coordination

**Purpose:** Self-improving context, skill graph enhancement, interaction scoring

**Resources:**
- `.meta/config.json` — Context metadata, self-improvement cycle
- `.meta/scoring/criteria.md` — 12-question scoring framework
- `.meta/amendments/changelog.md` — Amendment history
- `.meta/observations/log.jsonl` — Interaction logs

**Key Concept:** observe → inspect → amend → evaluate → repeat cycle

---

## By Repository (Summary Table)

| # | Repository | Layer | Purpose |
|----|---|---|---|
| 1 | gcp-landingzone | Cloud Foundation | GCP org governance, project factory |
| 2 | terraform-gcp-core | Infrastructure Networking | Conveyor VPCs, networking |
| 3 | conveyor_k8s | Kubernetes Platform | EKS/GKE clusters, platform services |
| 4 | hybrid-boundary | Service Mesh | AWS service mesh agent |
| 5 | hybrid-boundary-gcp | Service Mesh | GCP service mesh agent |
| 6 | hybrid-boundary-controller | Service Mesh | K8s operator |
| 7 | service-fetcher | Service Mesh | K8s service discovery |
| 8 | par-automation | Service Mesh | PAR workflow |
| 9 | mtls-sidecar | Service Mesh | Envoy mTLS sidecar |
| 10 | hybrid-boundary-ui | Service Mesh | Self-service portal |
| 11 | api-proxy | Traffic Routing | Request router |
| 12 | proxy-config | Traffic Routing | Proxy config |
| 13 | routing-config-production | Traffic Routing | Prod routing rules |
| 14 | routing-config-staging | Traffic Routing | Staging routing rules |
| 15 | web-config | Traffic Routing | nginx config |
| 16 | routing-deployment | Traffic Routing | K8s deployment |
| 17 | cmf-helm-charts | Application Deployment | Standard Helm charts |
| 18 | (CI/CD pipelines) | All Layers | GitHub Actions, Jenkins |

---

## Dependencies Graph

### Critical Cross-Repo Dependencies

| Source | Depends On | Reason |
|--------|-----------|--------|
| terraform-gcp-core | gcp-landingzone | Shared VPC, org policies |
| conveyor_k8s | terraform-gcp-core | Subnet CIDR ranges for GKE |
| hybrid-boundary-controller | cmf-helm-charts | CRD schema compatibility |
| api-proxy (both) | cmf-helm-charts | mTLS sidecar injection |
| routing-config-* | api-proxy | .flexi rules applied to api-proxy |
| service-fetcher | conveyor_k8s | Ansible deployment |

---

**Version:** 2.0.0
**Last Updated:** 2026-03-19
