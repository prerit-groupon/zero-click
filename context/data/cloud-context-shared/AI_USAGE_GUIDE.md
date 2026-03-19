# AI Usage Guide for Cloud Infrastructure

This guide explains how engineers should interact with AI agents when working on Groupon's cloud infrastructure. It covers common workflows, safety guardrails, and example prompts.

---

## Principles

1. **Scope the task.** Tell the agent what you want to achieve, which repository is involved, and what environment you are targeting.
2. **Let the agent route itself.** The workspace contains `ARCHITECTURE.md`, `repositories.json`, and `AGENT_ROUTING_RULES.md`. Well-configured agents will read these before diving into code.
3. **Review before applying.** AI agents should never apply infrastructure changes directly. All changes must go through PR, CI, and human review.
4. **Think cross-repo.** Many changes trigger automated pipelines in other repositories. Ask the agent to trace downstream impacts using `DEPENDENCY_GRAPH.md`.

---

## Common Workflows

### 1. Scoping a Jira Ticket

**Example prompt:**
```
I have a ticket to add a new GCP project for the "payments" team in the
stable environment. What files do I need to create or modify? Walk me
through the steps using our existing project factory pattern.
```

**What the agent should do:**
- Identify `gcp-landingzone` via `repositories.json`
- Examine `bin/setup-new-project.py` for the scaffolding process
- Check existing projects in `envs/stable/` for the naming pattern
- List the files to create (account.hcl, project/, iam/) and the PR workflow

---

### 2. Debugging Kubernetes Issues

**Example prompt:**
```
Pods in the "checkout" namespace on the us-west-2 EKS production cluster
are failing health checks. The service uses HybridBoundaryUpstream for
ingress. Help me identify what could be wrong and where to look.
```

**What the agent should do:**
- Check `hybrid-boundary-controller` reconciler logic for health-related code paths
- Look at `conveyor_k8s` Ansible roles for networking and health check configuration
- Check if `service-fetcher` is returning correct ClusterIPs
- Trace through `DEPENDENCY_GRAPH.md` to identify HB → HB-controller → K8s Service chain
- Suggest kubectl and HB CLI commands for runtime diagnostics

---

### 3. Finding the Correct Repository

**Example prompt:**
```
I need to add a new firewall rule that allows traffic from our GKE clusters
to a new internal service on port 8443. Which repository and which files?
```

**What the agent should do:**
- Check `AGENT_ROUTING_RULES.md` for firewall-related routing
- Determine if this is a shared VPC firewall rule (`gcp-landingzone`) or a Conveyor VPC rule (`terraform-gcp-core`)
- Point to the appropriate module and show existing rules as examples

---

### 4. Generating Infrastructure Changes Safely

**Example prompt:**
```
Generate the Terraform configuration to add a new GKE node pool with
e2-standard-8 machines in the us-central1 stable cluster. Follow the
existing pattern in terra-gke/modules/gke-cluster/.
```

**What the agent should do:**
- Read the existing GKE module in `conveyor_k8s`
- Verify the VPC/subnet in `terraform-gcp-core` supports the new node pool
- Draft the Terraform resource matching existing conventions
- Warn about variables, outputs, and cluster manifest updates needed
- Note the `terraform plan` validation requirement

---

### 5. Modifying Routing Rules

**Example prompt:**
```
I need to add a new route for /api/v2/deals to point to the deals-service
backend in production. Show me how to do this and what the deployment
pipeline looks like.
```

**What the agent should do:**
- Recommend testing in `routing-config-staging` first
- Show the `.flexi` DSL pattern from existing routes in `src/applications/`
- Explain the pipeline chain: merge → Jenkins build → Docker image → routing-deployment update → DeployBot deploy
- Warn about the cross-repo trigger to `routing-deployment`

---

### 6. Understanding Hybrid Boundary

**Example prompt:**
```
A service team wants to expose their new microservice through Hybrid
Boundary on GCP. Walk me through the full path from HBU CRD to external
traffic reaching the service.
```

**What the agent should do:**
- Start with `cmf-helm-charts` HBU template (how the CRD gets created)
- Show `hybrid-boundary-controller` reconciliation flow (CRD → K8s Service → HB API)
- Explain `hybrid-boundary-gcp` Cloud Function flow (API → Firestore → Cloud DNS → edge proxy)
- Describe how `service-fetcher` provides service discovery
- Trace the full path in `DEPENDENCY_GRAPH.md`

---

### 7. Cross-Repository Impact Analysis

