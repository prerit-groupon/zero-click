# Runbooks

This directory contains operational runbooks for Groupon's cloud infrastructure platform. Runbooks document step-by-step procedures for responding to incidents, performing maintenance, and troubleshooting common problems.

---

## Purpose

Runbooks serve three audiences:

1. **On-call engineers** who need fast, reliable procedures during incidents
2. **Platform engineers** performing routine maintenance or upgrades
3. **AI agents** that assist with debugging and incident triage across multiple repositories

Each runbook should be self-contained: an engineer reading it at 3 AM during an outage should be able to follow it without prior context.

---

## How Runbooks Are Used During Incidents

### Incident Flow

```
Alert fires (PagerDuty, Wavefront, etc.)
    │
    ▼
Identify affected system and layer
    │
    ▼
Find relevant runbook in this directory
    │
    ▼
Follow diagnostic steps
    │
    ▼
Trace cross-repository impacts (see DEPENDENCY_GRAPH.md)
    │
    ▼
Apply remediation
    │
    ▼
Verify recovery
    │
    ▼
Document post-incident findings
```

### Quick Lookup by Layer

| Layer | Example Runbooks |
|---|---|
| Cloud Foundation | `gcp-project-quota-exceeded.md`, `iam-permission-denied.md` |
| Infrastructure Networking | `vpc-peering-failure.md`, `nat-exhaustion.md` |
| Kubernetes Clusters | `eks-node-not-ready.md`, `gke-cluster-unreachable.md`, `ansible-role-failure.md` |
| Service Mesh | `hb-endpoint-out-of-sync.md`, `hb-api-timeout.md`, `service-fetcher-unavailable.md` |
| Routing & Proxy | `routing-config-deploy-failure.md`, `api-proxy-5xx.md`, `nginx-config-invalid.md` |
| Application Deployment | `helm-release-failure.md`, `deploybot-stuck.md` |
| Cross-repo | `routing-deployment-image-tag-mismatch.md`, `terraform-state-lock.md` |

---

## Runbook Structure

Every runbook should follow this template:

```markdown
# [System] — [Failure Mode]

## Severity
Critical / High / Medium / Low

## Symptoms
What alerts fire? What do engineers or users observe?

## Affected Systems
Which repositories, clusters, environments, regions?

## Diagnostic Steps
1. Step-by-step commands to gather information
2. What to look for in logs, metrics, dashboards
3. Cross-repository checks (see DEPENDENCY_GRAPH.md)

## Remediation
1. Step-by-step fix procedure
2. Rollback procedure if the fix fails
3. Cross-repository remediation if needed

## Escalation
Who to contact if the runbook does not resolve the issue

## References
Links to dashboards, documentation, past incidents
```

---

## Cross-Repository Incident Patterns

Many incidents span multiple repositories. Common patterns:

### Routing deployment failure
1. Config repo (routing-config-*, proxy-config, web-config) builds a broken image
2. Jenkins auto-updates routing-deployment with the broken tag
3. DeployBot deploys to clusters
4. **Check**: Which config repo triggered the update? `bin/build-compare-links.py` in routing-deployment
5. **Fix**: Revert the config repo, or manually fix routing-deployment overlay tags

### HB endpoint out of sync
1. Application creates HBU CRD via cmf-helm-charts
2. hybrid-boundary-controller fails to reconcile
3. HB API does not register the endpoint
4. **Check**: Controller logs, HBU status, HB API directly via hb-cli
5. **Fix**: May require changes in hybrid-boundary-controller, hybrid-boundary, or hybrid-boundary-gcp

### Terraform state lock
1. A terraform/terragrunt apply was interrupted
2. State is locked in GCS (gcp-landingzone, terraform-gcp-core) or S3 (conveyor_k8s)
3. **Check**: Which repo and environment? Lock ID in error message
4. **Fix**: `terraform force-unlock <LOCK_ID>` after confirming no concurrent operations

---

## How AI Agents Should Use Runbooks

When an engineer asks for help debugging an infrastructure issue:

1. **Identify the affected layer** from the engineer's description using `ARCHITECTURE.md`
2. **Check this directory** for a matching runbook by system and symptom
3. **Follow the diagnostic steps** in sequence, suggesting commands and explaining expected output
4. **Trace cross-repository impacts** using `DEPENDENCY_GRAPH.md` — failures often cascade across repos
5. **If no runbook exists**, use `AGENT_ROUTING_RULES.md` to identify the relevant repository and investigate from first principles
6. **Suggest creating a runbook** if the incident reveals a gap

### Agent Behavior Rules

- **Do not skip diagnostic steps.** Follow the runbook sequence.
- **Do not execute remediation commands.** Suggest them and let the engineer run them.
- **Always check cross-repo impacts.** An issue in one repo may be caused by a change in another.
- **Cross-reference with live state.** Runbooks describe expected behavior; actual state may differ.
- **Note when a runbook is outdated.** Flag stale commands or unexpected output.

---

## Contributing

When adding a new runbook:

1. Use the template above
2. Name the file `{system}-{failure-mode}.md` using lowercase kebab-case
3. Include real commands, not pseudocode
4. Reference specific repositories and file paths
5. Include cross-repository diagnostic steps where applicable
6. Test the diagnostic steps against a dev or sandbox environment
7. Add the runbook to the lookup table in this README
