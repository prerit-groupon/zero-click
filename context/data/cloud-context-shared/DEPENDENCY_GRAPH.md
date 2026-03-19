# Cross-Repository Dependency Graph

This document maps how repositories in the workspace depend on and interact with each other. AI agents must read this before suggesting changes to understand downstream impacts.

---

## Full Dependency Graph

```
gcp-landingzone
├──► terraform-gcp-core (uses projects, shared VPCs)
│       ├──► conveyor_k8s (uses Conveyor VPCs, subnets for GKE)
│       └──► hybrid-boundary-gcp (uses Conveyor projects, VPCs)
├──► conveyor_k8s (uses GCP projects for GKE clusters)
└──► hybrid-boundary (uses GCP project IAM, LDAP groups)

conveyor_k8s
├──► hybrid-boundary-controller (deployed as Ansible role)
├──► service-fetcher (deployed as Ansible role)
└──► [application workloads via cmf-helm-charts]

hybrid-boundary (AWS)
├──► service-fetcher (Lambda calls for service discovery)
├──◄ hybrid-boundary-controller (operator calls HB API)
└──◄ mtls-sidecar (Envoy sidecar establishes mTLS with edge proxies)

hybrid-boundary-gcp (GCP)
├──► service-fetcher (Cloud Function calls for service discovery)
├──◄ hybrid-boundary-controller (operator calls HB API)
└──◄ mtls-sidecar (Envoy sidecar establishes mTLS with edge proxies)

hybrid-boundary-controller
├──◄ cmf-helm-charts (HBU CRDs emitted by Helm templates)
└──◄ par-automation (applies policies via HB API)

mtls-sidecar
├──◄ cmf-helm-charts (injected via _tls-sidecar.tpl)
├──◄ conveyor_k8s (image versions in Ansible group_vars, pre-pull)
└──► hybrid-boundary / hybrid-boundary-gcp (mTLS to edge proxies)

par-automation
├──► hybrid-boundary API (applies policies)
└──◄ hybrid-boundary-ui (receives PAR requests)

routing-config-staging ────► routing-deployment (image tag updates via Jenkins)
routing-config-production ─► routing-deployment (image tag updates via Jenkins)
proxy-config ──────────────► routing-deployment (image tag updates via Jenkins)
web-config ────────────────► routing-deployment (image tag updates via Jenkins)

routing-deployment
└──► K8s clusters (Kustomize + DeployBot deploy)
        └──► routing-service pod (nginx + api-proxy + telegraf +
                logstash + filebeat)
                ├── Exposed via Internal LB (HB subnet only)
                ├──◄ hybrid-boundary / hybrid-boundary-gcp
                │    (HB edge proxy routes public traffic to ILB)
                └──► backend HBU ILBs
                     (api-proxy routes to backend services)
```

---

## Pipeline Trigger Chains

These are the automated chains where a merge in one repository triggers builds or deployments in another.

### Routing Config → Routing Deployment → K8s Clusters

```
routing-config-staging (merge to master)
    │ Jenkins: build Docker image, push
    │ Clone routing-deployment
    │ Run update_deployment.sh
    │ Update staging overlay image tags
    │ Commit, push, create deploy tags
    ▼
routing-deployment (staging overlays updated)
    │ DeployBot picks up deploy tags
    ▼
K8s clusters (staging regions: us-west-1, us-west-2, us-central1, europe-west1)
```

```
routing-config-production (merge to master)
    │ Jenkins: build Docker image, push
    │ Clone routing-deployment
    │ Run update_deployment.sh
    │ Update production overlay image tags
    │ Commit, push, create deploy tags
    ▼
routing-deployment (production overlays updated)
    │ DeployBot picks up deploy tags
    ▼
K8s clusters (production regions: us-west-1, eu-west-1, us-central1, europe-west1)
```

### Proxy Config → Routing Deployment → K8s Clusters

```
proxy-config (merge to master)
    │ Jenkins: build Docker images (uat, staging, production)
    │ Clone routing-deployment
    │ Run update_deployment.sh
    │ Update overlay image tags
    │ Commit, push, create deploy tags
    ▼
routing-deployment (overlays updated)
    │ DeployBot
    ▼
K8s clusters
```

### Web Config → Routing Deployment → K8s Clusters

