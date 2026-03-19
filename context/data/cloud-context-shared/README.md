# Groupon Cloud Platform Shared Context

**Team:** Cloud Platform
**Organization:** Groupon
**Description:** Multi-cloud infrastructure (AWS + GCP) for Groupon's scalable, secure, and reliable cloud platform
**Version:** 2.0.0 (with Skill Graph Enhancement)
**Last Updated:** 2026-03-19

---

## What Is This?

This is a **shared context folder** designed to help engineers (and AI agents) navigate and understand Groupon's Cloud Platform infrastructure. It documents the architecture, repositories, dependencies, and common gotchas across 7 infrastructure layers and 18 repositories.

### Skill Graph Enhancement

This context uses a **skill graph** architecture to improve navigation and reduce hallucinations:

- **Domain MOCs** (domains/) — Master-of-Content documents for each infrastructure layer
- **Gotchas** (gotchas/) — Common pitfalls, gotchas, and failures with mitigations
- **Scoring Criteria** (.meta/scoring/criteria.md) — 12-question framework for measuring context quality
- **Self-Improvement Cycle** (.meta/) — observe → inspect → amend → evaluate → repeat

The skill graph provides **structured knowledge organization** that helps AI agents find information quickly and avoid common mistakes.

---

## Quick Start

### For Humans

