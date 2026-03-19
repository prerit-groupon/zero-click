---
description: "Platform-level architecture overview. How the 7 CICDO domains connect into one developer platform. Start here for the big picture before diving into domain-specific architecture."
---

# CICDO Platform Architecture

## The Developer Platform

CICDO provides the foundational infrastructure that every Groupon engineer depends on daily. Seven interconnected domains form a complete developer platform:

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPER EXPERIENCE                         │
│                                                                   │
│   Write Code ──▶ Review ──▶ Build ──▶ Test ──▶ Deploy ──▶ Monitor │
│       │            │          │         │         │          │     │
│    GitHub      CodeRabbit  Jenkins   SonarQube Deploybot  Grafana │
│    (GHES)                  + GHA               + Release  Kibana  │
│                              │                   gen       │      │
│                          Artifactory                   PagerDuty  │
└─────────────────────────────────────────────────────────────────┘
```

## Domain Overview

### 1. Source Control — GitHub Enterprise Server (GHES)

Groupon's internal GitHub instance. All source code lives here. Deployed on GCP with high availability (Primary + Replica + Backup). GitHub Actions runners provide cloud CI alongside Jenkins.

**Key detail**: GHES is a customized deployment, not vanilla GitHub Enterprise. The runner controller uses a forked ARC Helm chart (v0.13.1).

### 2. CI/CD — Jenkins + GitHub Actions

Dual CI system. Jenkins handles the majority of builds via language-specific pipeline DSLs (Java, Ruby, iTier) with a shared utility library. GitHub Actions is growing and uses Kubernetes-based ephemeral runners on GKE.

**Key detail**: Pipeline DSLs are shared libraries. A change to `dsl-util-library` affects every pipeline that imports it.

### 3. Code Quality — SonarQube

Static analysis platform running on GCP. Integrated with Jenkins and GHA to enforce quality gates on PRs. Managed via Terraform.

### 4. Artifact Management — Artifactory

JFrog Artifactory hosting Docker images, NPM packages, and Maven artifacts. Running on GCP VMs (not Kubernetes). Currently migrating from AWS to GCP — dual-environment during transition.

**Key detail**: Migration uses shell scripts (not deprecated Python/JS). Always `DRY_RUN=true` first.

### 5. Release Engineering — Deploybot + Releasegen

Deploybot manages deployment authorization with approval workflows. Regional rollout: staging (us-central1 → eu-west-1) then production (us-central1 → us-west-1 → us-west-2 → eu-west-1). Releasegen auto-generates release notes from PRs and JIRA tickets.

**Key detail**: Deployers need LDAP group membership + ARQ request for namespace access.

### 6. Monitoring — Thanos + Telegraf + CLAM + Grafana

Full metrics pipeline: Telegraf agents collect → Kafka queues → CLAM aggregates → Thanos stores and serves → Grafana visualizes → PagerDuty alerts. All on GKE, managed via FluxCD GitOps and Terraform.

**Key detail**: Thanos receiver requires minimum 3 pods for replication quorum.

### 7. Logging — ELK Stack (ECK)

Centralized logging: Filebeat ships → Kafka buffers → Logstash parses → Elasticsearch indexes → Kibana searches. Elasticsearch clusters managed by ECK operator on GKE.

**Key detail**: Index lag is almost always a Logstash parsing issue, not Elasticsearch capacity.

---

## Infrastructure Foundations

| Layer | Technology |
|-------|-----------|
| Cloud | Google Cloud Platform (GCP) |
| Orchestration | GKE (Google Kubernetes Engine) |
| IaC | Terraform (multiple *-terrabase repos) |
| GitOps | FluxCD (flux-manifests) |
| Messaging | Kafka (MSK) — shared by monitoring and logging |
| Auth | Okta SSO, LDAP groups, GitHub PATs |
| Alerting | PagerDuty + Grafana alert rules |
| DNS | Internal: *.groupondev.com |

## Detailed Architecture per Domain

- [[architecture/monitoring]] — Metrics pipeline diagram
- [[architecture/logging]] — Log pipeline diagram
- [[architecture/github]] — GHES HA topology + GHA runner lifecycle
- [[architecture/release-engineering]] — Deployment authorization flow