**Example prompt:**
```
I'm changing the HybridBoundaryUpstream CRD to add a "weight" field for
traffic splitting. What other repositories will be affected?
```

**What the agent should do:**
- Check `DEPENDENCY_GRAPH.md` for HB controller dependencies
- Identify `cmf-helm-charts` HBU template needs updating
- Check if `par-automation` or `hybrid-boundary-ui` reference the CRD
- Flag that all application deployments using CMF charts will pick up the change
- Trace the full impact chain

---

### 8. Deploying Configuration Changes

**Example prompt:**
```
I updated proxy-config to change the proxy timeout from 30s to 60s in
production. What happens when I merge my PR?
```

**What the agent should do:**
- Explain the Jenkins pipeline: Docker image build → push → clone routing-deployment → update Kustomize tags → create deploy tags
- Show which overlays get updated (production regions)
- Explain DeployBot picks up tags and applies to K8s clusters
- Note that api-proxy will read the new config from mounted volumes after pod restart

---

## Prompt Engineering Tips

### Be specific about the repository
```
# Good
In the conveyor_k8s repository, show me how Karpenter is configured.

# Bad
How is Karpenter configured?
```

### Include the environment and region
```
# Good
I need to update IAM for the rep-data project in the prod environment,
europe-west1 region.

# Bad
I need to update IAM for rep-data.
```

### Ask for cross-repo impact
```
# Good
If I change the shared VPC firewall rules in gcp-landingzone, will it
affect any Conveyor clusters or Hybrid Boundary edge proxies?

# Bad
Is my firewall change safe?
```

### Distinguish staging from production
```
# Good
Add this route to routing-config-staging first. Once validated, I'll
apply the same change to routing-config-production.

# Bad
Add this route to the routing config.
```

### Ask for the full deployment path
```
# Good
Show me the complete deployment path for a change to web-config, from
merge to running in production clusters.

# Bad
How does web-config get deployed?
```

---

## Safety Guardrails

| Rule | Reason |
|---|---|
| Never run `terraform apply` or `terragrunt apply` via AI | All applies must go through CI pipelines with approval |
| Never commit secrets, tokens, or credentials | Use Ansible Vault, GCP Secret Manager, or environment variables |
| Always specify the target environment | A change safe for dev may be destructive in production |
| Test routing changes in staging first | `routing-config-staging` exists for this purpose |
| Validate generated Terraform with `terraform plan` | AI-generated HCL may have syntax or logic errors |
| Trace cross-repo impacts before merging | Use `DEPENDENCY_GRAPH.md` to understand pipeline triggers |
| Review Ansible role changes against `make validate` | Lint rules catch common issues before deployment |
| Test operator changes with `make test` before merge | Controller logic bugs can cause cluster-wide outages |
| Never modify `routing-deployment` directly for config changes | Config repos auto-update routing-deployment via Jenkins |

---

## Quick Reference: Repository Selection

| If your task involves... | Primary repository | Check also |
|---|---|---|
| GCP projects, IAM, org policies | `gcp-landingzone` | — |
| Shared VPC firewall, DNS | `gcp-landingzone` | `terraform-gcp-core` |
| Conveyor VPCs, subnets | `terraform-gcp-core` | `gcp-landingzone` |
| K8s clusters, EKS/GKE Terraform | `conveyor_k8s` | `terraform-gcp-core` |
| Ansible platform services | `conveyor_k8s` | — |
| Hybrid Boundary on AWS | `hybrid-boundary` | `hybrid-boundary-controller` |
| Hybrid Boundary on GCP | `hybrid-boundary-gcp` | `hybrid-boundary-controller` |
| HBU CRDs, K8s ingress | `hybrid-boundary-controller` | `cmf-helm-charts` |
| Policy access requests | `par-automation` | `hybrid-boundary-ui` |
| mTLS sidecar, traffic interception | `mtls-sidecar` | `cmf-helm-charts`, `conveyor_k8s` |
| Service discovery for HB | `service-fetcher` | `conveyor_k8s` |
| API/web traffic routing rules | `routing-config-*` | `routing-deployment` |
| Proxy settings, realms | `proxy-config` | `routing-deployment` |
| Nginx config, virtual hosts | `web-config` | `routing-deployment` |
| Routing K8s deployment | `routing-deployment` | Config repos |
| Helm charts for apps | `cmf-helm-charts` | `hybrid-boundary-controller` |
| Architecture docs, AI config | `cloud-ai-root` | — |
