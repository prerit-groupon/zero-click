# Service Design: [service-name]

> **Status:** Draft | In Review | Approved
> **Author:** [name]
> **Date:** YYYY-MM-DD
> **Platform:** Encore | Continuum (maintenance only)
> **Owner team:** [team]

---

## Purpose

<!-- What business capability does this service own?
     What is its bounded context — what does it know, what does it not know? -->

---

## Platform Decision

| Question | Answer |
|---------|--------|
| New business logic? | Yes → Encore |
| Continuum maintenance only? | Yes → Continuum (do not expand) |
| Cloud Run? | Default for Encore services |
| Deviates from Cloud Run? | [justify if GKE] |

---

## Architecture Query

```bash
# Run before designing — ground in actual current state
node context/scripts/query-manifest.mjs system [related-service]
node context/scripts/query-manifest.mjs overview
```

<!-- Paste relevant output -->

---

## Service Boundaries

**Owns:**
- Data entity 1 (stored in: Cloud SQL / PostgreSQL)
- Data entity 2

**Does NOT own:**
- X (owned by [other-service])
- Y (owned by [other-service])

**Dependencies:**
| Service | Type | What it provides |
|---------|------|-----------------|
| encore-gateway | upstream | Auth, routing |
| encore-[name] | upstream | [capability] |
| [topic-name] | Kafka topic | [event description] |

---

## API Contract

### REST Endpoints

```typescript
// POST /api/v1/[resource]
// Auth: JWT (end-user) | service-to-service
// Request
interface CreateRequest {
  // ...
}
// Response
interface CreateResponse {
  id: string;
  // ...
}
```

### Events Produced

```typescript
// Topic: [topic.name.v1]
interface [EventName]Event {
  eventType: '[EventName]';
  id: string;
  timestamp: string; // ISO 8601
  // ...
}
```

### Events Consumed

| Topic | Producer | Handler |
|-------|---------|---------|
| | | |

---

## Database Schema (Encore / PostgreSQL)

```typescript
// Drizzle ORM schema — one dedicated Cloud SQL instance per service
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const [tableName] = pgTable('[table_name]', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## Continuum Integration (if applicable)

<!-- If this service wraps a Continuum API, document the wrapper pattern -->

| Continuum API | Encore Wrapper | Migration Phase |
|--------------|---------------|-----------------|
| `/v1/continuum/...` | `encore-[name]/src/continuum-client.ts` | Phase N |

---

## Encore Shared Services Used

| Service | Purpose |
|---------|---------|
| encore-authn | Authentication |
| encore-authz | Authorisation |
| encore-gateway | API routing |
| encore-topics | Kafka topic management |
| encore-audit-log | Audit trail |

---

## Observability

**Metrics to emit (Telegraf format):**
```
[service_name],env=prod operation="create",status="success" count=1
```

**Log events:**
- `[service_name].created` — on successful creation
- `[service_name].error` — on failure (include error code, do not log PII)

**Alerting thresholds:**
- Error rate > 1% over 5 min → page on-call

---

## Security

- Auth model: JWT (end-user) | service-to-service (Workload Identity)
- PII fields: [list or "none"]
- Secret storage: GCP Secret Manager via Cloud Run env injection

---

## Deployment

- Runtime: Cloud Run (us-central1)
- Min instances: 1 (prod) / 0 (staging)
- Memory: 512Mi | 1Gi | 2Gi
- CPU: 1 | 2
- Concurrency: 80

---

## Testing Strategy

- Unit tests: business logic, domain rules
- Integration tests: Jira/database, Kafka publish/consume
- Contract tests: API consumers validated against OpenAPI spec

---

## Open Questions

| Question | Owner | Due |
|---------|-------|-----|
| | | |
