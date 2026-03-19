# Cloud Infrastructure Workspace — Claude Code Instructions

You are operating in a multi-repository cloud infrastructure workspace with 16+ interconnected repositories. Changes in one repository frequently trigger automated pipelines or affect runtime behavior in other repositories. You MUST follow this routing sequence before analyzing code or suggesting changes.

## Mandatory Startup Sequence

1. **Read `cloud-ai-root/ARCHITECTURE.md`** to understand the platform architecture, repository responsibilities, and layer boundaries.

2. **Read `cloud-ai-root/repositories.json`** to get the full repository manifest with technologies, key paths, dependencies, and typical tasks.

3. **Read `cloud-ai-root/DEPENDENCY_GRAPH.md`** to understand cross-repository relationships, pipeline trigger chains, and configuration flow.

4. **Identify the relevant repository** using the routing rules in `cloud-ai-root/AGENT_ROUTING_RULES.md`.

5. **Check for cross-repository impacts** before suggesting any change. Use the dependency matrix and impact assessment table in `DEPENDENCY_GRAPH.md`.

6. **Only then** navigate to the target repository and analyze code.

## Quick Routing Table

| Task domain | Primary repository | Key entry point |
|---|---|---|
| GCP projects, IAM, org policies, shared VPC | `gcp-landingzone` | `envs/`, `modules/` |
| Conveyor VPCs, subnets, DNS, firewall | `terraform-gcp-core` | `envs/`, `modules/` |
| K8s clusters, Ansible roles, EKS/GKE Terraform | `conveyor_k8s` | `terra-eks/`, `terra-gke/`, `conveyor_provisioning_playbook/` |
| HB edge proxy on AWS | `hybrid-boundary` | `agent/`, `terraform/` |
| HB edge proxy on GCP | `hybrid-boundary-gcp` | `agent/`, `terraform-gcp/` |
| HBU CRDs, K8s ingress operator | `hybrid-boundary-controller` | `controllers/`, `api/v1/` |
| mTLS sidecar, Envoy traffic interception | `mtls-sidecar` | `traffic-interceptor/`, `envoy/` |
| K8s service discovery for HB | `service-fetcher` | `app/main.go` |
| Policy access requests | `par-automation` | `agent/par-automation/` |
| API/web routing rules | `routing-config-staging` / `routing-config-production` | `src/` |
| Proxy settings, realms | `proxy-config` | `conf/` |
| Nginx config, virtual hosts | `web-config` | `data/`, `templates/` |
| Routing K8s deployment | `routing-deployment` | `base/`, `overlays/` |
| Proxy Java application code | `api-proxy` | `proxy-core/`, `proxy-app/` |
| Helm charts for applications | `cmf-helm-charts` | `common/`, chart dirs |
| Architecture docs, AI config | `cloud-ai-root` | `ARCHITECTURE.md` |

## Critical Rules

- **Never assume single-repository context.** Always check whether a task spans multiple repositories.
- **Detect cross-repository impacts before suggesting changes.** A merge in a config repo (routing-config, proxy-config, web-config) auto-triggers Jenkins builds that update routing-deployment. A change to cmf-helm-charts affects all application deployments. A change to the HB controller CRD affects all HBU consumers.
- **Respect layer boundaries.** GCP IAM → `gcp-landingzone`. Conveyor VPC firewall → `terraform-gcp-core`. Routing rules → `routing-config-*`. Proxy logic → `api-proxy`.
- **Distinguish staging from production.** Routing config has separate repos (`routing-config-staging` vs `routing-config-production`). Always validate in staging first.
- **Distinguish shared VPC from Conveyor VPC.** Shared VPC resources → `gcp-landingzone`. Conveyor-specific VPC resources → `terraform-gcp-core`.
- **Check the environment and region.** All tasks are scoped to an environment (dev/stable/prod) and region (us-central1, europe-west1, us-west-1, us-west-2, eu-west-1).
- **Follow existing patterns.** Each repository has established conventions. Match them.
- **Consult runbooks** in `cloud-ai-root/runbooks/` when debugging incidents.
- **Never apply infrastructure changes directly.** All changes go through PR → CI → review → deploy pipeline.
- **Never manually edit routing-deployment image tags.** They are auto-updated by config repo Jenkins pipelines.

## Git Safety

NEVER run `git commit` or `git push` unless the user explicitly asks for it. This rule applies across ALL repositories in this workspace.

## Per-Repository Context

Each repository contains an `AI_OVERVIEW.md` at its root with detailed component navigation, deployment flows, testing guides, and configuration references. Read the relevant `AI_OVERVIEW.md` before making changes in any repository.
