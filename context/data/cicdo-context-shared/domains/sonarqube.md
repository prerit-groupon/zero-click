---
description: "MOC for SonarQube domain. Covers SonarQube code quality platform on GCP. Start here when the task involves static analysis, code quality gates, or SonarQube infrastructure."
domain: sonarqube
repos: ["sonarqube-main-gcp-main", "sonarqube-main-main", "sonarqube-terraform-modules-main"]
---

# SonarQube — Map of Content

## What We Own

SonarQube code quality platform at Groupon, running on GCP. Provides static analysis, quality gates, and code smell detection across the organization.

## Architecture

- **SonarQube** application deployed on GCP
- **Terraform modules** manage infrastructure
- Integrated with Jenkins and GitHub for PR analysis

## Runbooks

No dedicated SonarQube runbooks in the current set. Consider creating:
- SonarQube instance restart/recovery
- Quality gate configuration
- Plugin management

## Gotchas

- SonarQube GCP deployment managed via Terraform — manual changes will be overwritten
- Quality gate changes affect all projects — coordinate with stakeholders

## Codebases

| Repo | Purpose |
|------|---------|
| `sonarqube-main-gcp-main` | SonarQube GCP deployment |
| `sonarqube-main-main` | Core SonarQube configuration |
| `sonarqube-terraform-modules-main` | Terraform modules for SonarQube infra |

All source in: `codebases/sonarqube/`

## Key Links

- GitHub Org: https://github.groupondev.com/orgs/sonarqube/repositories
