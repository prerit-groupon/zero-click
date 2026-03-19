# Integration Contracts: [Feature Name]

> **Date:** YYYY-MM-DD
> **Lead agent:** [session ID / description]
> **Status:** DRAFT — agents must not start until this is FINALISED

---

## Overview

This document defines all integration contracts between agents for this multi-agent build.
**Agents treat this document as the source of truth.** Any ambiguity here becomes a bug in integration.

---

## Agent Boundaries

| Agent | Platform | Owns | Must NOT touch |
|-------|---------|------|---------------|
| Agent A (Backend) | Encore | `encore-[service-name]/` | Frontend files |
| Agent B (Frontend) | MBNXT | `apps/consumer/` | Encore service files |
| Agent C (Data) | Data platform | `pipelines/` | Application code |

---

## REST API Contracts

### [POST /api/v1/resource] — Agent A produces, Agent B consumes

**Request:**
```typescript
interface CreateResourceRequest {
  field1: string;         // required, max 255 chars
  field2: number;         // required, positive integer
  field3?: string;        // optional
}
```

**Response (201 Created):**
```typescript
interface CreateResourceResponse {
  id: string;             // UUID v4
  field1: string;
  field2: number;
  createdAt: string;      // ISO 8601
}
```

**Error responses:**
| Status | Body | When |
|--------|------|------|
| 400 | `{ error: "VALIDATION_ERROR", details: [...] }` | Invalid input |
| 401 | `{ error: "UNAUTHORIZED" }` | Missing/invalid JWT |
| 409 | `{ error: "CONFLICT", id: "..." }` | Already exists |
| 500 | `{ error: "INTERNAL_ERROR" }` | Unexpected failure |

**Auth:** JWT — Bearer token in `Authorization` header.

---

### [GET /api/v1/resource/:id] — Agent A produces, Agent B consumes

**Response (200 OK):**
```typescript
interface GetResourceResponse {
  id: string;
  field1: string;
  field2: number;
  createdAt: string;
  updatedAt: string;
}
```

**Not found (404):** `{ error: "NOT_FOUND" }`

---

## Kafka Event Contracts

### [topic.resource.created.v1] — Agent A produces, Agent C consumes

**Topic name:** `resource.created.v1` (registered in encore-topics)

**Schema:**
```typescript
interface ResourceCreatedEvent {
  eventType: 'ResourceCreated';
  schemaVersion: '1';
  id: string;             // UUID v4 — the resource ID
  field1: string;
  field2: number;
  createdAt: string;      // ISO 8601
  sourceService: 'encore-[service-name]';
}
```

**Guarantees:**
- At-least-once delivery
- Partition key: `id`
- Retention: 7 days

**Agent C must handle:**
- Duplicate events (idempotent processing on `id`)
- Out-of-order events (timestamp-based ordering)

---

## Shared Types

Define any types shared across the boundary here. Both agents copy this verbatim — do NOT import across service boundaries.

```typescript
// Shared type — both agents define independently (no cross-import)
type ResourceStatus = 'active' | 'inactive' | 'deleted';
```

---

## Environment Variables

| Variable | Set by | Used by | Value (non-secret) |
|---------|--------|---------|-------------------|
| `ENCORE_SERVICE_URL` | Platform | Agent B | `https://[service].run.app` |
| `KAFKA_TOPIC_PREFIX` | Platform | Agent A, C | `groupon.prod.` |

---

## Contract Validation Checklist

Before marking this FINALISED:

- [ ] All request/response shapes have TypeScript types (not prose descriptions)
- [ ] All error status codes are enumerated with examples
- [ ] All Kafka schemas have explicit `schemaVersion` fields
- [ ] No cross-service imports (each agent defines shared types independently)
- [ ] Auth requirements stated for every endpoint
- [ ] PII fields identified and handling documented
- [ ] Event idempotency requirements stated

---

## FINALISED

> Once this document is marked FINALISED, agents may begin. Any contract change requires
> stopping all agents, updating this document, and restarting.

**Finalised by:** [lead agent / human reviewer]
**Finalised at:** YYYY-MM-DD HH:MM UTC
