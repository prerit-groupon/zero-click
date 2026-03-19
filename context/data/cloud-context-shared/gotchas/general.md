# General Cloud Platform Gotchas

## All Infrastructure Is Terraform-Managed

**Issue:** The entire cloud platform infrastructure is managed by Terraform. Manual console changes are treated as drift and overwritten.

**Gotcha:**
- Creating a resource manually in GCP/AWS console (e.g., a firewall rule, IAM binding, VPC)
- → Next `terraform apply` detects it as drift
- → Terraform removes or overwrites the manual resource
- No warning — manual changes disappear on the next apply
- Manual configurations never persist — they're temporary hacks at best

**Mitigation:**
- Always use Terraform to manage infrastructure
- If you need to create a resource, add it to the appropriate Terraform repo
- Open a PR, get review, merge, then apply
- Never use the console for anything that's in version control
- If someone made manual changes:
  1. Identify what changed (terraform plan)
  2. Add those changes to Terraform
  3. Re-apply (your changes will be preserved)
  4. Document why the change was needed (for code review)

---

## terraform force-unlock Requires Confirmation

**Issue:** When Terraform state is locked, the only way to unlock it is `terraform force-unlock`. This is dangerous.

**Gotcha:**
- Another engineer's terraform apply hangs and acquires a lock
- Someone force-unlocks without checking if apply is still running
- → Two applies run simultaneously
- → State corruption
- → Inconsistent infrastructure state
- → Potentially infrastructure loss

**Mitigation:**
- Before force-unlocking, ALWAYS confirm:
  1. No apply operations are running (check Terraform Cloud/Jenkins logs)
  2. The lock holder is notified (Slack, email)
  3. The apply was actually stuck (not just slow)
- Only force-unlock as a last resort
- Process: `terraform force-unlock <lock-id>` (after confirming)
- Document why you force-unlocked in a git commit message
- Have a team policy: never force-unlock alone, always involve 2+ people
- Consider using Terraform Cloud for centralized state (it has better lock management)

---

## Environment Progression: dev/sandbox → rapid → stable → production

**Issue:** Infrastructure and applications progress through environments in a strict order.

**Gotcha:**
- Deploying directly to production without testing in staging
- → Bugs and misconfigurations reach production immediately
- → Customer impact, data loss, outages
- Each environment has different security, network, and compliance posture
- No automatic enforcement — it's a process issue

**Mitigation:**
- Always follow: dev/sandbox → rapid → stable → production
- Test at each stage:
  - dev/sandbox: experimental features, breaking changes
  - rapid: quick iteration, staging-like infrastructure
  - stable: production-like, final validation before production
  - production: live traffic, highest SLA
- Never skip environments
- Tag releases in git to match environment progression (e.g., `release/v1.2.3`)
- Monitor each environment separately (different dashboards, alerts, metrics)
- Document what was tested at each stage (for compliance)

---

## AWS Regions: us-west-1, us-west-2, eu-west-1

**Issue:** Groupon cloud platform uses specific AWS regions for EKS clusters and infrastructure.

**Gotcha:**
- Creating AWS resources in the wrong region (e.g., us-east-1)
- → Resources are not accessible to EKS clusters
- → Mismatch between Terraform expected region and actual region
- No automatic enforcement — you have to check your Terraform code

**Mitigation:**
- Always specify region in Terraform: `provider "aws" { region = "us-west-1" }`
- Check Terraform plan before applying: `terraform plan | grep -i region`
- Document which regions your service uses
- Use consistent region naming across repos (check REGIONAL_CONFIG.md if it exists)
- For multi-region deployments, coordinate with Cloud Platform team

---

## GCP Regions: us-central1, europe-west1

**Issue:** Groupon cloud platform uses specific GCP regions for GKE clusters and infrastructure.

**Gotcha:**
- Creating GCP resources in the wrong region (e.g., asia-southeast1)
- → Not available to Kubernetes clusters
- → Terraform state mismatch
- Regional resources (Compute, VPC) are not visible across regions

**Mitigation:**
- Always specify region in Terraform: `variable "gcp_region" { default = "us-central1" }`
- Check Terraform plan: `terraform plan | grep -i region`
- Document which regions your service uses
- For cross-region deployments, set up region-specific Terraform workspaces
- Verify DNS and network connectivity across regions (VPC peering, Cloud Router)

---

## All Changes Go Through PR → CI → Review → Deploy

**Issue:** All infrastructure changes follow a formal CI/CD pipeline: PR → CI build → peer review → approval → merge → apply/deploy.

**Gotcha:**
- Trying to apply Terraform changes locally without a PR (rogue apply)
- → Bypasses CI validation and peer review
- → No audit trail, no approval record
- → Potential security and compliance violations
- Code review catches mistakes — skipping review is risky

