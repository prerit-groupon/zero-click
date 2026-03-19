# Traffic Routing & Proxy Gotchas

## Never Manually Edit routing-deployment Image Tags

**Issue:** Image tags in the routing-deployment manifest are auto-updated by Jenkins pipelines when config repos are merged.

**Gotcha:**
- Manually editing the image tag in routing-deployment manifest (via kubectl or YAML)
- → Next config repo merge triggers Jenkins build
- → Jenkins pushes a new image
- → Manifest is updated with the new tag
- → Your manual change is overwritten, lost forever
- No warning or merge conflict — changes just disappear

**Mitigation:**
- NEVER manually edit routing-deployment image tags
- Always trigger updates by merging changes to config repos (routing-config-*, proxy-config, web-config)
- If you need to pin a specific image version:
  1. Check the git history of routing-deployment to find the last working tag
  2. Open an issue requesting a revert
  3. Merge a change to a config repo that will trigger the revert
- Monitor the Jenkins pipeline to verify image updates: Jenkins UI → routing-deployment job
- Document the image tag in the PR (e.g., "pins image to v1.2.3-stable")

---

## routing-service ILB is Static (NOT HBU-Managed)

**Issue:** The routing-service ILB is a special static resource, not managed by hybrid-boundary-controller.

**Gotcha:**
- Other services get ILBs created automatically by hybrid-boundary-controller
- routing-service ILB is pre-created and manually managed
- If the ILB is accidentally deleted → routing-service is unreachable
- No automatic recreation — requires manual intervention
- Unlike HBU-managed ILBs, you can't rely on controller to fix it

**Mitigation:**
- Treat routing-service ILB as a critical static resource
- Document the ILB creation process in a runbook
- If ILB is missing:
  1. Check if it still exists: `kubectl get service routing-service -A`
  2. If Service exists but ILB is gone, recreate it manually via Terraform
  3. Verify traffic is flowing: curl test or metrics check
- Monitor ILB status as part of routing system health checks
- Have alerts for ILB creation/deletion events

---

## routing-service Pod Has NO mTLS Sidecar

**Issue:** The routing-service pod does NOT include the mTLS sidecar, unlike the standalone api-proxy deployment.

**Gotcha:**
- Assuming routing-service has mTLS encryption to backends → it doesn't
- Traffic from routing-service pod to backend HBU ILBs is unencrypted (HTTP/1.1 localhost:9000)
- If you need encrypted backend communication, use the standalone api-proxy deployment (with sidecar)
- No warning that routing-service is unencrypted — just a different deployment variant

**Mitigation:**
- Understand which deployment you're using: routing-service (no mTLS) vs. standalone (with mTLS)
- If mTLS is required for your use case, use the standalone api-proxy deployment
- Document the security posture of routing-service (internal traffic, no sidecar)
- For compliance requirements (SOX, PCI), verify if mTLS sidecar is needed
- Monitor backend traffic to ensure it's not exposed to untrusted networks

---

## Two api-proxy Deployments — Code Changes Affect BOTH

**Issue:** api-proxy code (in the `api-proxy` repo) is used by two different deployments: routing-service and standalone.

**Gotcha:**
- Merging a change to api-proxy code → affects both routing-service and standalone deployments
- A bug in api-proxy affects both routing paths (internal and external)
- The routing-service deployment (no sidecar) is NOT suitable for high-security traffic
- Code changes cannot be selectively deployed to one variant only

**Mitigation:**
- Test api-proxy code changes thoroughly — they affect two critical deployments
- Understand which features are used by routing-service vs. standalone
- If a feature is only for standalone, document that clearly in code/PR
- For high-risk changes, deploy to staging first, verify both variants work
- Have a rollback procedure (revert api-proxy image tag via config repo merge)
- Monitor both deployments for errors: `kubectl logs -f routing-service` and `kubectl logs -f api-proxy-standalone`

---

## Always Test Routing Changes in Staging FIRST

**Issue:** Routing configuration changes can redirect traffic incorrectly, affecting all downstream services.

**Gotcha:**
- Merging a routing rule directly to routing-config-production without testing in staging
- → Rule goes live immediately (Jenkins auto-deploys)
- → Traffic is misdirected to wrong backend
- → Customer-facing outage
- No staged rollout by default — changes are immediate

**Mitigation:**
- ALWAYS test in routing-config-staging first
- Verification steps:
  1. Merge to staging branch: `git commit & git push origin feature-branch`
  2. Wait for Jenkins staging build to complete
  3. Test with staging cluster traffic: `curl -v https://staging-api.groupon.com/test-path`
  4. Verify logs and metrics (check routing-service and api-proxy logs)
  5. Only after validation, merge to routing-config-production
