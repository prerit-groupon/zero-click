---
name: encore-style
description: >
  Groupon TypeScript/Encore coding conventions and testing practices. Use this skill when writing,
  reviewing, or generating code for Encore TS services in the groupon-monorepo. Covers service file
  structure, naming conventions, Drizzle ORM patterns, Encore API/Topic patterns, error handling,
  and testing philosophy. Trigger when: writing a new Encore service, reviewing Encore TS code,
  generating test files, or when code "feels off" but you can't articulate why.
  Do NOT use for Encore Go services (gorapi, vespa-reader) or Python AI services.
---

# Groupon Encore Style Guide

Category: Code-Style & Testing-Practice

This skill captures the TypeScript conventions that Groupon's Encore monorepo enforces — things Claude gets wrong without explicit guidance. These are not generic TypeScript best practices (Claude already knows those); they are Groupon-specific patterns derived from the monorepo's actual codebase.

---

## When NOT to Use This Skill

| Situation | Use Instead |
|-----------|-------------|
| Architecture decisions (where does this service go?) | `/platform-architect` |
| Database schema design | `/postgres` |
| Encore Go services (`gorapi`, `vespa-reader`) | Standard Go conventions — no skill needed |
| Python AI services (`aiaas-*`) | They don't use Encore primitives — no Encore patterns apply |

---

## Service File Structure

Every Encore TS service follows this structure:

```
apps/encore-ts/<service-name>/
├── encore.service.ts          # REQUIRED — registers the service
├── <service-name>.ts          # Main API handler file
├── <service-name>.test.ts     # Co-located tests
├── drizzle/
│   ├── schema.ts              # Drizzle schema definitions
│   └── migrations/            # Auto-generated migration SQL files
└── package.json               # Service-level deps (if needed)
```

**`encore.service.ts` is mandatory.** Without it, Encore does not register the service:

```typescript
import { Service } from "encore.dev/service";
export default new Service("<service-name>");
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Service directories | kebab-case | `deal-sync`, `merchant-quality` |
| API endpoints | PascalCase functions | `GetDeal`, `CreateMerchant` |
| Encore Topics | SCREAMING_SNAKE_CASE | `DEAL_SYNC_TOPIC` |
| Drizzle tables | snake_case | `deals`, `merchant_locations` |
| Drizzle columns | snake_case | `created_at`, `merchant_id` |
| TypeScript interfaces | PascalCase | `DealSyncEvent`, `MerchantResponse` |
| Environment secrets | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `SF_API_KEY` |

---

## Encore API Patterns

### REST Endpoint

```typescript
import { api } from "encore.dev/api";

// GET with path parameter
export const getDeal = api(
  { expose: true, method: "GET", path: "/deals/:id" },
  async ({ id }: { id: string }): Promise<DealResponse> => {
    // implementation
  }
);

// POST with body
export const createDeal = api(
  { expose: true, method: "POST", path: "/deals", auth: true },
  async (req: CreateDealRequest): Promise<DealResponse> => {
    // implementation
  }
);
```

### Internal RPC (service-to-service)

```typescript
// Calling another service — Encore handles transport
import { deals } from "~encore/clients";

const deal = await deals.getDeal({ id: dealId });
```

**Never use `fetch()` or HTTP calls between Encore services.** Use the generated `~encore/clients` instead — Encore type-checks the call and manages service discovery.

### Pub/Sub Publisher

```typescript
import { Topic } from "encore.dev/pubsub";

export const dealSyncTopic = new Topic<DealSyncEvent>("DEAL_SYNC_TOPIC", {
  deliveryGuarantee: "at-least-once",
});

// Publish
await dealSyncTopic.publish({ dealId, action: "created" });
```

### Pub/Sub Subscriber

```typescript
import { Subscription } from "encore.dev/pubsub";
import { dealSyncTopic } from "../deal-sync/topics";

