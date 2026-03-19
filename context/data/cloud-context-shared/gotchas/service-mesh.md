# Service Mesh & Edge Proxy Gotchas

## HBU Controller Manages ~422 Objects in Production

**Issue:** The hybrid-boundary-controller manages approximately 422 CRDs in production. A single controller bug cascades to all services.

**Gotcha:**
- Controller reconciliation loop watches all HBU CRDs
- A bug in the controller (e.g., incorrect ILB creation logic) affects 422+ services simultaneously
- No graceful degradation — broken controller = all services lose mesh features
- Rollback can be slow if hundreds of resources are in inconsistent state

**Mitigation:**
- Test controller changes exhaustively in dev/staging clusters first
- Understand the reconciliation logic before modifying it
- Run controller in HA mode (multiple replicas) to avoid single points of failure
- Monitor controller logs for reconciliation errors: `kubectl logs -f -n karpenter <controller-pod>`
- Have a quick rollback procedure (revert image tag, restart controller)
- Document controller behavior and expected reconciliation patterns
- Set up alerts for controller errors and resource reconciliation failures

---

## HBU Controller CRD Changes Require cmf-helm-charts Updates

**Issue:** Changes to HBU CRD schemas in hybrid-boundary-controller require immediate, coordinated updates in cmf-helm-charts.

**Gotcha:**
- Modifying HBU CRD field structure (e.g., adding a required field to HBUService)
- → Applications using old chart template fail to emit valid CRDs
- → Controller rejects invalid CRDs
- → Services fail to register in mesh
- Both repos MUST change together — mismatched schemas cause cascading failures

**Mitigation:**
- Never merge CRD schema changes without coordinating with cmf-helm-charts team
- Update cmf-helm-charts BEFORE rolling out controller changes in production
- Version both changes together (release notes should reference both PRs)
- Test end-to-end: deploy application with new chart → verify CRD is created and reconciled
- If accidentally deployed with mismatched schemas:
  1. Revert hybrid-boundary-controller to previous version
  2. Verify CRDs are reconciled successfully
  3. Update cmf-helm-charts
  4. Re-deploy controller with updated charts in place
- Document CRD schema changes in CHANGELOG with migration instructions

---

## mTLS Sidecar HTTP/2 is OPT-IN

**Issue:** HTTP/2 is disabled by default in the mTLS sidecar. It must be explicitly enabled.

**Gotcha:**
- Assuming HTTP/2 is available because the sidecar is deployed → applications fail with HTTP/1.1-only errors
- ALPN advertises both h2 and http/1.1 on downstream listeners (regardless of HTTP/2 setting)
- No automatic negotiation to HTTP/1.1 if HTTP/2 is disabled
- Configuration must be set in cmf-helm-charts values: `mtls.http2: true`

**Mitigation:**
- Never assume HTTP/2 is enabled — always check chart values
- If application requires HTTP/2:
  1. Set `mtls.http2: true` in helm values
  2. Verify sidecar is configured: `kubectl describe pod <pod-name> | grep -A 5 mtls`
  3. Test with HTTP/2 client: `curl -v --http2 https://service`
- If application does NOT require HTTP/2, leave default (false) — reduces complexity
- Document HTTP/2 requirement for each service in its README

---

## ALPN Advertises h2 and http/1.1 Regardless

**Issue:** Application Layer Protocol Negotiation (ALPN) on TLS listeners advertises both h2 and http/1.1, regardless of HTTP/2 enable setting.

**Gotcha:**
- Client sees h2 in ALPN and assumes HTTP/2 is available
- But the downstream Envoy listener is HTTP/1.1-only (if `mtls.http2: false`)
- Client sends HTTP/2 frames → Envoy rejects them
- Misleading ALPN advertisement — this is by design, but it's confusing

**Mitigation:**
- Understand ALPN advertisement vs. actual protocol support are decoupled
- Always explicitly set `mtls.http2: true` if the application uses HTTP/2
- Client-side: respect the actual listener response (ALPN is a hint, not a guarantee)
- Document this behavior in the mtls-sidecar README
- Test with tools that respect actual protocol responses: gRPC clients, HTTP/2-capable load balancers

---

## PAT Expiry Affects service-fetcher Deployment

**Issue:** Service-fetcher is deployed via Ansible (by conveyor_k8s), which may use GitHub Enterprise Server (GHES) PATs. If PAT expires, deployments fail.

