# Kubernetes Platform Gotchas

## Cluster Promotion Order — Strict Sequence

**Issue:** Clusters must be promoted through environments in a strict order: sandbox → rapid → stable → production.

**Gotcha:**
- Skipping environments (e.g., deploying directly to production from dev) causes untested code to reach production
- Each environment has different security posture, data policies, and SLAs
- Rapid environment is for quick iteration; stable is production-like; production is live
- No enforcement mechanism — you can skip, but you shouldn't

**Mitigation:**
- Always follow the progression: sandbox → rapid → stable → production
- Test thoroughly at each stage before proceeding
- Use different Ansible group_vars for each environment (enforces configuration differences)
- Document test results for each environment before promotion
- Tag/branch releases in git to match environment progression

---

## Ansible Role Changes Trigger PR Tests

**Issue:** Modifying Ansible roles in conveyor_k8s triggers playbook execution on dev clusters via PR automation.

**Gotcha:**
- Any change to a role in the `roles/` directory → PR CI/CD runs the playbook on dev clusters
- If the playbook is broken, dev clusters can be left in a broken state
- Rolling back a change might require manual intervention on dev clusters
- Test changes in a local Vagrant/Docker environment first to avoid dev cluster disruption

**Mitigation:**
- Test Ansible changes locally before opening a PR
- Use Vagrant or Docker to simulate cluster conditions
- Review Ansible syntax (`ansible-playbook --syntax-check`)
- Run idempotent checks: run the playbook twice, verify second run makes no changes
- Have a runbook for recovering dev clusters from broken Ansible state
- Review the role carefully — understand what it does before merging

---

## GKE Cluster Manifests Use Conveyor Subnet Ranges

**Issue:** GKE clusters in terra-gke/ manifest files reference subnet CIDR ranges from terraform-gcp-core.

**Gotcha:**
- Changing subnets in terraform-gcp-core (e.g., pod CIDR, service CIDR) requires coordinated changes in terra-gke/
- If you change a subnet without updating the cluster manifest → cluster recreation or node join failures
- Changes must be synchronized — apply terraform-gcp-core FIRST, then terra-gke/
- No automated check that manifests match actual subnets

**Mitigation:**
- Always check DEPENDENCY_GRAPH.md before making networking changes
- If modifying subnets in terraform-gcp-core, immediately update terra-gke/ manifests
- Subnet changes should be done in a maintenance window (clusters need to drain and recreate)
- Document subnet allocations in a shared spreadsheet/wiki (avoid conflicts)
- Coordinate with teams running on affected clusters

---

## Karpenter Node Pool Changes — Rescheduling Storms

**Issue:** Karpenter (AWS only) automatically manages node pools based on workload demands. Config changes can trigger pod rescheduling.

**Gotcha:**
- Changing Karpenter consolidation settings, instance types, or limits
- → Existing nodes marked for termination
- → Pods rescheduled to new nodes
- → Rescheduling storms if many pods are affected
- → Application disruption if pods have strict affinity rules or long startup times

**Mitigation:**
- Test Karpenter changes on dev/sandbox clusters first
- Understand current node pool composition: `kubectl get nodes -L karpenter.sh/capacity-type,instance-type`
- Plan Karpenter updates during maintenance windows
- Monitor pod rescheduling: `kubectl logs -f -n karpenter <karpenter-pod> | grep consolidation`
- Have a rollback plan (revert Karpenter config and restart nodes)
- Document why changes were made (for future maintainers)

---

## AMI Baking — Stale AMIs Cause Join Failures

**Issue:** Packer builds fresh AMIs for EC2 nodes. Stale AMIs lack OS patches, Docker updates, or kubelet fixes.

**Gotcha:**
- Using a stale AMI (weeks or months old) → EC2 nodes fail to join the cluster
- Kubelet or Docker version mismatch → nodes in NotReady state
- OS security patches missing → nodes vulnerable to exploits
- No warning until nodes try to join — cluster might be partially broken

**Mitigation:**
- Always bake a fresh AMI before production deployments
- AMI baking step: `packer build packer/groupon-base.json`
- Check Packer output for errors before using the AMI
- Use the AMI ID in Terraform immediately after baking (don't delay)
- Set up automated AMI baking in CI/CD (weekly or on demand)
- Document AMI IDs and their creation dates in the cluster manifest

---

## Cluster Upgrade Coordination

**Issue:** Kubernetes cluster upgrades (both EKS and GKE) must be coordinated across control plane and node pools.

**Gotcha:**
- Control plane upgrade → affects API server availability temporarily
- Node upgrades follow control plane → pods rescheduled if MaxUnavailable is high
- If you upgrade too aggressively → application downtime
- No safety guard — you can drain and update all nodes at once (don't do this)

**Mitigation:**
- Check Kubernetes upgrade path compatibility (minor version gaps)
- Upgrade in order: sandbox → rapid → stable → production
- Use cluster upgrade windows (typically maintenance windows)
- Monitor API server availability: `kubectl get componentstatuses`
- Plan pod eviction timeouts (default 5 minutes — increase if needed)
- Test cluster upgrade in dev environment first

---

## Service Account Permissions in EKS vs GKE

**Issue:** Service account permissions differ significantly between EKS (IAM roles) and GKE (Workload Identity).

**Gotcha:**
- EKS uses IAM roles for service accounts (IRSA) — requires IAM policy attachment
- GKE uses Workload Identity — requires service account binding to GCP service account
- Mixing up the approach on the wrong platform → pods lack permissions to cloud APIs
- No error message until the application tries to use cloud APIs

**Mitigation:**
- Understand your platform (EKS vs GKE) before setting up service accounts
- For EKS: attach IAM roles via Terraform (terra-eks/iam.tf)
- For GKE: bind Kubernetes service accounts to GCP service accounts (terra-gke/iam.tf)
- Test permissions in dev cluster: `kubectl describe sa <service-account>`
- Document which cloud APIs are required for each service

---

## Group Vars Override Hierarchy

**Issue:** Ansible group_vars in conveyor_k8s have a complex override hierarchy (all → os_type → env → cluster).

**Gotcha:**
- Setting a variable at the top level (all) can inadvertently affect production
- A dev-specific variable in `group_vars/all` overrides production settings
- Variable precedence is not always obvious — easy to introduce bugs
- No warning when a higher-level variable overrides a lower-level one

**Mitigation:**
- Understand group_vars hierarchy: `all` → `os_type` → `env` → `cluster`
- Place production-specific variables in the most specific group_var file
- Use descriptive variable names that include the scope (e.g., `prod_kafka_replicas`, not just `kafka_replicas`)
- Document variable purpose and scope in comments
- Test changes in dev group_vars before applying to production group_vars