1. **Start here:** Read [INDEX.md](#directory-structure) below to understand the folder layout
2. **Pick a domain:** Read the relevant domain MOC (e.g., domains/cloud-foundation.md)
3. **Learn gotchas:** Check the gotchas/ folder for common pitfalls in your area
4. **Check dependencies:** Understand cross-repo changes before merging PRs
5. **Read AI_OVERVIEW.md** in each repo for implementation details

### For AI Agents

1. **Start with INDEX.md** (or this README.md) to understand the 7-layer architecture
2. **Navigate to the relevant domain MOC** (domains/*.md) based on the task
3. **Cross-check gotchas** (gotchas/*.md) before giving advice
4. **Verify dependencies** using information in domain MOCs
5. **Log the interaction** to .meta/observations/log.jsonl for self-improvement
6. **Propose amendments** if you find documentation gaps

---

## Directory Structure

```
cloud-context-shared/
├── README.md                          (this file)
├── INDEX.md                           (comprehensive index of all 18 repos)
│
├── domains/                           (7 domain MOCs, one per infrastructure layer)
│   ├── cloud-foundation.md            (gcp-landingzone)
│   ├── infrastructure-networking.md   (terraform-gcp-core)
│   ├── kubernetes-platform.md         (conveyor_k8s)
│   ├── service-mesh.md                (hybrid-boundary, service-fetcher, etc.)
│   ├── routing-proxy.md               (api-proxy, routing-config, etc.)
│   └── application-deployment.md      (cmf-helm-charts)
│
├── gotchas/                           (5 gotchas documents, 40+ pitfalls documented)
│   ├── cloud-foundation.md            (Terraform state, project factory, IAM, org policies)
│   ├── kubernetes.md                  (Cluster promotion, Ansible, Karpenter, AMI baking)
│   ├── service-mesh.md                (HBU controller scope, HTTP/2 opt-in, PAR classification)
│   ├── routing.md                     (Image tags, .flexi validation, config chain reactions)
│   └── general.md                     (Terraform-managed, environment progression, regions)
│
└── .meta/                             (Self-improvement framework)
    ├── config.json                    (Context metadata, version, team info)
    ├── scoring/
    │   └── criteria.md                (12-question scoring framework)
    ├── amendments/
    │   └── changelog.md               (Amendment history and rationale)
    └── observations/
        └── log.jsonl                  (Interaction logs for learning)
```

---

## Infrastructure Layers (7 Total)

### Layer 1: Cloud Foundation
**Repository:** gcp-landingzone

GCP organization governance, project factory, IAM bindings, shared VPCs, org policies.

→ Read: [domains/cloud-foundation.md](domains/cloud-foundation.md)

### Layer 2: Infrastructure Networking
**Repository:** terraform-gcp-core

Conveyor VPCs, VPC peering, subnets, Cloud Router, NAT, firewall rules, private DNS.

→ Read: [domains/infrastructure-networking.md](domains/infrastructure-networking.md)

### Layer 3: Kubernetes Platform
**Repository:** conveyor_k8s

EKS and GKE cluster lifecycle, Ansible platform services (50+ roles), cluster promotion, AMI baking.

→ Read: [domains/kubernetes-platform.md](domains/kubernetes-platform.md)

### Layer 4: Service Mesh & Edge Proxy
**Repositories:** hybrid-boundary, hybrid-boundary-gcp, hybrid-boundary-controller, service-fetcher, par-automation, mtls-sidecar, hybrid-boundary-ui (7 total)

Multi-cloud service mesh, mTLS, edge proxying, service discovery, data classification.

→ Read: [domains/service-mesh.md](domains/service-mesh.md)

### Layer 5: Traffic Routing & Proxy
**Repositories:** api-proxy, proxy-config, routing-config-production, routing-config-staging, web-config, routing-deployment (6 total)

Public traffic routing, TLS termination, api-proxy (Vert.x + .flexi), nginx, routing configuration.

→ Read: [domains/routing-proxy.md](domains/routing-proxy.md)

### Layer 6: Application Deployment
**Repository:** cmf-helm-charts

Standard Helm charts, HBU CRD emission, mTLS sidecar injection, SOX compliance.

→ Read: [domains/application-deployment.md](domains/application-deployment.md)

### (Implicit) Layer 7: AI Coordination
**Resources:** This context folder (.meta/), skill graphs, self-improvement cycle

Helps AI agents understand and contribute to platform improvements.

→ Read: [.meta/scoring/criteria.md](.meta/scoring/criteria.md)

---

## 18 Repositories at a Glance

| # | Repository | Layer | Purpose | Language |
|----|---|---|---|---|
| 1 | gcp-landingzone | Cloud Foundation | GCP org governance, project factory | Terraform, Python |
| 2 | terraform-gcp-core | Infrastructure Networking | Conveyor VPCs, networking | Terraform, Terragrunt |
| 3 | conveyor_k8s | Kubernetes Platform | EKS/GKE clusters, platform services | Terraform, Ansible, Packer |
| 4 | hybrid-boundary | Service Mesh | AWS service mesh agent | Go, Envoy |
| 5 | hybrid-boundary-gcp | Service Mesh | GCP service mesh agent | Go, Envoy |
| 6 | hybrid-boundary-controller | Service Mesh | K8s operator for HBU | Go, Kubernetes |
| 7 | service-fetcher | Service Mesh | K8s service discovery | Go |
| 8 | par-automation | Service Mesh | PAR workflow, data classification | Python |
| 9 | mtls-sidecar | Service Mesh | Envoy mTLS sidecar | Envoy, iptables |
| 10 | hybrid-boundary-ui | Service Mesh | Self-service portal | Angular |
| 11 | api-proxy | Traffic Routing | Request routing, .flexi rules | Java, Vert.x |
| 12 | proxy-config | Traffic Routing | Proxy configuration | JSON |
| 13 | routing-config-production | Traffic Routing | Production routing rules | .flexi DSL |
| 14 | routing-config-staging | Traffic Routing | Staging routing rules | .flexi DSL |
| 15 | web-config | Traffic Routing | nginx configuration | Mustache |
| 16 | routing-deployment | Traffic Routing | Kubernetes deployment manifest | Kustomize |
| 17 | cmf-helm-charts | Application Deployment | Standard Helm charts | Helm, Mustache |
| 18 | (CI/CD pipelines) | All Layers | GitHub Actions, Jenkins | YAML |

---

## Common Gotchas (Quick Reference)

**Cloud Foundation:**
- Terraform state locked? Never force-unlock without confirming no active applies
- Creating projects manually? Always use `bin/setup-new-project.py`
- IAM bindings? Only LDAP groups — individuals are overwritten on apply

**Kubernetes Platform:**
- Cluster promotion order: sandbox → rapid → stable → production (never skip)
- Ansible changes trigger PR tests on dev clusters — test locally first
- Subnet changes in terraform-gcp-core require coordinated terra-gke/ updates

**Service Mesh:**
- HTTP/2 is OPT-IN (default: false) — always check cmf-helm-charts values
- HBU controller CRD changes require cmf-helm-charts updates (both must change together)
- PAR auto-approval depends on Service Portal classification — wrong classification = wrong policy

**Traffic Routing:**
- Never manually edit routing-deployment image tags (Jenkins auto-updates them)
- Always test routing changes in routing-config-staging BEFORE production
- Config repos trigger a full deploy chain — merging any one starts the cascade

**General:**
- All infrastructure is Terraform-managed — manual console changes will be overwritten
- Environment progression: dev/sandbox → rapid → stable → production
- Check DEPENDENCY_GRAPH.md before cross-repo changes

→ Read all gotchas: See [gotchas/](gotchas/) folder

---

## Self-Improving Context

This context includes a **self-improvement framework** (.meta/) that learns from interactions:

### The Cycle

```
observe          Record agent/engineer interactions in .meta/observations/log.jsonl
  ↓
inspect          Review logs weekly for patterns, failures, knowledge gaps
  ↓
amend            Update domains/, gotchas/, or scoring based on observations
  ↓
evaluate         Score changes using .meta/scoring/criteria.md
  ↓
(repeat)         Context improves over time
```

### How to Contribute Improvements

1. **Identify a gap:** You notice documentation is missing or incorrect
2. **Open an issue:** Document the gap with examples
3. **Draft amendment:** Update the relevant file (domain MOC or gotcha)
4. **Update changelog:** Add entry to .meta/amendments/changelog.md with rationale
5. **Log observation:** Add entry to .meta/observations/log.jsonl
6. **Get review:** Have team validate the improvement

### Scoring

Every interaction is scored using 12 yes/no questions in 4 categories:

- **Navigation** (4 questions): Did agent use INDEX.md? Correct domain? ≤5 files? Check dependencies?
- **Accuracy** (4 questions): Correct repo? Correct routing? No hallucinations? Checked gotchas?
- **Completeness** (2 questions): Cross-repo deps noted? Actionable next steps?
- **Self-Improvement** (2 questions): Logged interaction? Proposed amendment?

**Score bands:** 10-12 = A (excellent), 8-9 = B (good), 5-7 = C (acceptable), 2-4 = D (poor), 0-1 = F (critical)

→ Read scoring criteria: [.meta/scoring/criteria.md](.meta/scoring/criteria.md)

---

## Workspace Setup

### Prerequisites

- Terraform >= 1.0
- Terragrunt >= 0.40
- kubectl >= 1.24
- Ansible >= 2.10
- Git with SSH keys configured
- GCP service account (for GCP operations)
- AWS credentials (for AWS operations)

### Initial Setup

```bash
# Clone all 18 repositories
mkdir -p ~/groupon-cloud-platform
cd ~/groupon-cloud-platform

# (Script to clone all repos — contact Cloud Platform team)
./scripts/clone-all-repos.sh

# Set up environment variables
export GCP_PROJECT_ID="your-project-id"
export AWS_REGION="us-west-1"
export GCP_REGION="us-central1"

# Test connectivity
gcloud auth list
aws sts get-caller-identity
```

### First Deployment

```bash
# Navigate to gcp-landingzone
cd gcp-landingzone

# Understand the bootstrap sequence
cat README.md

# Apply in order: 0-seed → 1-bootstrap → 2-org → 3-networks
cd envs/0-seed
terraform init
terraform plan
terraform apply

# (Continue with 1-bootstrap, 2-org, 3-networks in order)
```

### Testing

```bash
# Run Terraform validation
terraform validate

# Run Ansible linting
ansible-lint roles/

# Run GKE/EKS cluster health checks
kubectl get nodes -L karpenter.sh/capacity-type,instance-type
```

---

## Frequently Asked Questions

**Q: I need to create a new microservice. Where do I start?**
A: Read domains/application-deployment.md, then follow cmf-helm-charts example. Create a values.yaml, merge to main via PR, use DeployBot to deploy.

**Q: How do I add a new GCP project?**
A: Never manually create projects in the console. Always use: `python bin/setup-new-project.py --name <project-name> --env <dev|staging|prod>` in gcp-landingzone.

**Q: I changed a subnet in terraform-gcp-core. Now GKE is broken. What happened?**
A: Subnet changes require coordinated updates in conveyor_k8s terra-gke/ manifests. Check DEPENDENCY_GRAPH.md and update both repos before applying.

**Q: How do I route traffic to my new service?**
A: Update routing-config-staging first (test with curl), then routing-config-production. Never manually edit api-proxy or routing-deployment — Jenkins auto-updates those.

**Q: Can I deploy directly to production?**
A: No. Always follow environment progression: dev/sandbox → rapid → stable → production. Test at each stage.

**Q: What's the difference between routing-service and standalone api-proxy?**
A: routing-service has no mTLS sidecar (simpler, faster). Standalone has mTLS sidecar (more secure, more overhead). Code changes affect both.

**Q: How do I know if HTTP/2 is enabled for my service?**
A: Check cmf-helm-charts values.yaml. If `mtls.http2: false`, HTTP/2 is disabled (default). Set `mtls.http2: true` to enable.

---

## Key Documentation Files

**In this context folder:**
- [domains/cloud-foundation.md](domains/cloud-foundation.md) — GCP org governance
- [domains/kubernetes-platform.md](domains/kubernetes-platform.md) — K8s cluster lifecycle
- [domains/service-mesh.md](domains/service-mesh.md) — Hybrid Boundary architecture
- [gotchas/general.md](gotchas/general.md) — Terraform and environment progression
- [.meta/scoring/criteria.md](.meta/scoring/criteria.md) — Interaction scoring framework

**In each repository:**
- `README.md` — Repo overview and setup
- `AI_OVERVIEW.md` — AI-friendly documentation (key files, patterns, conventions)
- `.terragrunt.hcl` or `Makefile` — Deployment instructions
- `DEPENDENCY_GRAPH.md` (if exists) — Cross-repo dependencies

---

## Support & Escalation

### Immediate Questions?
1. Search this context (domains/ and gotchas/)
2. Read the relevant AI_OVERVIEW.md in the repo
3. Check the repo's README or CONTRIBUTING.md

### Found a Bug or Gotcha?
1. Open an issue in the relevant repo
2. Reference the gotcha in .meta/amendments/changelog.md (propose update)
3. Notify @cloud-platform-team on Slack

### Need Architecture Help?
- Slack channel: #cloud-platform
- Office hours: Tuesdays 2-3 PM PT
- Email: cloud-platform@groupon.com

### Want to Improve This Context?
1. Propose amendment: Draft in .meta/amendments/changelog.md
2. Get review from Cloud Platform team
3. Merge to main with updated timestamp in .meta/config.json

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-03-19 | Added skill graph enhancement (domains/, gotchas/, .meta/) |
| 1.0.0 | 2025-01-01 | Initial context created |

---

**Last Updated:** 2026-03-19
**Maintained by:** Groupon Cloud Platform Team
**License:** Internal Use Only
