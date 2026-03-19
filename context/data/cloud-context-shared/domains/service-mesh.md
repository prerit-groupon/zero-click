---
description: "Service mesh and edge proxy layer — Hybrid Boundary (HB), multi-cloud support (AWS + GCP), mTLS sidecar, service discovery, data classification (PAR), self-service portal"
---

# Service Mesh & Edge Proxy

## Overview

The **service mesh** layer is the largest and most complex domain, spanning 7 repositories. It implements Hybrid Boundary (HB) — a multi-cloud service mesh solution providing edge proxying, mTLS encryption, traffic routing, service discovery, and data classification-driven access control. The layer spans AWS (Lambda, DynamoDB, Route53, Envoy) and GCP (Cloud Functions, Firestore, Cloud DNS) with a Kubernetes operator for cluster integration.

## Key Components

### 1. Hybrid Boundary (AWS)
**Repository:** `hybrid-boundary`

Go agent + Envoy sidecar implementation for AWS:
- **Go agent** — service registration, health checks, certificate management
- **Envoy** — Layer 7 proxy, xDS dynamic configuration
- **xDS control plane** — gRPC API for dynamic Envoy configuration (NOT static config files)
- **AWS Lambda integration** — automatic service registration from Lambda functions
- **DynamoDB** — state store for service registry
- **Route53** — DNS resolution for service discovery
- **KMS** — certificate and secret encryption

### 2. Hybrid Boundary GCP
**Repository:** `hybrid-boundary-gcp`

GCP port of Hybrid Boundary:
- **Go agent** — same as AWS implementation
- **Cloud Functions** — replaces Lambda
- **Firestore** — replaces DynamoDB for service registry
- **Cloud DNS** — replaces Route53
- **Cloud KMS** — secret and certificate encryption

### 3. Hybrid Boundary Controller
**Repository:** `hybrid-boundary-controller`

Kubernetes operator managing HBU integration:
- Manages ~422 Custom Resource Definitions (CRDs) in production
- Watches HBU CRDs (HBUCluster, HBUService, HBUPolicy)
- Creates Internal Load Balancers (ILBs) for Kubernetes services
- Calls Hybrid Boundary API to register services in the mesh
- Coordinates cert-manager for mTLS certificates
- **Critical:** CRD changes in this repo require corresponding cmf-helm-charts template updates

### 4. Service Fetcher
**Repository:** `service-fetcher`

Kubernetes native service discovery agent:
- Deployed to all clusters via conveyor_k8s (Ansible)
- Watches Kubernetes Service objects
- Exports service metadata to Hybrid Boundary
- Enables service discovery across clusters and cloud providers
- **Deployment:** Ansible group_vars control image updates (not direct K8s edits)

### 5. PAR Automation
**Repository:** `par-automation`

Platform Access Request (PAR) workflow and data classification:
- Auto-approval workflows for access requests
- Data classification system: C1 (public), C2 (internal), C3 (confidential), SOX, PCI
- Integrates with Service Portal for classification metadata
- **Critical:** Incorrect Service Portal classification → wrong PAR policies
- GHES (GitHub Enterprise Server) PAT expiry affects service-fetcher deployment via GHA

### 6. mTLS Sidecar
**Repository:** `mtls-sidecar`

Envoy-based mTLS sidecar for pod-to-pod encryption:
- Deployed via cmf-helm-charts injection (`_tls-sidecar.tpl`)
- **HTTP/2 OPT-IN (default: false)** — do not assume HTTP/2 is enabled
- ALPN advertises h2,http/1.1 on downstream TLS listeners (by design)
- iptables traffic interception for transparent proxying
- cert-manager integration for certificate rotation
- **Injection location:** cmf-helm-charts `_tls-sidecar.tpl` template

### 7. Hybrid Boundary UI
**Repository:** `hybrid-boundary-ui`

Angular self-service portal:
- Service registration and discovery UI
- PAR request creation and approval workflow
- Data classification management
- Service policy configuration

## Architecture Flow

```
Service A Pod
  ├─ mTLS sidecar (Envoy)
  │  ├─ cert-manager certificates
  │  ├─ iptables transparent proxy
  │  └─ mTLS listener (downstream)
  │
  └─ app container

                ↓ mTLS-encrypted
         Hybrid Boundary Controller
                ↓
           HB xDS control plane
                ↓
         Service Registry
      (DynamoDB/Firestore)
                ↓
         Service Fetcher
      (Kubernetes discovery)
```

## Key Technologies

- **Go** — agent implementation
- **Envoy** — proxy engine
- **Kubernetes** — CRD operators, service discovery
- **cert-manager** — TLS certificate lifecycle
- **iptables** — traffic interception
- **gRPC** — xDS protocol for dynamic config
- **AWS:** Lambda, DynamoDB, Route53, KMS
- **GCP:** Cloud Functions, Firestore, Cloud DNS, Cloud KMS
- **Angular** — self-service UI

## Important Behaviors

### xDS (NOT Static Envoy Config)
Hybrid Boundary uses **gRPC-based xDS** (Extensible Discovery Service) for dynamic Envoy configuration. This is NOT static YAML/JSON — the control plane actively pushes configuration changes to Envoy sidecars in real-time.

### HTTP/2 is OPT-IN
- Default: HTTP/2 disabled on downstream listeners
- HTTP/2 must be explicitly enabled via environment variables or configuration
- ALPN advertises both h2 and http/1.1 regardless of HTTP/2 setting (by design)
- Never assume HTTP/2 availability — always verify configuration

### CRD Schema Evolution
- Changes to HBU CRDs in hybrid-boundary-controller require **immediate, coordinated updates** to cmf-helm-charts
- Both repos must change together — mismatched schemas cause CRD validation failures
- Always check DEPENDENCY_GRAPH.md before merging CRD changes

### Service Fetcher Deployment
- Deployed via Ansible by conveyor_k8s (not direct K8s)
- Image updates: change `group_vars/` in conveyor_k8s, do NOT edit K8s deployment directly
- PAT expiry on GHES affects GHA-based deployments

### PAR Policy Application
- Access policies depend on Service Portal data classification
- Incorrect classification → wrong policy enforcement
- Always verify classification in Service Portal before merging PAR rules

## Cross-Domain Dependencies

- **Depends on:**
  - `conveyor_k8s` (cluster infrastructure, Ansible deployment)
  - `cmf-helm-charts` (mTLS sidecar injection)
  - Cloud Platform networking (VPCs, DNS zones from terraform-gcp-core)

- **Provides to:**
  - All applications (via mTLS sidecar and service discovery)
  - Traffic routing layer (routing-service ILB management)

## Related Documentation

- See [gotchas/service-mesh.md](../gotchas/service-mesh.md) for CRD coupling, HTTP/2 opt-in, PAR classification, xDS dynamics, and service-fetcher deployment
- See [domains/kubernetes-platform.md](./kubernetes-platform.md) for cluster infrastructure and Ansible
- See [domains/application-deployment.md](./application-deployment.md) for mTLS sidecar injection in cmf-helm-charts
- See [domains/routing-proxy.md](./routing-proxy.md) for routing-service ILB and api-proxy integration

---

**Repositories:** `hybrid-boundary`, `hybrid-boundary-gcp`, `hybrid-boundary-controller`, `service-fetcher`, `par-automation`, `mtls-sidecar`, `hybrid-boundary-ui`
**Status:** Critical infrastructure — largest domain
**Maintainers:** Cloud Platform team