**Mitigation:**
- ALWAYS open a PR, even for small changes
- Wait for CI to pass (all tests, linting, validation)
- Request review from team members
- Get approval before merging
- Merge to main, then apply via DeployBot or automated pipeline
- Never use `terraform apply` locally on production infrastructure (use only for testing)
- Document the change reason in the PR (for future reference)
- Monitor post-deployment (verify resource creation, no errors)

---

## Cross-Repo Changes Are Common — Check DEPENDENCY_GRAPH.md

**Issue:** Changes across multiple repos (gcp-landingzone + terraform-gcp-core + conveyor_k8s) are common and must be coordinated.

**Gotcha:**
- Changing a subnet in terraform-gcp-core without updating GKE manifests in conveyor_k8s
- → Cluster creation fails (pod CIDR mismatch)
- → Or nodes can't join (service CIDR mismatch)
- → Cascading failures across multiple services
- No automatic check that dependent repos are in sync

**Mitigation:**
- Before making changes, check DEPENDENCY_GRAPH.md (should exist in each repo)
- Identify which other repos depend on your changes
- Plan a coordinated deployment:
  1. Apply changes to lowest-level repo first (gcp-landingzone)
  2. Then dependent repos (terraform-gcp-core)
  3. Then higher-level repos (conveyor_k8s, service deployments)
- Open PRs in all affected repos simultaneously (reference each other)
- Test end-to-end in dev environment before production
- If something breaks, investigate all dependent repos
- Document dependencies in code comments and README

---

## DeployBot Uses Deploy Tags for Triggering

**Issue:** DeployBot uses specific git tags (deploy tags) to trigger deployments, not branch names or PR merges.

**Gotcha:**
- Merging a PR to main expecting automatic deployment → nothing happens
- DeployBot doesn't know which version to deploy (no tag specified)
- Manual tag creation required
- Tag naming conventions vary by repo

**Mitigation:**
- Understand your repo's deploy tag convention
  - Common: `deploy-staging`, `deploy-prod`, `deploy-release-v1.2.3`
  - Check repo README for specific convention
- When deploying via DeployBot:
  1. Merge PR to main (CI passes)
  2. Create deploy tag: `git tag deploy-prod && git push origin deploy-prod`
  3. DeployBot watches for tag, triggers deployment
  4. Monitor deployment: `kubectl rollout status deployment/<app-name>`
- Set up git hooks or CI/CD automation to create deploy tags automatically
- Document tag conventions in the repo README and runbooks

---

## Each Repo Has AI_OVERVIEW.md at Root

**Issue:** Each repository has an AI_OVERVIEW.md file at the root that documents the repo for AI agents/tools.

**Gotcha:**
- Working in a repo without understanding its purpose and structure
- → Incorrect changes, misaligned with repo conventions
- → AI tools and documentation might be out of sync with actual code
- No single source of truth for repo context

**Mitigation:**
- Before making changes, READ the AI_OVERVIEW.md file
- Understand:
  - Repo purpose and scope
  - Key files and directories
  - Conventions and patterns
  - Dependencies and integrations
  - How to test and validate changes
- If AI_OVERVIEW.md is outdated, update it as part of your PR
- Use AI_OVERVIEW.md to onboard new team members
- Reference AI_OVERVIEW.md in PRs and runbooks
- Keep AI_OVERVIEW.md in sync with code changes

---

## Concurrent Applies Can Cause State Lock Issues

**Issue:** When two engineers apply Terraform simultaneously, state locks can block operations.

**Gotcha:**
- Engineer A applies terraform-gcp-core changes
- Engineer B tries to apply gcp-landingzone changes
- → State lock acquired by Engineer A
- → Engineer B's apply hangs, waiting for lock
- → Eventually times out, apply fails
- Concurrent applies are not supported

**Mitigation:**
- Coordinate Terraform applies with your team
- Use Slack channel or calendar to announce planned applies
- Check if another apply is running before you start: `terraform show` or check Terraform Cloud
- If you must apply simultaneously (emergency), use `terraform apply --auto-approve` on separate state buckets
- Set appropriate state lock timeout (usually 30 minutes)
- Monitor for stuck locks: `terraform force-unlock <lock-id>` (use with caution)
- Consider using Terraform Cloud for centralized state and built-in locking

---

## Always Run terraform validate and plan Before Apply

**Issue:** Terraform validation and planning catches many errors before they're deployed to infrastructure.

**Gotcha:**
- Skipping `terraform validate` and `terraform plan` to save time
- → Invalid syntax, type mismatches, missing variables → discovered during apply
- → Apply fails mid-way, infrastructure left in inconsistent state
- Validation and planning are fast and prevent costly mistakes

**Mitigation:**
- Always run: `terraform validate` (syntax check)
- Always run: `terraform plan` (preview changes)
- Review the plan output carefully (understand what will be created/modified/destroyed)
- Only apply if plan looks correct: `terraform apply`
- Set up pre-commit hooks to run validate automatically
- Document expected changes in PR (e.g., "Creates 3 new VPCs, modifies firewall rules")
- If plan shows unexpected changes, investigate before applying