```
web-config (merge to master)
    │ Jenkins: Docker Compose builds per env
    │ Clone routing-deployment
    │ Run update_deployment.sh
    │ Update overlay image tags
    │ Commit, push, create deploy tags
    ▼
routing-deployment (overlays updated)
    │ DeployBot
    ▼
K8s clusters
```

### CMF Helm Charts → Application Repos → K8s Clusters

```
cmf-helm-charts (release)
    │ Publish to Artifactory
    │ Update raptor-templates with new chart version
    ▼
Application repos (reference cmf-helm-charts)
    │ DeployBot orchestrates deployment
    ▼
K8s clusters
    ├── HBU CRDs created → hybrid-boundary-controller reconciles → HB API
    └── mtls-sidecar injected → Envoy establishes mTLS with HB edge proxies
```

### mtls-sidecar Image → conveyor_k8s → cmf-helm-charts → Application Pods

```
mtls-sidecar (tag release v*.*.*)
    │ Jenkins: build multi-arch Docker images
    │ Push to docker.groupondev.com/service-mesh/hybrid-boundary/
    ▼
conveyor_k8s (Ansible group_vars)
    │ Sets init_container_image and sidecar_container_image versions
    │ Pre-pulls images on cluster nodes
    ▼
cmf-helm-charts (_tls-sidecar.tpl)
    │ Injects traffic-interceptor init container + envoy sidecar
    ▼
Application pods (mTLS sidecar active)
    │ iptables intercepts HB-bound traffic
    │ Envoy terminates mTLS with HB edge proxies
    ▼
hybrid-boundary / hybrid-boundary-gcp (edge proxies)
```

### Public Traffic Flow (Runtime)

```
Client/Browser
    │ HTTPS (HTTP/2 from modern browsers)
    ▼
Cloudflare / Akamai (CDN, TLS termination — migrating to Cloudflare)
    │ HTTP or HTTPS to origin
    ▼
hybrid-boundary / hybrid-boundary-gcp (HB edge proxy, public namespace)
    │ Envoy routes based on service registry
    │ CodecType: AUTO (accepts HTTP/1.1 and HTTP/2 via ALPN)
    │
    ├──► routing-service ILB (static, not HBU-managed)
    │    e.g. 10.183.10.62, loadBalancerSourceRanges: HB subnet
    │    │ nginx terminates TLS on 443
    │    │ proxies HTTP/1.1 to api-proxy on localhost:9000
    │    ▼
    │    api-proxy (Vert.x, routing decision via .flexi rules)
    │    │ HTTP to backend HBU ILB IPs (direct, no mTLS sidecar)
    │    ▼
    │    Backend service pods
    │
    └──► Public HBU services directly
         (services with namespace: public, e.g. webbus--public)
         │ HBU ILB → K8s Service → Pod (with or without mTLS sidecar)
         ▼
         Backend service pods
```

### PAR Request Flow

```
hybrid-boundary-ui (user submits PAR)
    │ POST /release/par
    ▼
par-automation
    │ Evaluate classification rules
    │ Query Service Portal
    ├── Auto-approved → Apply to HB API + create Jira tickets (Done)
    └── Denied → Create Jira tickets for manual review
```

---

## Configuration Flow

How configuration propagates from source to runtime:

### Routing Configuration

```
Source repos:
    routing-config-staging     → .flexi route definitions
    routing-config-production  → .flexi route definitions
    proxy-config               → JSON proxy settings
    web-config                 → Mustache → nginx configs

Build:
    Each repo's Jenkins pipeline builds Docker images
    Images pushed to docker-conveyor.groupondev.com/routing/*

Propagation:
    Each pipeline clones routing-deployment
    Runs update_deployment.sh (Kustomize image tag update)
    Commits and pushes to routing-deployment
    Creates deploy tags (eu_deploy-*, us_deploy-*, gcp-*)

Deployment:
    DeployBot picks up deploy tags
    kustomize build overlays/{context} | kubectl apply
    Init containers (web-config, proxy-config, routing-config,
        jolokia-agent) copy configs from images to shared volumes
    Pod runs: nginx (TLS on 443) + api-proxy (HTTP on 9000)
              + telegraf + logstash-kafka-forwarder
              + logstash-canary + filebeat
    Service: Internal LB restricted to HB subnet (10.183.16.0/24)

Runtime:
    Traffic arrives from HB edge proxy → Internal LB → nginx
    nginx terminates TLS, proxies HTTP/1.1 to api-proxy on localhost:9000
    api-proxy reads /var/groupon/routing-config/main.flexi
    api-proxy reads /app/conf/ (from proxy-config volume)
    nginx reads /etc/nginx/nginx.conf (from web-config volume)
    api-proxy routes to backend services via their HBU ILB IPs
```

