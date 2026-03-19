---
description: "All CICDO GitHub organizations and repositories. Use when you need to find a repo or understand org structure."
---

# CICDO Git Organizations & Repositories

## Organizations

| Domain | GitHub Org | URL |
|--------|-----------|-----|
| Logging | logging | https://github.groupondev.com/orgs/logging/repositories |
| Logging (legacy) | splunk | https://github.groupondev.com/orgs/splunk/repositories |
| Monitoring | metrics | https://github.groupondev.com/orgs/metrics/repositories |
| Release Engineering | release-engineering | https://github.groupondev.com/orgs/release-engineering/repositories |
| Artifactory | artifactory | https://github.groupondev.com/orgs/artifactory/repositories |
| SonarQube | sonarqube | https://github.groupondev.com/orgs/sonarqube/repositories |
| Jenkins | cloud-jenkins | https://github.groupondev.com/orgs/cloud-jenkins/repositories |
| GitHub | rapt | https://github.groupondev.com/orgs/rapt/repositories |

## Repository Index

### Monitoring (10 repos)
- `clam-develop` — CLAM core metric aggregation
- `CLAM_KafkaStream-develop` — CLAM Kafka stream processing
- `telegraf-deployment-develop` — Telegraf deployment configs
- `telegraf-dev-env-develop` — Telegraf dev environment
- `metrics-v2-main` — Metrics v2 pipeline
- `metrics-gcp-terrabase-main` — GCP Terraform for metrics
- `gcp-prometheus-main` — Prometheus configs for GCP
- `grafana-terraform-main` — Grafana IaC
- `flux-manifests-main` — FluxCD GitOps manifests
- `scrape-configs-main` — Prometheus scrape configs

### Logging (10 repos)
- `eck-infra-main` — ECK infrastructure
- `eck-operator-main` — ECK operator deployment
- `eck-pipeline-automation-main` — Pipeline automation for ECK
- `es-index-creation-main` — ES index lifecycle management
- `es-template-checker-main` — ES index template validator
- `grpn-filebeat-main` — Filebeat config and deployment
- `logging-elasticstack-eck-roles` — IAM roles for ECK
- `logging-gcp-terrabase-main` — Terraform for logging GCP infra
- `logging-searches-master` — Saved Kibana searches/dashboards
- `watch-execution-main` — ES watcher execution

### Jenkins (11 repos)
- `jenkins-main-production-master` — Production Jenkins controller
- `jenkins-main-staging-master` — Staging Jenkins controller
- `java-pipeline-dsl-master` — Java pipeline DSL
- `ruby-pipeline-dsl-master` — Ruby pipeline DSL
- `itier-pipeline-dsl-main` — iTier pipeline DSL
- `dsl-util-library-master` — Shared DSL utilities
- `cloudjenkins-build-plugin-master` — Custom build plugin
- `agent-ami-master` — Jenkins agent AMI definitions
- `maven-build-env-master` — Maven build env containers
- `canary-dockerizedmaven-release-main` — Canary Maven release pipeline
- `terraform-modules-master` — Terraform modules for Jenkins

### GitHub (2 repos + 1 doc)
- `github_enterprise_config-master` — GHES configuration
- `github-cloud-arc-main` — GHA runner controller (customized ARC Helm charts)
- CodeRabbit SOP (documentation only)

### Release Engineering (3 repos)
- `deploybot-master` — Deployment authorization service
- `mergebot-master` — Merge automation
- `releasegen-main` — Release note generation (Java/Maven)

### Artifactory (1 repo)
- `artifactory-gcp-vm-main` — Artifactory GCP VM setup

### SonarQube (3 repos)
- `sonarqube-main-gcp-main` — SonarQube GCP deployment
- `sonarqube-main-main` — Core SonarQube config
- `sonarqube-terraform-modules-main` — Terraform modules