**Gotcha:**
- GHES Personal Access Token (PAT) used by Ansible expires after 1 year
- Token expiry → Ansible GitHub module fails → service-fetcher not deployed
- No obvious error message — Ansible logs show auth failure
- Service-fetcher absent → service discovery broken → services can't register in mesh

**Mitigation:**
- Rotate GHES PATs before expiry (set calendar reminder for 11 months after creation)
- Store PAT in secure secret management (Vault, not plaintext)
- Monitor Ansible deployments for auth errors
- Have a runbook for PAT rotation (update Ansible vars, re-run playbook)
- Consider using GitHub App authentication instead of PATs (more robust)

---

## PAR Auto-Approval Depends on Service Portal Classification

**Issue:** Platform Access Request (PAR) auto-approval policies depend on data classification configured in Service Portal.

**Gotcha:**
- Service classified as C1 (public) → permissive PAR policies apply
- Same service misclassified as C3 (confidential) → restrictive policies → legitimate requests denied
- No validation that Service Portal classification matches actual data sensitivity
- Changes in Service Portal take time to propagate to PAR policies

**Mitigation:**
- Verify Service Portal classification before deploying new services
- Document the rationale for each data classification
- Cross-check PAR policies against actual data sensitivity
- If PAR approval is unexpectedly denied:
  1. Check Service Portal classification
  2. Verify PAR policy rules in par-automation repo
  3. Update classification if needed (not the policy)
- Set up alerts for policy enforcement mismatches
- Audit Service Portal classifications monthly

---

## HB Edge Proxy Uses xDS (Dynamic Config, NOT Static)

**Issue:** Hybrid Boundary edge proxy uses gRPC-based xDS (Extensible Discovery Service) for dynamic configuration, not static config files.

**Gotcha:**
- You cannot configure the edge proxy by editing static YAML/JSON files
- Configuration comes from the xDS control plane in real-time
- Changes to edge proxy behavior happen dynamically — no pod restart needed
- But if the xDS control plane is down, no new configurations can be pushed

**Mitigation:**
- Never try to edit static edge proxy config files — they're ignored
- All configuration goes through the xDS API
- Monitor xDS control plane health: `kubectl logs -f -n hybrid-boundary hb-xds-server`
- Changes to xDS rules take effect immediately (no pod restarts)
- If edge proxy is not respecting rules, check xDS control plane logs
- Document xDS API endpoints and configuration format in hybrid-boundary README

---

## service-fetcher is Ansible-Deployed (Not Direct K8s Edit)

**Issue:** Service-fetcher is deployed via Ansible playbooks by conveyor_k8s, not via static Kubernetes manifests.

**Gotcha:**
- Manually editing the service-fetcher Deployment in Kubernetes → changes are overwritten on next Ansible run
- Image updates must be done via conveyor_k8s `group_vars/`, not `kubectl edit deployment`
- No direct K8s manifest versioning — changes are managed in Ansible
- Easy to lose changes if you forget about Ansible

**Mitigation:**
- Never manually edit service-fetcher Deployment or related resources
- Image updates: change `group_vars/[env]/service-fetcher.yml` in conveyor_k8s
- After updating group_vars, run Ansible playbook: `ansible-playbook -i inventory.ini site.yml -t service-fetcher`
- Verify changes: `kubectl describe deployment service-fetcher -n [namespace]`
- Document service-fetcher configuration in conveyor_k8s README
- Set up alerts for Ansible deployment failures

---

## HBU Controller CRD Validation Failures are Silent

**Issue:** If an application emits invalid HBU CRDs (via cmf-helm-charts), the controller silently fails to reconcile them.

**Gotcha:**
- Application chart templates create invalid CRD (wrong field type, missing required field)
- Controller rejects the CRD but doesn't notify the user
- Service registration fails — application cannot reach other services
- No obvious error message in app logs

**Mitigation:**
- Always test application deployments with new chart versions in dev first
- Check CRD validation: `kubectl get hbuservice <service-name> -o yaml | kubectl apply -f - --dry-run=client`
- Monitor controller logs for reconciliation errors: `kubectl logs hybrid-boundary-controller`
- Set up alerts for CRDs in Error state: `kubectl get hbuservice --field-selector=status.phase=Error`
- If a deployment fails silently:
  1. Check emitted CRD: `kubectl get hbuservice <service-name> -o yaml`
  2. Validate against schema: compare with hybrid-boundary-controller CRD definition
  3. Check controller logs: `kubectl logs hybrid-boundary-controller | grep -i error`
  4. Fix chart template in cmf-helm-charts, re-deploy application

