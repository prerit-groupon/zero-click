---
description: "MOC for Jenkins domain. Covers Jenkins CI pipelines, DSL libraries, build plugins, agent AMIs, Terraform modules. Start here when the task involves Jenkins pipeline authoring, plugin development, or Jenkins infrastructure."
domain: jenkins
repos: ["jenkins-main-production-master", "jenkins-main-staging-master", "java-pipeline-dsl-master", "ruby-pipeline-dsl-master", "itier-pipeline-dsl-main", "dsl-util-library-master", "cloudjenkins-build-plugin-master", "agent-ami-master", "maven-build-env-master", "canary-dockerizedmaven-release-main", "terraform-modules-master"]
---

# Jenkins — Map of Content

## What We Own

Jenkins CI infrastructure at Groupon: pipeline DSLs, build plugins, agent images, and the Jenkins controller environments (production and staging).

## Architecture

- **Jenkins Controllers**: Production and Staging environments (separate configurations)
- **Pipeline DSLs**: Language-specific pipeline definitions (Java, Ruby, iTier) plus shared utility DSL
- **Build Plugin**: Custom cloudjenkins-build-plugin for Groupon-specific build steps
- **Agent AMIs**: Custom machine images for Jenkins build agents
- **Maven Build Env**: Containerized Maven build environments
- **Terraform Modules**: Infrastructure as code for Jenkins on cloud

## Runbooks

No dedicated Jenkins runbooks in the current set. Consider creating:
- Jenkins controller restart/recovery
- Pipeline DSL debugging
- Agent scaling and capacity

## Gotchas

See [[gotchas/jenkins]] for known failure patterns. Key ones:
- Pipeline DSL changes in shared libraries affect ALL consumers — test in staging first
- Maven build env container images are cached — stale caches cause mysterious build failures
- Agent AMI updates require baking + rolling replacement, not in-place updates

## Codebases

| Repo | Purpose |
|------|---------|
| `jenkins-main-production-master` | Production Jenkins controller configuration |
| `jenkins-main-staging-master` | Staging Jenkins controller configuration |
| `java-pipeline-dsl-master` | Java pipeline DSL library |
| `ruby-pipeline-dsl-master` | Ruby pipeline DSL library |
| `itier-pipeline-dsl-main` | iTier service pipeline DSL |
| `dsl-util-library-master` | Shared DSL utility functions |
| `cloudjenkins-build-plugin-master` | Custom Jenkins build plugin |
| `agent-ami-master` | Jenkins agent AMI definitions |
| `maven-build-env-master` | Maven build environment containers |
| `canary-dockerizedmaven-release-main` | Canary Maven release pipeline |
| `terraform-modules-master` | Terraform modules for Jenkins infra |

All source in: `codebases/jenkins/`

## Key Links

- GitHub Org: https://github.groupondev.com/orgs/cloud-jenkins/repositories
- Grafana: https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com/dashboards/f/ee3wlpqtub85cc/cicd-and-observability
