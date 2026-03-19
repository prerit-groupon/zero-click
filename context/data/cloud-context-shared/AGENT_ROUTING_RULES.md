# Agent Routing Rules

This document defines rules for AI agents to determine which repository to analyze when given an infrastructure task. Rules are evaluated in order; the first matching rule determines the primary repository. Some tasks span multiple repositories — secondary targets and cross-repo impacts are noted.

**Prerequisite:** Before applying these rules, agents must have read `ARCHITECTURE.md`, `repositories.json`, and `DEPENDENCY_GRAPH.md`.

---

## GCP Foundation Rules

### Rule: GCP project creation or modification
- **Trigger**: GCP projects, project factory, project provisioning, `account.hcl`, `setup-new-project`
- **Primary**: `gcp-landingzone`
- **Path hint**: `envs/{env}/{project-name}/`, `modules/project-factory/`, `bin/setup-new-project.py`

### Rule: IAM changes
- **Trigger**: IAM roles, IAM bindings, service account permissions, LDAP groups, `grp_gcloud_*`, access control for GCP resources
- **Primary**: `gcp-landingzone`
- **Path hint**: `modules/iam/project-level-iam/`, `modules/iam/global-iam/`

### Rule: Central service accounts
- **Trigger**: central service accounts, `central-sa`, cross-project SA management
- **Primary**: `gcp-landingzone`
- **Path hint**: `envs/{env}/central-sa-{env}/service-accounts-v2/sa.yaml`

### Rule: Shared VPC networking and firewall
- **Trigger**: shared VPC, shared VPC firewall, NAT in shared VPC, DNS forwarding
- **Primary**: `gcp-landingzone`
- **Path hint**: `modules/shared_vpc/`, `modules/shared_vpc_firewall/`

### Rule: GCP org policies or folder structure
- **Trigger**: org policies, organization constraints, folder hierarchy, `gcp-foundation`
- **Primary**: `gcp-landingzone`
- **Path hint**: `modules/gcp-foundation/`

---

## Infrastructure Networking Rules

### Rule: Conveyor or Hybrid Boundary VPCs
- **Trigger**: Conveyor VPC, Conveyor subnet, VPC peering, `vpc-{env}-{region}`, pod range, service range
- **Primary**: `terraform-gcp-core`
- **Path hint**: `modules/vpc/`, `envs/{env}/{region}/vpc/`

### Rule: Conveyor-specific firewall or NAT
- **Trigger**: edge-proxy firewall, Akamai Site Shield CIDR, GKE control plane firewall, Conveyor NAT
- **Primary**: `terraform-gcp-core`
- **Path hint**: `modules/fw-rule/`, `modules/nat/`

### Rule: Private DNS zones
- **Trigger**: private DNS, DNS peering, `groupondev.com` DNS zone, `group.on` zone
- **Primary**: `terraform-gcp-core`
- **Path hint**: `modules/dns/`

### Rule: Billing budgets and alerts
- **Trigger**: billing budget, cost alerts, Cloud Logging cost
- **Primary**: `terraform-gcp-core`
- **Path hint**: `modules/budget-alert/`, `envs/{env}/alert-logging/`

---

## Kubernetes Cluster Rules

### Rule: Cluster creation or Terraform changes
- **Trigger**: EKS, GKE, cluster creation, cluster Terraform, node pools, Karpenter, `terra-eks`, `terra-gke`
- **Primary**: `conveyor_k8s`
- **Path hint**: `terra-eks/`, `terra-gke/`
- **Cross-repo**: May require VPC/subnet in `terraform-gcp-core` for new GCP regions

### Rule: Cluster configuration
- **Trigger**: cluster config, `cluster.yaml`, cluster manifests, environment overrides
- **Primary**: `conveyor_k8s`
- **Path hint**: `terra-eks/cluster_manifests/`, `terra-gke/cluster_manifests/`

### Rule: Platform service deployment via Ansible
- **Trigger**: Ansible roles, platform services, monitoring, ArgoCD, OPA, Wiz, Elastic, Karpenter
- **Primary**: `conveyor_k8s`
- **Path hint**: `conveyor_provisioning_playbook/roles/`, `conveyor_provisioning_playbook/kube.yml`

### Rule: Cluster promotion or lifecycle
- **Trigger**: cluster promotion, data migration, traffic migration, cluster rollback
- **Primary**: `conveyor_k8s`
- **Path hint**: `pipelines/promote-cluster.groovy`, `conveyor-pipeline-utils/`

