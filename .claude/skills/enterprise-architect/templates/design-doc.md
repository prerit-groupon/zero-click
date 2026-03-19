# Design Doc: [Feature / Initiative Name]

> **Status:** Draft | In Review | Approved | Superseded
> **Author:** [name]
> **Date:** YYYY-MM-DD
> **Architect:** Enterprise Architect (cross-platform) | Platform Architect | Data Architect
> **Review required from:** [list architect skills / team leads]

---

## Problem Statement

<!-- What is broken, missing, or inefficient? What is the user / system impact? -->

---

## Goals

- [ ] Goal 1 — measurable outcome
- [ ] Goal 2
- [ ] Goal 3

## Non-Goals

- Not solving X (leave to a future initiative)
- Not changing Y (out of scope)

---

## Context: Current Architecture

<!-- Run: node context/scripts/query-manifest.mjs overview -->
<!-- Paste relevant output here or link to the specific domain MOC -->

**Affected platforms:** Continuum | Encore | MBNXT | Data Platform

---

## Proposed Solution

### Option A — [Name] (Recommended)

**Summary:** One-paragraph description.

**Architecture diagram (ASCII or Mermaid):**

```
[System A] → [System B] → [System C]
```

**Key design decisions:**
1. Decision 1 and rationale
2. Decision 2 and rationale

**Trade-offs:**
- Pro: ...
- Con: ...

### Option B — [Name] (Alternative)

**Summary:**

**Why not chosen:**

---

## Data Ownership

| Data Entity | Owner Service | Storage | Access Pattern |
|------------|--------------|---------|----------------|
| | | | |

---

## API Contracts

<!-- List all new or changed API endpoints / event schemas -->

| Contract | Type | Owner | Consumers |
|---------|------|-------|-----------|
| `POST /api/v1/...` | REST | encore-service-name | mbnxt-frontend |
| `topic.event.name` | Kafka | encore-service-name | data-pipeline |

---

## Migration Plan

<!-- If this changes existing Continuum behaviour, document the migration path -->

| Phase | Action | Owner | Risk |
|-------|--------|-------|------|
| 1 | | | |
| 2 | | | |

---

## Security Considerations

- Auth model: [JWT / service-to-service / public]
- PII data involved: [yes — describe handling / no]
- Secrets management: [Secret Manager / env vars via Cloud Run]

---

## Observability

- Key metrics to add
- Log events to emit
- Alerting thresholds

---

## Testing Strategy

- Unit tests: ...
- Integration tests: ...
- Load / performance tests: ...

---

## Rollout Plan

- [ ] Phase 1: ...
- [ ] Phase 2: ...
- [ ] Rollback trigger: ...

---

## Open Questions

| Question | Owner | Due |
|---------|-------|-----|
| | | |

---

## Decision Record

<!-- Summary of decisions made during review. Link to ADR if one was created. -->
