# Cloud Platform Architecture

This document describes the architecture of Groupon's cloud infrastructure platform as represented by the repositories in this workspace. It is written for both engineers and AI agents operating across the multi-repository workspace.

---

## Platform Overview

Groupon's cloud platform spans AWS and GCP, serving production traffic across North America and EMEA. The platform provides:

- **GCP organization governance** — folder hierarchy, project provisioning, IAM, shared VPCs
- **Kubernetes cluster management** — EKS (AWS) and GKE (GCP) lifecycle via Terraform and Ansible
- **Service mesh and edge proxy** — Hybrid Boundary for cross-network traffic routing with Envoy
- **Traffic routing** — public traffic flows through Cloudflare/Akamai (CDN, TLS termination) → HB edge proxy (public namespace) → routing-service (nginx + api-proxy Vert.x) → backend services. api-proxy routes requests by realm and path; nginx provides TLS termination within the cluster.
- **Application deployment** — standardized Helm charts, DeployBot, and Kustomize-based pipelines
- **Policy automation** — automated PAR (Policy Access Request) handling for service mesh changes

---

## Architecture Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                     AI Coordination Layer                        │
│                        cloud-ai-root                             │
├──────────────────────────────────────────────────────────────────┤
│                    Application Deployment                        │
│            cmf-helm-charts · deploybot · cloud-ui                │
├──────────────────────────────────────────────────────────────────┤
│                 Traffic Routing & Proxy Layer                    │
│   api-proxy · proxy-config · web-config · routing-config-*      │
│                     routing-deployment                           │
├──────────────────────────────────────────────────────────────────┤
│               Service Mesh & Edge Proxy Layer                   │
│    hybrid-boundary · hybrid-boundary-gcp · hybrid-boundary-     │
│    controller · mtls-sidecar · service-fetcher · par-automation  │
│               hybrid-boundary-ui · hb-cli                       │
├──────────────────────────────────────────────────────────────────┤
│          Kubernetes Cluster Management & Platform               │
│                       conveyor_k8s                               │
├──────────────────────────────────────────────────────────────────┤
│             Infrastructure Networking (GCP)                      │
│                    terraform-gcp-core                             │
├──────────────────────────────────────────────────────────────────┤
│               Cloud Foundation (GCP Org)                         │
│                     gcp-landingzone                               │
└──────────────────────────────────────────────────────────────────┘
```

---

### Layer 1 — Cloud Foundation

**Repository:** `gcp-landingzone`

Manages the GCP organization hierarchy under the Engineering folder:

- Organization and folder structure (Common, DND, Conveyor, Workloads, Partner, Sandbox)
- Org-level policies and constraints
- Seed project and bootstrap service accounts
- ~271 GCP projects across dev, stable, and production
- Project factory using `terraform-google-modules/project-factory`
- Per-project IAM bindings with LDAP group integration
- Shared VPC networks per environment with DNS, NAT, and firewall rules
- Central service account management (`central-sa-{env}` projects)

Foundation modules follow a bootstrap sequence: `0-seed` → `1-bootstrap` → `2-org` → `3-networks`.

**Technologies:** Terraform, Terragrunt, Python, GitHub Actions, Jenkins

---

### Layer 2 — Infrastructure Networking

**Repository:** `terraform-gcp-core`

Manages GCP networking resources specific to Conveyor and Hybrid Boundary, building on top of the landing zone:

- Dedicated Conveyor VPCs per environment and region (`vpc-{env}-{region}`)
- VPC peering with shared VPCs from `gcp-landingzone`
- Subnets for GKE pods, services, and Hybrid Boundary
- Cloud Router, NAT, and firewall rules (LB health checks, Akamai Site Shield, VPN, GKE control plane, edge-proxy)
- Private DNS zones (peering for `groupondev.com`, `group.on`, etc.)
- GCS backup buckets and billing budgets

**Technologies:** Terraform, Terragrunt, Terrabase

**Dependency:** Consumes GCP projects and shared VPCs from `gcp-landingzone`

---

### Layer 3 — Kubernetes Cluster Management & Platform Services

**Repository:** `conveyor_k8s`

Manages the full lifecycle of Kubernetes clusters on AWS (EKS) and GCP (GKE):

**Cluster Infrastructure:**
- EKS provisioning via Terraform/Terragrunt (`terra-eks/`)
- GKE provisioning via Terraform/Terragrunt (`terra-gke/`)
- Machine image baking for EKS nodes via Packer
- Cluster promotion across environments (sandbox → rapid → stable → production)

**Platform Services (50+ Ansible roles):**
- Monitoring, policy enforcement, networking, storage
- ArgoCD, OPA, Wiz, Elastic, Kafka (GCP-specific)
- Karpenter, EBS CSI, CloudWatch (AWS-specific)
- Deploys `service-fetcher`, `hybrid-boundary-controller`, and other platform workloads

**Technologies:** Terraform, Terragrunt, Ansible, Go, Python, Packer, Jenkins, GitHub Actions

**Dependencies:** Uses VPCs and subnets from `terraform-gcp-core` (GCP) and shared VPCs from `gcp-landingzone`

---

### Layer 4 — Service Mesh & Edge Proxy

This layer manages Hybrid Boundary — an Envoy-based edge proxy system that routes traffic between on-prem datacenters, AWS, and GCP.

#### `hybrid-boundary` (AWS)
AWS-specific infrastructure for edge proxies:
- Go agent running Envoy on EC2 instances
- Envoy configuration generated programmatically via `envoyproxy/go-control-plane` and served over xDS (gRPC) — not static config files
- HCM `CodecType: AUTO` on downstream listeners (accepts both HTTP/1.1 and HTTP/2 via ALPN); upstream clusters currently default to HTTP/1.1 (no explicit `http2_protocol_options`)
- Lambda functions for API, DNS (Route53), service discovery, and traffic shifting
- DynamoDB for service registry
- Step Functions for orchestrated traffic migration
- Terraform + Ansible + Packer for infrastructure

#### `hybrid-boundary-gcp` (GCP)
GCP port of Hybrid Boundary using equivalent services:
- Same Go agent and xDS-based Envoy configuration as `hybrid-boundary`
- Cloud Functions for API, DNS (Cloud DNS), and traffic shifting
- Firestore for service registry
- Cloud Workflows for orchestrated migration
- Terraform + Ansible + Packer for infrastructure

#### `hybrid-boundary-controller`
Kubernetes operator (Go, Kubebuilder) running inside Conveyor-managed clusters:
- Watches `HybridBoundaryUpstream` CRDs
- Reconciles K8s Services — creates LoadBalancer (Internal LB) services on both AWS and GCP, with ILB IPs on the HB subnet (e.g. `10.183.x.x`); optionally creates ClusterIP services when Istio gateway mode is enabled
- Creates Istio VirtualServices when gateway mode is enabled
- Calls the Hybrid Boundary API (AWS or GCP) to register services and endpoints
- Manages TTL-based deprecation and cleanup
- In production GKE, manages ~422 HBU objects (306 HTTP, 116 HTTPS), including ~16 services in the HB `public` namespace that are directly reachable from the CDN (Cloudflare/Akamai)

#### `service-fetcher`
Lightweight Go service that provides Kubernetes service discovery:
- Returns ClusterIP for a given service name and namespace
- Called by Hybrid Boundary Lambdas (AWS) and Cloud Functions (GCP) for service resolution
- Deployed by `conveyor_k8s` via Ansible

#### `par-automation`
Policy Access Request automation for Hybrid Boundary:
- Receives PAR requests from `hybrid-boundary-ui`
- Evaluates data classification rules (C1/C2/C3, SOX, PCI) via Service Portal
- Auto-approves or creates Jira tickets for manual review
- Applies approved policies to the Hybrid Boundary API

#### `mtls-sidecar`
Envoy-based mTLS sidecar injected into application pods:
- Init container (`traffic-interceptor`) configures iptables to redirect traffic destined for Hybrid Boundary subnets to the local Envoy proxy
- Envoy sidecar terminates mTLS with HB edge proxies using client certificates (from cert-manager)
- Optionally terminates inbound TLS from HB for HTTPS ingress (`SIDECAR_ENABLE_INBOUND_TLS`)
- HTTP/2 support is opt-in: `SIDECAR_ENABLE_HTTP2` (outbound to HB, default `false`) and `SIDECAR_ENABLE_INTERNAL_HTTP2` (inbound to app, default `false`); wired from Helm values `hybridBoundary.useExternalHTTP2` and `httpsIngress.useHTTP2` respectively
- Downstream TLS listeners advertise `h2,http/1.1` via ALPN regardless of the HTTP/2 env vars
- Circuit breaking, graceful drain, round-robin DNS health checks
- Injected by `cmf-helm-charts` via `_tls-sidecar.tpl`; image versions set by `conveyor_k8s` Ansible `group_vars`
- Enables secure, authenticated communication between K8s workloads and Hybrid Boundary without application code changes

#### `hybrid-boundary-ui`
Angular web application providing self-service management of Hybrid Boundary:
- Traffic management, endpoint configuration, policy requests
- Submits PAR requests to `par-automation`

---

### Layer 5 — Traffic Routing & Proxy

This layer handles HTTP traffic routing for Groupon's web and API domains.

**Full public traffic path:**

```
Client/Browser
    │ HTTPS (HTTP/2 from browser)
    ▼
