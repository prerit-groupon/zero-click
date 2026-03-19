# Integration Contract Patterns — Reference

> Source: build-with-agent-team SKILL.md
> File: `plans/<feature>-contracts.md`

---

## Why Contracts Must Come First

Contracts written after agents start produce integration failures. Contracts written before agents start mean integration works on the first attempt. The difference is always lost time from "catching up" on mismatched shapes.

---

## Encore REST API Contract

```
Endpoint:   POST /api/v1/<resource>
Request:    { "fieldA": string, "fieldB": number, "fieldC": string (UUID) }
Response:   { "id": string (UUID), "status": "draft" | "active", "createdAt": string (ISO8601) }
Status:
  201 Created      — resource created
  400 Bad Request  — validation failed (body: { "error": "VALIDATION_ERROR", "fields": [...] })
  401 Unauthorized — missing/invalid auth token
  403 Forbidden    — authenticated but lacks permission
  409 Conflict     — duplicate (body: { "error": "ALREADY_EXISTS" })
Auth:       Encore Gateway JWT
            x-groupon-user-id: <userId>   (populated by Gateway from JWT)
            x-groupon-account-id: <id>    (populated by Gateway for B2B calls)
Idempotency: POST is idempotent if idempotency-key header is provided
```

**Rules for Encore REST contracts:**
- All IDs are UUIDs — no integer IDs
- All timestamps are ISO 8601 with timezone (`2026-03-19T14:00:00Z`)
- Error body always includes `"error"` (machine-readable code) + optional `"message"` (human-readable)
- Auth is handled by Encore Gateway — services trust `x-groupon-user-id`; never re-validate JWT in service code

---

## Encore RPC Contract (Internal Service-to-Service)

```typescript
// Encore RPC — TypeScript type definitions are the contract
// File: packages/<service-name>/src/api.ts

export interface CreateDealRequest {
  merchantId: string;   // UUID
  title: string;
  price: number;        // in minor currency units (cents)
}

export interface CreateDealResponse {
  id: string;           // UUID
  status: 'draft' | 'active';
  createdAt: string;    // ISO 8601
}

// Error types (throw with encore.Error)
// NotFound, PermissionDenied, InvalidArgument, AlreadyExists, Internal
```

---

## Encore Topic Event Contract

```
Topic:      <domain>.<event-name>  (e.g., deals.created, orders.paid)
Producer:   <service-name>
Consumers:  [<service-a>, <service-b>]

Schema:
{
  "eventId": string (UUID),       // for deduplication
  "<entityId>": string (UUID),    // primary entity reference
  "timestamp": string (ISO 8601), // when event occurred
  ...domain-specific fields...
}

Ordering:       By <partition-key> (e.g., merchantId)
Retention:      7 days (default) | 30 days (financial events)
Delivery:       At-least-once — consumers must be idempotent
```

**Rules for Encore Topic contracts:**
- Every event includes `eventId` (UUID) for consumer-side deduplication
- All consumers must handle duplicate delivery
- Topic names are lowercase dot-separated: `domain.entity.verb` or `domain.verb`
- Partition key chosen to keep related events ordered (usually the primary entity ID)

---

## GraphQL Contract (MBNXT → Encore)

```graphql
# Schema additions (file: apps/web/src/graphql/schema.graphql)

type Deal {
  id: ID!
  title: String!
  price: Float!
  status: DealStatus!
  merchant: Merchant!
  createdAt: DateTime!
}

enum DealStatus {
  DRAFT
  ACTIVE
  EXPIRED
}

extend type Query {
  deal(id: ID!): Deal
  dealsByMerchant(merchantId: ID!, limit: Int = 20, offset: Int = 0): [Deal!]!
}

extend type Mutation {
  createDeal(input: CreateDealInput!): Deal!
}

input CreateDealInput {
  merchantId: ID!
  title: String!
  price: Float!
}
```

**Rules for GraphQL contracts:**
- All IDs are `ID!` (not `String`) — GraphQL converts to/from string internally
- All lists return `[Type!]!` (non-null list of non-null items) unless absence is meaningful
- Mutations return the full updated object (not just ID)
- `DateTime` is ISO 8601 string scalar

---

## Continuum Wrapper Contract

```typescript
// Wrapper interface — what Encore callers see
// File: packages/<domain>-continuum-wrapper/src/index.ts

export interface DealStatusWrapper {
  getDealStatus(dealId: string): Promise<DealStatus>;
  updateDealStatus(dealId: string, status: 'active' | 'paused' | 'expired'): Promise<DealStatus>;
}

export interface DealStatus {
  dealId: string;
  status: 'active' | 'paused' | 'expired' | 'draft';
  updatedAt: string;  // ISO 8601
  updatedBy: string | null;
}

// Internal Continuum response (hidden from callers)
interface ContinuumDealStatusResponse { /* Continuum's format */ }

// Translation function (wrapper responsibility)
function mapContinuumResponse(raw: ContinuumDealStatusResponse): DealStatus { ... }
```

---

## Ownership Assignment Table

Add to every `plans/<feature>-contracts.md`:

```
Agent 1 — Encore Backend
  Owns:      packages/<service-name>/
  Cannot touch: apps/web/, k8s/, packages/<other-service>/

Agent 2 — MBNXT Frontend
  Owns:      apps/web/src/features/<feature>/
  Cannot touch: packages/, k8s/

Agent 3 — Infrastructure
  Owns:      k8s/, .encore/, terraform/
  Cannot touch: packages/, apps/web/

Shared files (owned by Agent 1; others request via lead):
  - package.json (root)
  - tsconfig.json (root)
  - apps/web/src/graphql/schema.graphql
```

---

## Contract Checklist

Before spawning agents, verify every contract has:

- [ ] Exact field names and TypeScript types
- [ ] Status codes for success AND each failure case
- [ ] Auth mechanism named explicitly
- [ ] Event topic name and partition key (for async contracts)
- [ ] Idempotency guarantee (for mutations and event consumers)
- [ ] Error body shape (not just status code)
- [ ] File ownership table with explicit "cannot touch" boundaries
