# Amendments Changelog

This file documents all amendments to the Groupon Cloud Platform shared context, tracking improvements and lessons learned.

---

## 2026-03-19: Initial Context Creation

**Source:** Created shared context from cloud-ai-root-main knowledge base

**Changes:**
- Created 7 domain MOCs (domains/)
  - cloud-foundation.md (gcp-landingzone)
  - infrastructure-networking.md (terraform-gcp-core)
  - kubernetes-platform.md (conveyor_k8s)
  - service-mesh.md (7 repos: hybrid-boundary, hybrid-boundary-gcp, hybrid-boundary-controller, service-fetcher, par-automation, mtls-sidecar, hybrid-boundary-ui)
  - routing-proxy.md (6 repos: api-proxy, proxy-config, routing-config-*, web-config, routing-deployment)
  - application-deployment.md (cmf-helm-charts)

- Created 5 gotchas documents (gotchas/)
  - cloud-foundation.md (terraform state, project factory, IAM, shared VPC, bootstrap)
  - kubernetes.md (cluster promotion, ansible, subnets, karpenter, AMI, upgrades, service accounts, group_vars)
  - service-mesh.md (HBU controller scope, CRD coupling, HTTP/2 opt-in, ALPN, PAT expiry, PAR classification, xDS, service-fetcher)
  - routing.md (image tags, static ILB, no mTLS, two api-proxy variants, staging testing, .flexi validation, localhost:9000, config chain)
  - general.md (terraform-managed, force-unlock, environment progression, regions, PR pipeline, cross-repo changes, deploy tags, AI_OVERVIEW.md)

- Created .meta/ directory with skill graph enhancement
  - .meta/config.json (team, org, context metadata, self-improvement cycle)
  - .meta/scoring/criteria.md (12-question scoring framework for interactions)
  - .meta/amendments/changelog.md (this file)
  - .meta/observations/log.jsonl (interaction logging)

**Rationale:**
- Skill graph layer provides structured navigation and self-improvement capabilities
- Domain MOCs enable AI agents to quickly locate and understand infrastructure layers
- Gotchas documents capture hard-learned lessons and common failure modes
- Scoring criteria allow measurement of context quality and agent performance
- Self-improvement cycle ensures context evolves based on real interactions

**Learnings Incorporated:**
- Anthropic research (Thariq): skill graphs improve agent navigation and reduce hallucinations
- Research (Heinrich): domain MOCs + gotchas + scoring create effective learning systems
- Research (Ole Lehmann): autoresearch scoring helps identify gaps in documentation
- Collaboration (Vasilije): self-improving skills require structured amendment workflows

**Next Steps:**
- Deploy context to Groupon Cloud Platform team
- Monitor agent interactions for 2 weeks
- Conduct weekly scoring review to identify documentation gaps
- Amend context based on failing question categories
- Track improvements in subsequent weeks

---

## Future Amendment Entries

Use the following template for each amendment:

```
## YYYY-MM-DD: Brief Description

**Source:** What triggered this amendment? (agent interaction, manual request, pattern observation)

**Problem Identified:** What gap or inaccuracy was found?

**Changes:**
- File updated: description
- File created: description
- File removed: description

**Rationale:** Why is this improvement important?

**Impact:** Domains/questions affected by this change

**Verification:** How was the amendment tested?
```

---

## Amendment Statistics

**Total Amendments:** 1 (initial creation)
**Last Updated:** 2026-03-19
**Domains Affected:** All 7
**Gotchas Documents:** 5
**Average Score After Amendment:** TBD (after first interactions)
