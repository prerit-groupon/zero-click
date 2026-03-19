# Cloud Foundation Gotchas

## Terraform State in GCS

**Issue:** Terraform state is stored in Google Cloud Storage (GCS). Concurrent applies can cause state lock contention.

**Gotcha:**
- Multiple engineers applying simultaneously → Terraform state lock acquired
- Lock can prevent subsequent operations from running
- Never use `terraform force-unlock` without confirming no active operations

**Mitigation:**
- Check active applies: `terraform show` and check Terraform Cloud/Enterprise logs
- If force-unlocking, verify with your team first
- Use Terragrunt to manage state locking automatically
- Consider using Terraform Cloud for centralized state management

---

## Project Factory — Always Use setup-new-project.py

**Issue:** GCP projects must be created consistently via automation, not manually.

**Gotcha:**
- Creating projects manually via GCP console bypasses bootstrap sequence
- Project factory script (`bin/setup-new-project.py`) ensures:
  - Correct IAM bindings are applied
  - Service accounts are configured
  - Org policies are enforced
  - Billing is linked correctly
- Manual projects lack these configurations and cause downstream errors

**Mitigation:**
- Always use: `python bin/setup-new-project.py --name <project-name> --env <dev|staging|prod>`
- Never use GCP console for project creation
- Review the script's output before confirming
- Projects created this way integrate seamlessly with terraform-gcp-core

---

## IAM Bindings — LDAP Groups Only

**Issue:** IAM bindings are group-based, using LDAP groups. Individual IAM assignments are overwritten on apply.

**Gotcha:**
- Assigning an individual user directly to a role via console → next `terraform apply` removes it
- LDAP groups are the source of truth for IAM
- Individual assignments are treated as drift and corrected by Terraform
- No warning before the overwrite — changes disappear silently

**Mitigation:**
- Always assign roles to LDAP groups, never individuals
- Ask your LDAP/identity team to add users to the correct group
- If you need to add a user temporarily, document it and plan to add them to the LDAP group
- Verify group membership in Terraform code before applying

---

## Shared VPC Firewall Changes — Blast Radius

**Issue:** Shared VPC firewall rules affect ALL projects peered to that VPC.

**Gotcha:**
- Modifying a firewall rule in the shared VPC from gcp-landingzone
- Rule change applies to ALL peered Conveyor VPCs (dev, staging, production)
- If the rule blocks traffic, it affects all downstream applications
- Changes are deployed without canary/staged rollout by default

**Mitigation:**
- Test firewall rule changes in dev shared VPC first
- Coordinate with teams running on peered VPCs before changing rules
- Understand the blast radius: how many projects/clusters are affected?
- Use targeted rules (source/destination IPs) rather than blanket rules
- Plan a maintenance window if the change could disrupt traffic

---

## Bootstrap Sequence Is Ordered

**Issue:** The bootstrap sequence (0-seed → 1-bootstrap → 2-org → 3-networks) is strictly ordered.

**Gotcha:**
- Skipping steps or applying out of order → Terraform dependency failures
- Step N+1 assumes resources from step N exist
- Trying to apply step 2-org without 0-seed and 1-bootstrap → missing variables/remote state
- No automatic validation that previous steps ran successfully

**Mitigation:**
- Always apply in order: `0-seed` → `1-bootstrap` → `2-org` → `3-networks`
- Use the provided shell scripts/Makefile to apply in the right order
- Check that each step completes successfully before starting the next
- If a step fails, fix it before proceeding to the next
- Document the bootstrap state (which steps completed) in your runbook

---

## Org Policies Cascade

**Issue:** Organization policies are applied at the org level and cascade down to all projects.

**Gotcha:**
- A restrictive org policy (e.g., "no external IPs") applies to ALL projects
- Project-level overrides are not always possible (depends on policy type)
- A policy change intended for one project cascades organization-wide
- Policies are often discovered by applications suddenly failing

**Mitigation:**
- Understand the existing org policies before creating exceptions
- Test policy changes in a non-production folder/project first
- Communicate org policy changes to all teams using GCP
- Use folder-level policies for environment-specific constraints, not org-level
- Document all org policies in a central location (ideally in the gcp-landingzone README)

---

## GCS Bucket Versioning and State Backups

**Issue:** Terraform state buckets should have versioning enabled, but manual state edits can corrupt the state file.

**Gotcha:**
- If a state lock is stuck and you try to manually edit state → corruption
- Corrupted state can require recovery from backups or full resource recreation
- GCS versioning helps, but it's not a perfect recovery mechanism

**Mitigation:**
- Enable GCS object versioning on state buckets (Terraform recommends this)
- Never manually edit state files — always use `terraform state` commands
- If state is corrupted, use `gs://bucket/path/state.tfstate#version-id` to restore from a previous version
- Keep state bucket access tightly controlled (IAM)