Cloudflare / Akamai (CDN, TLS termination — migrating to Cloudflare)
    │ HTTP or HTTPS to origin
    ▼
HB Edge Proxy (public namespace)
    │ Routes to routing-service ILB or directly to public HBU services
    ▼
routing-service (Internal LB on HB subnet, e.g. 10.183.10.62)
    │ nginx terminates TLS on port 443
    │ proxies HTTP/1.1 to localhost:9000
    ▼
api-proxy (Vert.x, routing decision based on .flexi rules)
    │ HTTP to backend HBU ILB IPs (direct, no mTLS sidecar)
    ▼
Backend services (HBU ILB → K8s Service → Pod)
```

The routing-service is a static Internal LoadBalancer (not managed by HBU CRD) with `loadBalancerSourceRanges` restricted to the HB subnet. It does **not** have an mTLS sidecar.

Some services also have a `--public` suffix HBU that registers them in the HB `public` namespace, making them directly reachable from the CDN via the HB edge proxy without going through the routing-service.

**Two api-proxy deployments exist:**
1. **routing-service pod** (`routing-service-production` namespace) — managed by `routing-deployment` (Kustomize). The api-proxy container runs alongside nginx within a multi-container pod. No mTLS sidecar. Connects to backends via HBU ILB IPs over HTTP/1.1.
2. **Standalone api-proxy** (`api-proxy-production` namespace) — managed by `cmf-helm-charts` (Helm). Has its own HBU, mTLS sidecar (`SIDECAR_ENABLE_HTTP2: true`), and inbound TLS on port 9443.

#### `api-proxy`
Java Vert.x application that serves as the central proxy for API and web traffic:
- Routes requests to backend services based on realm (country/locale) and path
- Client identification, authentication, and rate limiting via Redis
- In the routing-service pod: deployed alongside nginx, telegraf, logstash, and filebeat (6 containers total)
- In the standalone deployment: deployed with mTLS sidecar, accepts traffic from HB via Envoy on port 9443
- Reads routing config from mounted volumes

#### `proxy-config`
JSON configuration for the api-proxy runtime:
- Verticle deployment settings, proxy behavior, realms, destinations
- Separate configs for non-K8s (UAT, production) and K8s (UAT, staging, production) deployments
- Jenkins builds Docker images and updates `routing-deployment` Kustomize overlays

#### `routing-config-production` / `routing-config-staging`
Routing rules in the Grout `.flexi` DSL:
- Per-application route definitions (Next.js, checkout, merchant tools, etc.)
- Per-country host configurations and layers
- Jinja2 templating for environment-specific variations
- Jenkins builds Docker images and pushes image tag updates to `routing-deployment`
- Staging is the validation environment before production

#### `web-config`
Nginx configuration generator (also referred to as "Grout" in the context of the routing-service pod):
- Mustache templates rendered from YAML data files
- Virtual hosts, rewrite rules, access control, error pages
- nginx listens on port 443 with TLS (cert-manager certificates) and proxies to api-proxy on localhost:9000 using `proxy_http_version 1.1`
- Includes a Go tool for processing redirect Jira tickets
- Supports both on-prem (Fabric) and cloud (Docker + Kustomize) deployment

#### `routing-deployment`
Kustomize-based Kubernetes deployment for the routing service stack:
- Combines `api-proxy`, `proxy-config`, `routing-config`, and `web-config` into a single pod
- 4 init containers copy configs from Docker images into shared emptyDir volumes: `web-config`, `proxy-config`, `routing-config`, `jolokia-agent`
- 6 runtime containers: `nginx` (TLS termination + reverse proxy), `api-proxy` (routing), `telegraf` (metrics), `logstash-kafka-forwarder` (log shipping), `logstash-canary`, `filebeat` (log collection)
- Base + overlays per region and environment (staging and production across AWS and GCP)
- Deployed by DeployBot using `kustomize build | kubectl apply`
- The routing-service K8s Service is an Internal LoadBalancer with source range restricted to the HB subnet (`10.183.16.0/24` in production GKE)

---

### Layer 6 — Application Deployment

#### `cmf-helm-charts`
Cloud Migration Factory Helm charts — the standard packaging for Groupon services on Kubernetes:
- Library chart (`common`) with shared templates for Deployments, Services, HPA, HBU, etc.
- Framework-specific charts: generic, Java, JTier, Ruby on Rails, I-Tier
- Emits `HybridBoundaryUpstream` CRDs consumed by `hybrid-boundary-controller`
- Published to Artifactory; consumed by application repos via DeployBot and Raptor

#### `deploybot`
Deployment orchestration service for SOX-compliant deployments:
- Handles cap, uberdeploy, napistrano, and Kubernetes deployment strategies
- Integrates with GitHub webhooks, Jira, Slack, PagerDuty
- Triggered by deploy tags in `routing-deployment` and application repos

---

### Layer 7 — AI Coordination

**Repository:** `cloud-ai-root`

This repository. Provides architecture documentation, repository routing rules, and Cursor rules for AI agents navigating the multi-repository workspace.

---

## Cross-Repository Interaction Map

### Infrastructure Flow

```
gcp-landingzone
    │ provisions projects, shared VPCs, IAM
    ▼