- Set up PR approval requirements (at least 2 approvals for production routing changes)
- Monitor production routing metrics after merging
- Have a rollback procedure ready (revert PR, merge to production)

---

## .flexi DSL Validation — Run gradlew validate

**Issue:** The .flexi DSL (used in routing-config-* repos) has a specialized syntax that can be invalid.

**Gotcha:**
- Committing invalid .flexi DSL syntax → Jenkins build fails
- Build failure → routing-deployment is not updated → old rules stay in place
- If you unknowingly committed invalid rules, the system appears to accept them but doesn't deploy them
- No clear error message in the git UI — you have to check Jenkins logs

**Mitigation:**
- Always run DSL validation before committing: `cd routing-config-production && ./gradlew validate`
- Fix validation errors before opening a PR
- Set up pre-commit git hook to run validation automatically
- Monitor Jenkins build status: if build fails, don't merge
- Common .flexi syntax errors:
  - Missing semicolons
  - Incorrect rule nesting
  - Undefined variables or functions
- Document .flexi DSL syntax in routing-config README (link to grammar docs)

---

## nginx Proxies to api-proxy via HTTP/1.1 on localhost:9000

**Issue:** nginx runs in the same pod as api-proxy and communicates via localhost:9000, HTTP/1.1, no TLS.

**Gotcha:**
- There is no encryption between nginx and api-proxy (they're in the same pod)
- Changing api-proxy port without updating nginx config → traffic stops
- If api-proxy is slow or crashes, nginx will time out and return 504
- Network policies do NOT apply to localhost traffic (they're in the same pod)

**Mitigation:**
- Understand the architecture: nginx (TLS termination) → api-proxy (routing logic) → backends
- api-proxy must listen on port 9000 — do not change without coordinating nginx update
- Monitor api-proxy response times: slow api-proxy → slow client responses
- Configure appropriate timeouts in nginx (check web-config Mustache templates)
- If api-proxy crashes, nginx returns 504 Gateway Timeout — monitor for these errors
- Health check api-proxy: `curl -v http://localhost:9000/health` from within the pod

---

## Config Repos (routing-config, proxy-config, web-config) Trigger Deploy Chain

**Issue:** Merging ANY change to routing-config-*, proxy-config, or web-config repos triggers the full routing-deployment pipeline.

**Gotcha:**
- Merging a small fix to proxy-config
- → Jenkins build job starts
- → Config validation + merge
- → New Docker image built (includes all configs)
- → routing-deployment manifest updated
- → DeployBot deploys
- → All routing-service pods restart
- A single-config change cascades to full routing system restart

**Mitigation:**
- Batch unrelated changes into a single deployment (reduces restarts)
- Understand the cascade: config merge → Docker build → routing-deployment update → pod restart
- Plan config changes during low-traffic periods (reduces impact)
- Monitor deployment progress: `kubectl rollout status deployment/routing-service`
- Have a quick rollback (revert PR, wait for Jenkins, verify)
- Document what's happening during the deploy chain (for runbooks)
- Use feature flags in config if you need to disable features without redeploying

---

## Understand api-proxy Variants

**Issue:** There are two different api-proxy deployment approaches, and they have different security/performance characteristics.

**Gotcha:**
- Mixing up which deployment you're working with (routing-service vs. standalone)
- routing-service: no mTLS, simple HTTP proxying, internal use
- standalone: with mTLS sidecar, more secure, more overhead
- Different configurations, different scaling characteristics, different reliability profiles

**Mitigation:**
- Clearly document which variant you're using in your service documentation
- Understand the tradeoffs:
  - routing-service: fast, simple, unencrypted
  - standalone: secure, encrypted, more overhead
- Monitor both variants to understand which is used where
- For new services: prefer standalone with mTLS (better security posture)
- For internal services without sensitive data: routing-service is fine

---

## Config Merge Conflicts in .flexi DSL

**Issue:** When multiple teams modify routing-config simultaneously, merge conflicts occur in .flexi DSL files.

**Gotcha:**
- Two PRs modify different routing rules in the same file
- → Merge conflict in .flexi DSL syntax
- → git merge conflict markers break the DSL syntax
- → Manual resolution required
- → If resolved incorrectly, validation fails or rules don't work

**Mitigation:**
- Use git branch protection: require PR approval before merging
- Coordinate routing rule changes across teams (use Slack channel)
- For merge conflicts:
  1. Check out the feature branch: `git checkout feature-branch`
  2. Pull latest main: `git pull origin main`
  3. Manually resolve conflicts (understand .flexi syntax)
  4. Run validation: `./gradlew validate`
  5. Test in staging
  6. Force-push (if necessary) and request re-review
- Keep routing-config PRs focused (one rule change per PR when possible)