### Hybrid Boundary Configuration

```
Source:
    hybrid-boundary-controller watches HybridBoundaryUpstream CRDs
    CRDs created by cmf-helm-charts or manually

Reconciliation:
    Controller creates K8s Services (ELB or Istio)
    Controller calls HB API to register services + endpoints
    Controller creates Istio VirtualServices (GCP gateway mode)

Service Discovery:
    HB Lambdas/Cloud Functions call service-fetcher
    service-fetcher returns ClusterIP from K8s API
    HB updates DNS records (Route53 or Cloud DNS)
```

---

## Dependency Matrix

| Repository | Depends On | Depended On By |
|---|---|---|
| `gcp-landingzone` | — | `terraform-gcp-core`, `conveyor_k8s`, `hybrid-boundary`, `hybrid-boundary-gcp` |
| `terraform-gcp-core` | `gcp-landingzone` | `conveyor_k8s`, `hybrid-boundary-gcp` |
| `conveyor_k8s` | `gcp-landingzone`, `terraform-gcp-core` | `hybrid-boundary-controller`, `service-fetcher` |
| `hybrid-boundary` | `gcp-landingzone`, `service-fetcher` | `hybrid-boundary-controller` |
| `hybrid-boundary-gcp` | `gcp-landingzone`, `terraform-gcp-core`, `service-fetcher` | `hybrid-boundary-controller` |
| `hybrid-boundary-controller` | `hybrid-boundary`, `hybrid-boundary-gcp` | `cmf-helm-charts`, `par-automation` |
| `mtls-sidecar` | `cmf-helm-charts` (injection), `conveyor_k8s` (image versions) | Application pods (via cmf-helm-charts) |
| `service-fetcher` | `conveyor_k8s` (deployment) | `hybrid-boundary`, `hybrid-boundary-gcp` |
| `par-automation` | `hybrid-boundary-controller` (API) | `hybrid-boundary-ui` |
| `cmf-helm-charts` | `hybrid-boundary-controller` (CRDs) | Application repos |
| `api-proxy` | `proxy-config`, routing-configs | `routing-deployment` |
| `proxy-config` | — | `routing-deployment`, `api-proxy` |
| `routing-config-production` | — | `routing-deployment` |
| `routing-config-staging` | — | `routing-deployment` |
| `web-config` | — | `routing-deployment` |
| `routing-deployment` | `api-proxy`, `proxy-config`, routing-configs, `web-config` | K8s clusters; receives traffic from `hybrid-boundary` / `hybrid-boundary-gcp` (HB edge proxy routes to routing-service ILB) |

---

## Cross-Repository Impact Assessment

Before suggesting a change, check if it has downstream effects:

| If you change... | Also check... |
|---|---|
| `gcp-landingzone` VPC or firewall | `terraform-gcp-core` peering, `conveyor_k8s` cluster configs |
| `terraform-gcp-core` subnets | `conveyor_k8s` GKE cluster manifests (`conveyor_subnet`, `pod_range`) |
| `conveyor_k8s` Ansible roles | Services deployed in clusters (HB controller, service-fetcher) |
| `hybrid-boundary` API schema | `hybrid-boundary-controller` API client, `par-automation` API calls |
| `hybrid-boundary-controller` CRD | `cmf-helm-charts` HBU templates, all application deployments |
| `cmf-helm-charts` templates | All application repos using these charts, `mtls-sidecar` injection |
| `mtls-sidecar` Envoy config or images | All application pods with mTLS enabled (via `cmf-helm-charts`) |
| `routing-config-*` routes | `routing-deployment` overlays (auto-updated), `api-proxy` runtime |
| `proxy-config` settings | `routing-deployment` overlays (auto-updated), `api-proxy` runtime |
| `web-config` templates | `routing-deployment` overlays (auto-updated), nginx runtime |
| `hybrid-boundary` / `hybrid-boundary-gcp` edge proxy config | `routing-deployment` (routing-service receives traffic from HB), all HBU-managed services |
| `routing-deployment` (routing-service ILB or nginx) | Public traffic path from CDN through HB edge proxy |