terraform-gcp-core
    │ creates Conveyor VPCs, subnets, peering, DNS
    ▼
conveyor_k8s
    │ creates GKE/EKS clusters in Conveyor VPCs
    │ deploys platform services via Ansible
    ├──► hybrid-boundary-controller (operator in cluster)
    ├──► service-fetcher (service discovery in cluster)
    └──► cmf-helm-charts (application deployments)
```

### Service Mesh Flow

```
hybrid-boundary (AWS) ◄──┐
hybrid-boundary-gcp ◄────┤── hybrid-boundary-controller
                          │   (K8s operator reconciles HBU CRDs
                          │    → registers with HB API)
                          │
mtls-sidecar ─────────────┤── Envoy sidecar in app pods
                          │   establishes mTLS with HB edge proxies
                          │   (injected by cmf-helm-charts)
                          │
service-fetcher ──────────┤── called by HB Lambdas/Cloud Functions
                          │   for service IP discovery
                          │
par-automation ───────────┤── called by hybrid-boundary-ui
                          │   for policy access requests
                          │
cmf-helm-charts ──────────┘── emits HBU CRDs + injects mTLS sidecar
```

### Routing Config Flow

```
routing-config-staging ───┐
routing-config-production ┤── Jenkins builds Docker images
proxy-config ─────────────┤   and pushes tag updates to
web-config ───────────────┘   routing-deployment
                              │
                              ▼
                        routing-deployment
                              │ Kustomize base + overlays
                              │ DeployBot deploy tags
                              ▼
                        K8s clusters (routing-service-production namespace)
                              │ Init containers: web-config, proxy-config,
                              │   routing-config, jolokia-agent
                              │ Containers: nginx, api-proxy, telegraf,
                              │   logstash-kafka-forwarder, logstash-canary,
                              │   filebeat
                              │ Service: Internal LB (HB subnet only)
                              ▼
                        api-proxy (runtime)
                              reads configs from shared volumes,
                              routes traffic to backend HBU ILBs
