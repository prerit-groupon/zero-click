# CI/CD & GitHub

## GitHub Actions

- **31 workflows** under `.github/workflows/`
- Serve different deployment targets: Encore Cloud (TS/Go), DO App Platform, GCP Cloud Run, Docker builds (Python)
- **Branch-as-environment model**: pushes to certain branches trigger deployments to corresponding environments
- No unified pipeline abstraction — each deployment path has its own build, test, and deploy logic
- Preview environments on Cloud Run for Encore services

## Encore Native CI/CD

For the 78 TS + 2 Go services, Encore Cloud provides:
- Automatic build and deploy on push
- Preview environments per branch
- Built-in test execution
- Deployment rollback capability
- Deployment details: `app.encore.cloud/groupon-encore-83x2/deploys`

## Workflow Categories

Based on the 31 workflows:
- **Encore service deployment**: triggered by Encore Cloud, may have supplementary GitHub Actions
- **Python monolith build**: Docker build → push to Artifact Registry → deploy to App Platform/Cloud Run
- **Infrastructure provisioning**: Crossplane apply, Terraform (if any)
- **Code quality**: linting, testing, type checking
- **Integration**: Jira linkage, notifications, PR automation

## Known Gaps

### Security
- **Branch protection unclear**: need to verify if required reviewers, required status checks, and force-push protection are enforced on all deployment-triggering branches
- **Third-party actions not pinned**: workflows reference actions by tag (e.g., `@v4`) not by commit SHA — supply chain attack vector
- **Secrets audit needed**: no documented inventory of which workflows access which secrets, no rotation schedule
- **No container image scanning**: Python Docker images not scanned for CVEs before push
- **No SBOM generation**: no dependency tracking across three language runtimes

### Pipeline Reliability
- **No unified pipeline abstraction**: fixes or improvements must be replicated across dozens of workflow files
- **No test coverage gate**: no minimum coverage threshold enforced as merge blocker per runtime
- **No incremental build detection**: every PR may trigger full monorepo CI run, wasting Actions minutes
- **No build caching optimization**: unclear if npm/pip/Go module caches are properly configured

### Governance
- **No deployment audit trail**: no centralized log answering "what was deployed when, by whom, to which environment"
- **No workflow failure alerting**: if a critical workflow fails, notification relies on GitHub's per-user system
- **Orphaned workflows**: some of the 31 workflows may serve deprecated services or abandoned experiments
- **No naming convention enforcement**: no standard for branch names, commit messages, or environment names

## SOX Compliance Requirements (from SOX+ORR 2.0 Policy)

The policy mandates:
- Every PR linked to a Jira issue (enforced via GitHub Actions)
- At least one human reviewer (non-author) on PRs to protected branches
- AI code review (CodeRabbit or equivalent) as mandatory step
- CODEOWNERS + required reviewers for high-risk paths (security, auth, payments, financial reporting)
- Full traceability: who changed what, why (Jira), who reviewed (human + AI), when deployed, risk classification
- No direct "out of band" production deployments except break-glass flows