export const _ = new Subscription(dealSyncTopic, "process-deal-sync", {
  handler: async (event: DealSyncEvent) => {
    // process event
  },
});
```

---

## Drizzle ORM Patterns

### Schema Definition

```typescript
// drizzle/schema.ts
import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  merchantId: uuid("merchant_id").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  merchantIdx: index("deals_merchant_id_idx").on(table.merchantId),
  activeIdx: index("deals_active_idx").on(table.active),
}));
```

### Database Access

```typescript
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./drizzle/schema";

const db = new SQLDatabase("<service-name>", { migrations: "./drizzle/migrations" });
const orm = drizzle(db.connectionString, { schema });

// Query
const deal = await orm.query.deals.findFirst({
  where: eq(schema.deals.id, id),
});
```

**Always use `orm.query.*` for reads and `orm.insert/update/delete` for writes.** Never write raw SQL strings.

---

## Error Handling

Encore uses typed errors. Never throw raw `Error` objects from API handlers:

```typescript
import { APIError } from "encore.dev/api";

// Correct
if (!deal) {
  throw APIError.notFound(`Deal ${id} not found`);
}

// Other status codes
throw APIError.invalidArgument("merchantId is required");
throw APIError.permissionDenied("not authorized to access this deal");
throw APIError.internal("unexpected error processing deal");
```

---

## Testing Philosophy

Groupon's Encore services use **co-located tests** (`*.test.ts` next to the source file) with the following approach:

- **Integration tests over unit tests** — Test the full API handler, not internal functions
- **Real database, not mocks** — Encore provides test databases. Never mock the database.
- **Test the contract** — Test what the endpoint returns, not how it computes it internally

```typescript
// deal-sync.test.ts
import { describe, expect, test } from "vitest";
import { getDeal, createDeal } from "./deal-sync";

describe("deal-sync", () => {
  test("getDeal returns 404 for unknown deal", async () => {
    await expect(getDeal({ id: "non-existent-id" }))
      .rejects.toMatchObject({ code: "not_found" });
  });

  test("createDeal returns the created deal", async () => {
    const result = await createDeal({ title: "Test Deal", merchantId: "m-123" });
    expect(result.id).toBeDefined();
    expect(result.title).toBe("Test Deal");
  });
});
```

Run tests:
```bash
encore test ./apps/encore-ts/<service-name>/...
```

---

## Gotchas

**Using `fetch()` between Encore services** — Encore services must call each other via the generated `~encore/clients`, not via HTTP. Using `fetch()` bypasses type-checking, service discovery, and distributed tracing. This is the single most common mistake when an engineer unfamiliar with Encore writes service-to-service calls.

**Forgetting `encore.service.ts`** — A service directory without `encore.service.ts` is not an Encore service. Encore silently ignores the directory. The service won't appear in the dashboard, won't get a Cloud Run deployment, and won't be addressable by other services.

**Mocking the database in tests** — Encore provides ephemeral test databases. Mocking the database tests the mock, not the code. If a test mocks `orm.query.deals.findFirst`, it provides no value. Use the real DB.

**Snake_case vs camelCase for Drizzle columns** — Drizzle column definitions use snake_case strings (`merchant_id`), but the TypeScript object properties are camelCase (`merchantId`). Claude frequently confuses these when generating schema code. Always use snake_case in `pgTable()` column names and camelCase in queries.

**Not indexing foreign keys** — Every `uuid` column that is a foreign key (e.g., `merchantId`) should have an index. Without it, any query filtering by merchant will do a full table scan. Always add indexes in the `pgTable()` third argument alongside the schema definition.

**Topic naming must be globally unique** — Encore Pub/Sub topic names must be unique across the entire monorepo. Using generic names like `SYNC_TOPIC` will collide. Always prefix with the service domain: `DEAL_SYNC_TOPIC`, `MERCHANT_UPDATE_TOPIC`.

**`auth: true` on internal APIs** — Internal APIs (service-to-service via `~encore/clients`) don't need `auth: true`. Only externally-exposed endpoints that require user authentication should set this. Setting it on internal APIs breaks service-to-service calls.