```

### Public Traffic Flow

```
Client/Browser
    │ HTTPS
    ▼
Cloudflare / Akamai (TLS termination)
    │ HTTP or HTTPS to origin
    ▼
HB Edge Proxy (public namespace, Envoy CodecType: AUTO)
    ├──► routing-service ILB (10.183.x.x, port 443)
    │    → nginx (TLS) → api-proxy → backend HBU ILBs
    │
    └──► Public HBU services directly (services registered
         with namespace: public, e.g. webbus--public)
```

---

## Environment Model

All repositories share a consistent environment progression:

| Environment | Purpose | Trigger |
|---|---|---|
| `sandbox` / `dev` | Development, PR validation | PR merge or manual |
| `rapid` | Early promotion (conveyor_k8s only) | Pipeline promotion |
| `staging` / `stable` | Pre-production validation | Tag-based deploy |
| `production` | Live traffic | Tag-based with manual approval |

**Regions:**
- **AWS:** `us-west-1`, `us-west-2`, `eu-west-1`
- **GCP:** `us-central1`, `europe-west1`

---

## Development Workflows

### Adding a new GCP project
1. Run `python3 bin/setup-new-project.py` in `gcp-landingzone`
2. Configure `account.hcl` with APIs, VPC, LDAP groups
3. PR → GitHub Actions plan → manual approval → apply

### Creating or modifying a K8s cluster
1. Edit Terraform in `terra-eks/` or `terra-gke/` within `conveyor_k8s`
2. For GCP, may need new VPC/subnet in `terraform-gcp-core` first
3. Jenkins pipeline runs plan → apply

### Deploying a new platform service
1. Create Ansible role in `conveyor_k8s/conveyor_provisioning_playbook/roles/`
2. Wire into `kube.yml` via `install_<role>.yml`
3. PR triggers playbook detection and execution on dev clusters

### Changing routing rules
1. Edit `.flexi` files in `routing-config-staging` first
2. Validate in staging, then apply same change to `routing-config-production`
3. Jenkins auto-builds images and updates `routing-deployment` overlays
4. DeployBot deploys to clusters

### Modifying Hybrid Boundary infrastructure
1. Edit Terraform/Lambda/Cloud Functions in `hybrid-boundary` (AWS) or `hybrid-boundary-gcp` (GCP)
2. Tag-based deployment via Jenkins
3. Test in sandbox/dev → promote to staging → production

### Deploying an application service
1. Configure `.deploy_bot.yml` and Helm values in the application repo
2. Use `cmf-helm-charts` for chart selection (generic, java, jtier, etc.)
3. DeployBot orchestrates SOX-compliant deployment to clusters

---

## Guidance for AI Agents

When operating in this workspace:

1. **Always start here.** Read this file and `repositories.json` before analyzing any code.
2. **Read `DEPENDENCY_GRAPH.md`** to understand cross-repository relationships before suggesting changes.
3. **Respect layer boundaries.** Changes in one layer rarely require changes in another. Identify the correct layer first.
4. **Detect cross-repository impacts.** A change to `proxy-config` triggers a Jenkins build that updates `routing-deployment`. A change to `cmf-helm-charts` affects all application deployments. Always trace the downstream impact.
5. **Check the environment.** Infrastructure tasks are always scoped to an environment (dev/stable/prod). Confirm the target environment before suggesting changes.
6. **Distinguish staging from production.** Routing config has separate repos per environment. Changes must be validated in staging before production.
7. **Follow existing patterns.** Each repository has established conventions. Match existing code style.
8. **Consult `AGENT_ROUTING_RULES.md`** when deciding which repository to analyze.
9. **Never apply infrastructure changes directly.** All changes go through PR → review → CI pipeline.
10. **Trace the full deployment path.** Understand how a code change becomes a deployed artifact — through Jenkins, Docker images, Kustomize, and DeployBot.
