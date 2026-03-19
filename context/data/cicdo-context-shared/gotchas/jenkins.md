---
description: "Known failure patterns for Jenkins domain. Update this every time you discover a new gotcha."
domain: jenkins
---

# Jenkins Gotchas

- **Shared library changes affect ALL consumers**: Pipeline DSL changes in dsl-util-library or language-specific DSLs propagate to every pipeline using them. Always test in staging first.
- **Maven build env caching**: Container images are cached on agents. Stale caches cause build failures that work locally but fail in CI. Bust cache by updating image tag.
- **Agent AMI updates**: Require baking a new AMI + rolling replacement of agents. In-place updates don't work.
- **Jenkinsfile vs DSL**: Some repos use Jenkinsfile directly, others use the DSL libraries. Check which pattern before making changes.
- **Plugin version conflicts**: Cloudjenkins-build-plugin must be compatible with the Jenkins controller version. Test plugin upgrades in staging before production.
