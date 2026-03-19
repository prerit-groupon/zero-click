---
description: "Cross-cutting gotchas that apply across multiple CICDO domains. Auth, GCP, Kubernetes, networking. Update when you discover new ones."
---

# General / Cross-Cutting Gotchas

## GCP

- **Service account impersonation**: Many gcloud commands require `--impersonate-service-account`. Forgetting this gives "permission denied" even with correct IAM roles.
- **Terraform state**: All infra is Terraform-managed. Manual GCP Console changes will be overwritten on next `terraform apply`.

## Kubernetes

- **kubectl cloud-elevator auth**: Required for cluster access. Auth tokens expire — re-run if you get 401 errors.
- **Namespace isolation**: Each service deploys to its own namespace. Cross-namespace access requires explicit NetworkPolicy configuration.

## Networking

- **Internal DNS**: Services use `.groupondev.com` domain. External DNS resolution won't work for internal services.
- **VPN requirement**: Most CICDO services are only accessible on Groupon's internal network or VPN.

## Authentication

- **Okta SSO**: Most web UIs use Okta. Expired Okta sessions cause redirect loops, not clear error messages.
- **LDAP groups**: Service access is controlled via LDAP groups. New team members need ARQ requests for each service they need access to.
- **PAT management**: GitHub PATs, Artifactory tokens, and service account keys all have expiry dates. Track them or face outages.

## Agent Tips

- **Always check gotchas before giving advice**: The gotchas files capture hard-won knowledge from real incidents. A 30-second read can prevent a bad recommendation.
- **When something fails unexpectedly**: Add it to the relevant gotchas file. Future interactions will benefit.
- **Don't trust defaults**: Many CICDO services have customized configurations. Always check the actual config in the codebase before assuming standard behavior.
