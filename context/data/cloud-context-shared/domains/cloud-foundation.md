---
description: "GCP organization governance foundation layer — project factory, IAM bindings, shared VPCs, org policies, and bootstrap sequence"
---

# Cloud Foundation

## Overview

The **gcp-landingzone** repository is the foundational layer for all Groupon cloud infrastructure on GCP. It manages the organization hierarchy, project factory, IAM policies, shared VPCs, and organization-wide policies. This is the starting point for all GCP infrastructure deployment.

## Key Responsibilities

### GCP Organization Hierarchy
- GCP organization structure with ~271 total projects
- Project-to-folder hierarchy organized by environment and function
- Organization-level policies enforcing security and compliance standards

### Project Factory
- Automated project creation via `bin/setup-new-project.py` script
- Ensures consistent project setup across all environments
- Configures billing, APIs, service accounts automatically
- Never create projects manually via the console

### IAM Bindings & LDAP Integration
- Group-based IAM bindings using LDAP groups
- Roles assigned to organizational units, teams, and functional groups
- Individual IAM assignments are overwritten on next apply — always use LDAP groups
- Service account key management for automation

### Shared VPCs
- Provides shared VPC infrastructure for peering with Conveyor VPCs (from terraform-gcp-core)
- Firewall rules, DNS zones, and network policies defined at organization level
- Changes to shared VPC firewall rules affect ALL peered projects

### Organization Policies
- Constraint enforcement (e.g., VM disk encryption, VPC SC, resource locations)
- Audit logging and monitoring policies
- Compliance controls for SOX, PCI, C1-C3 data classification

## Bootstrap Sequence

Infrastructure is deployed in a strict, ordered sequence:

```
0-seed (service account setup, GCS buckets for Terraform state)
    ↓
1-bootstrap (Terraform remote state configuration, CI/CD service accounts)
    ↓
2-org (organization-level resources: folders, org policies, shared VPC)
    ↓
3-networks (GCP networks, Cloud Router, NAT, private DNS zones)
```

Do not skip steps — each layer depends on the previous one.

## Key Technologies

- **Terraform** — infrastructure as code
- **Terragrunt** — DRY wrapper for Terraform (composition)
- **Terrabase** — shared Terraform modules library
- **Python** — setup scripts and automation utilities
- **GitHub Actions** — CI/CD pipeline triggers
- **Jenkins** — additional pipeline orchestration

## Key Paths

- `envs/` — environment-specific configurations (dev, staging, prod)
- `modules/` — Terraform modules for reusable components
- `bin/setup-new-project.py` — project factory script (always use this)
- `.terragrunt.hcl` — Terragrunt configuration

## Related Documentation

- See [gotchas/cloud-foundation.md](../gotchas/cloud-foundation.md) for common pitfalls
- See [domains/infrastructure-networking.md](./infrastructure-networking.md) for terraform-gcp-core dependencies
- See [domains/kubernetes-platform.md](./kubernetes-platform.md) for GKE cluster networking dependencies

---

**Repository:** `gcp-landingzone`
**Status:** Critical infrastructure path
**Maintainers:** Cloud Platform team
