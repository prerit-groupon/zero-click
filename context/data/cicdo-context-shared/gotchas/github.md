---
description: "Known failure patterns for GitHub domain (GHES, GHA runners). Update this every time you discover a new gotcha."
domain: github
---

# GitHub Gotchas

## GHA Runners

- **Public repo access needs BOTH levels**: Must enable at Enterprise AND Org level. Missing either = silent failure where runners exist but never pick up jobs.
- **Helm Chart is customized**: Uses v0.13.1 from `github-cloud-arc`, NOT upstream ARC. Don't pull upstream charts directly.
- **PAT expiry kills all runners**: Enterprise headless user PAT is the single auth mechanism. If it expires, every runner stops. Monitor PAT expiry date.
- **DinD inotify limits**: Docker-in-Docker workloads crash without `fs.inotify.max_user_watches=524288`. Must be set in privileged container context.
- **Runner pod lifecycle**: Pods are ephemeral — created per job, destroyed after. Anything cached in the pod filesystem is lost between jobs.

## GHES

- **SSH port 22 exclusivity**: GHES expects exclusive SSH access on port 22. Other services on the same port cause intermittent git clone failures.
- **Admin port 8443**: Only accessible through NGINX, not through the load balancer. Direct LB access returns connection refused.
- **Replica lag**: Database replication between Primary and Replica can lag during heavy git push activity. Monitor lag before failover.

## Actions Sync

- **master → main branch mapping**: When syncing from GitHub.com, remember to map `master:main` in push command. Many GitHub.com Actions repos still use `master` as default.