### Rule: AMI baking
- **Trigger**: AMI, machine images, Packer, EKS node images
- **Primary**: `conveyor_k8s`
- **Path hint**: `machine-image-baking/`, `pipelines/ami.groovy`

---

## Service Mesh & Edge Proxy Rules

### Rule: Hybrid Boundary on AWS
- **Trigger**: HB Lambda, Route53, DynamoDB service registry, edge proxy on AWS, HB API (AWS), traffic shifting on AWS
- **Primary**: `hybrid-boundary`
- **Path hint**: `agent/lambda/`, `agent/lambda-api/`, `terraform/`

### Rule: Hybrid Boundary on GCP
- **Trigger**: HB Cloud Function, Cloud DNS, Firestore service registry, edge proxy on GCP, HB API (GCP), traffic shifting on GCP
- **Primary**: `hybrid-boundary-gcp`
- **Path hint**: `agent/dns-handler/`, `agent/lambda-api/`, `terraform-gcp/`

### Rule: HybridBoundaryUpstream CRDs or reconciliation
- **Trigger**: HybridBoundaryUpstream, HBU, K8s operator for HB, reconciliation logic, SubResourceReconciler
- **Primary**: `hybrid-boundary-controller`
- **Path hint**: `controllers/`, `api/v1/`

### Rule: Istio VirtualServices for ingress
- **Trigger**: Istio VirtualService, gateway mode, service mesh ingress
- **Primary**: `hybrid-boundary-controller`
- **Secondary**: `conveyor_k8s` (if about Istio installation itself)
- **Path hint**: `controllers/hybridboundaryupstream_istio.go`

### Rule: Service discovery for HB
- **Trigger**: service-fetcher, ClusterIP lookup, service discovery for Hybrid Boundary
- **Primary**: `service-fetcher`
- **Path hint**: `app/main.go`
- **Cross-repo**: Deployment config is in `conveyor_k8s` Ansible role

### Rule: mTLS sidecar or traffic interception
- **Trigger**: mTLS, mutual TLS, sidecar proxy, traffic-interceptor, Envoy sidecar, iptables interception, client certificates for HB, `tls-sidecar`
- **Primary**: `mtls-sidecar`
- **Path hint**: `traffic-interceptor/var/envoy/envoy.yaml.jsonnet`, `traffic-interceptor/bin/`
- **Cross-repo**: Sidecar injection template is in `cmf-helm-charts` (`common/templates/_tls-sidecar.tpl`). Image versions are set in `conveyor_k8s` Ansible `group_vars`.

### Rule: Policy Access Requests
- **Trigger**: PAR, policy access request, data classification approval, SOX/PCI policy
- **Primary**: `par-automation`
- **Path hint**: `agent/par-automation/main.go`

### Rule: Hybrid Boundary UI
- **Trigger**: HB UI, self-service mesh portal, endpoint management UI
- **Primary**: `hybrid-boundary-ui`

---

## Routing & Proxy Rules

### Rule: API/web traffic routing rules
- **Trigger**: routing rules, `.flexi` files, route definitions, application routes, Grout DSL
- **Primary**: `routing-config-staging` (for testing) or `routing-config-production` (for production)
- **Path hint**: `src/applications/`, `src/hosts/`, `src/layers/`
- **Cross-repo**: Merges auto-update `routing-deployment` via Jenkins

### Rule: Proxy runtime configuration
- **Trigger**: proxy config, `mainConf.json`, `proxyConf.json`, `routingConf.json`, verticle settings, realm config
- **Primary**: `proxy-config`
- **Path hint**: `conf/k8s/{env}/`
- **Cross-repo**: Merges auto-update `routing-deployment` via Jenkins

### Rule: Nginx configuration
- **Trigger**: nginx config, virtual hosts, rewrite rules, error pages, nginx templates
- **Primary**: `web-config`
- **Path hint**: `data/`, `templates/nginx/`, `generator/`
- **Cross-repo**: Merges auto-update `routing-deployment` via Jenkins

### Rule: Redirect requests from Jira
- **Trigger**: MESH tickets, redirect automation, redirect Jira
- **Primary**: `web-config`
- **Path hint**: `go/redirect-requests/`

### Rule: Routing K8s deployment manifests
- **Trigger**: routing deployment, Kustomize overlays for routing, routing-service pod spec, deploy tags
- **Primary**: `routing-deployment`
- **Path hint**: `base/`, `overlays/`
- **Warning**: Do NOT manually edit image tags — they are auto-updated by config repo pipelines
- **Note**: The routing-service pod is exposed via Internal LoadBalancer restricted to the HB subnet. It receives public traffic from CDN (Cloudflare/Akamai) via the HB edge proxy public namespace. The pod has NO mTLS sidecar and NO HBU CRD — the ILB is a static resource.

### Rule: API proxy application code
- **Trigger**: api-proxy Java code, Vert.x proxy, rate limiting logic, client identification
- **Primary**: `api-proxy`
- **Path hint**: `proxy-core/`, `proxy-app/`, `proxy-shared/`
- **Note**: api-proxy is deployed in two contexts: (1) within the routing-service pod (managed by `routing-deployment`, no mTLS sidecar), and (2) as a standalone deployment (managed by `cmf-helm-charts`, with mTLS sidecar and HBU). Code changes affect both deployments.

---

## Application Deployment Rules

### Rule: Helm chart templates or defaults
- **Trigger**: CMF charts, Helm chart for Java/JTier/Rails, common chart library, HBU in Helm
- **Primary**: `cmf-helm-charts`
- **Path hint**: `common/templates/`, `generic/components/`, `java/components/`

### Rule: Application deployment configuration
- **Trigger**: `.deploy_bot.yml`, Raptor, DeployBot, application deployment pipeline
- **Primary**: The application's own repository (or `cmf-helm-charts` if about chart-level changes)

---

## AI Coordination Rules

### Rule: Architecture documentation or AI context
- **Trigger**: architecture docs, AI routing, agent configuration, workspace setup, Cursor rules
- **Primary**: `cloud-ai-root`

### Rule: Runbooks or incident response
- **Trigger**: runbooks, incident playbooks, debugging guides
- **Primary**: `cloud-ai-root`
- **Path hint**: `runbooks/`

---

## Ambiguity Resolution

When a task could match multiple rules:

1. **Prefer the more specific rule.** "Add a firewall rule for GKE control plane access" → `terraform-gcp-core` (not `gcp-landingzone`).
2. **Check `DEPENDENCY_GRAPH.md`** for cross-repo relationships.
3. **Distinguish shared VPC from Conveyor VPC.** Shared VPC rules → `gcp-landingzone`. Conveyor VPC rules → `terraform-gcp-core`.
4. **Distinguish config from code.** Routing rules → `routing-config-*`. Proxy logic → `api-proxy`.
5. **Check both if uncertain.** Read relevant paths in both repos and determine where the change belongs.
6. **Ask the engineer** if still ambiguous. State which repositories you considered and why.

---

## Cross-Repository Task Patterns

| Task | Repositories (in order) | Notes |
|---|---|---|
| New GCP project with K8s cluster | `gcp-landingzone` → `terraform-gcp-core` → `conveyor_k8s` | May need new VPC if new region |
| New service with HB ingress | `cmf-helm-charts` → application repo → `hybrid-boundary-controller` auto-reconciles | HBU CRD triggers controller |
| New routing endpoint | `routing-config-staging` → `routing-config-production` → auto-triggers `routing-deployment` | Test in staging first |
| Network change affecting clusters | `gcp-landingzone` or `terraform-gcp-core` → verify `conveyor_k8s` cluster configs | Check firewall and subnet impact |
| New platform service with edge exposure | `gcp-landingzone` (IAM) → `conveyor_k8s` (Ansible role) → `cmf-helm-charts` (HBU) | Full stack change |
| Proxy timeout change | `proxy-config` → auto-triggers `routing-deployment` → deployed by DeployBot | Config-only change |
| Edge proxy infrastructure change | `hybrid-boundary` or `hybrid-boundary-gcp` → verify `hybrid-boundary-controller` compatibility | Check API contract |
| Public traffic flow change | CDN (Cloudflare/Akamai) → `hybrid-boundary`/`hybrid-boundary-gcp` → `routing-deployment` (routing-service ILB) → `web-config` (nginx) → `api-proxy` + `proxy-config` + `routing-config-*` | Full path: CDN → HB edge proxy → nginx → api-proxy → backend HBU ILBs |
| New public HBU service | `cmf-helm-charts` (HBU with `namespace: public`) → `hybrid-boundary-controller` auto-reconciles → directly reachable from CDN via HB edge proxy | Bypasses routing-service; service gets its own ILB |
| Protocol change (HTTP/2, TLS) across routing | `web-config` (nginx listener) + `api-proxy` (Vert.x client) + `hybrid-boundary`/`hybrid-boundary-gcp` (Envoy upstream) + `mtls-sidecar` (sidecar env vars) + `cmf-helm-charts` (Helm values) | Multiple repos involved; see HTTP/2 investigation |
