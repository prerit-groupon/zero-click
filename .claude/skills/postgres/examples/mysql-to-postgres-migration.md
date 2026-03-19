# Example: MySQL → PostgreSQL Migration — deals table

> Scenario: Migrating `deals` table from Continuum MySQL to Encore PostgreSQL.
> Part of the continuum-commerce → encore-deals migration.

---

## Step 1 — Audit the MySQL Schema

```sql
-- Run on Continuum MySQL read replica
DESCRIBE deals;
SHOW CREATE TABLE deals;
```

**MySQL schema (simplified):**
```sql
CREATE TABLE deals (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      ENUM('active', 'paused', 'expired') DEFAULT 'active',
  price       DECIMAL(10,2),
  merchant_id INT UNSIGNED NOT NULL,
  start_date  DATETIME,
  end_date    DATETIME,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_merchant (merchant_id),
  KEY idx_status (status)
) ENGINE=InnoDB;
```

**MySQL-to-PostgreSQL type mapping:**

| MySQL | PostgreSQL | Notes |
|-------|-----------|-------|
| `INT UNSIGNED AUTO_INCREMENT` | `uuid DEFAULT gen_random_uuid()` | Switch to UUID — no sequence dependency |
| `VARCHAR(255)` | `VARCHAR(255)` | Direct |
| `TEXT` | `TEXT` | Direct |
| `ENUM('a','b')` | `pgEnum` | Define as Drizzle enum type |
| `DECIMAL(10,2)` | `DECIMAL(10,2)` | Direct |
| `DATETIME` | `TIMESTAMPTZ` | Always use timezone-aware in PostgreSQL |
| `TIMESTAMP ON UPDATE` | Trigger or application-level | No `ON UPDATE` in PostgreSQL |

---

## Step 2 — Drizzle Schema

```typescript
// encore-deals/src/db/schema.ts
import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const dealStatusEnum = pgEnum('deal_status', ['active', 'paused', 'expired', 'draft']);

export const deals = pgTable('deals', {
  id:          uuid('id').primaryKey().defaultRandom(),
  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status:      dealStatusEnum('status').notNull().default('active'),
  price:       decimal('price', { precision: 10, scale: 2 }),
  merchantId:  varchar('merchant_id', { length: 36 }).notNull(), // UUID after merchant migration
  startDate:   timestamp('start_date', { withTimezone: true }),
  endDate:     timestamp('end_date', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  merchantIdx: index('deals_merchant_id_idx').on(t.merchantId),
  statusIdx:   index('deals_status_idx').on(t.status),
}));

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
```

---

## Step 3 — Migration Script

```typescript
// scripts/migrate-deals.ts
// Run once: npx tsx scripts/migrate-deals.ts --dry-run
// Then:     npx tsx scripts/migrate-deals.ts

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { deals } from '../encore-deals/src/db/schema';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 1000;

async function migrate() {
  const mysqlConn = await mysql.createConnection(process.env.MYSQL_URL!);
  const pgClient = postgres(process.env.DATABASE_URL!);
  const db = drizzle(pgClient);

  const [countResult] = await mysqlConn.execute('SELECT COUNT(*) as total FROM deals');
  const total = (countResult as any[])[0].total;
  console.log(`Migrating ${total} rows...`);

  let offset = 0;
  let migrated = 0;

  while (offset < total) {
    const [rows] = await mysqlConn.execute(
      'SELECT * FROM deals ORDER BY id LIMIT ? OFFSET ?',
      [BATCH_SIZE, offset]
    );

    const mapped = (rows as any[]).map(row => ({
      // Generate new UUID — store MySQL ID in a mapping table if needed
      title:      row.title,
      description: row.description,
      status:     row.status as 'active' | 'paused' | 'expired',
      price:      row.price?.toString(),
      merchantId: row.merchant_id?.toString(), // Will be UUID after merchant migration
      startDate:  row.start_date ? new Date(row.start_date) : null,
      endDate:    row.end_date ? new Date(row.end_date) : null,
      createdAt:  new Date(row.created_at),
      updatedAt:  new Date(row.updated_at),
    }));

    if (!DRY_RUN) {
      await db.insert(deals).values(mapped).onConflictDoNothing();
    }

    migrated += mapped.length;
    offset += BATCH_SIZE;
    console.log(`Progress: ${migrated}/${total}`);
  }

  console.log(DRY_RUN ? 'Dry run complete' : `Migration complete: ${migrated} rows`);
  await mysqlConn.end();
  await pgClient.end();
}

migrate().catch(console.error);
```

---

## Step 4 — Validation Queries

```sql
-- MySQL
SELECT COUNT(*) FROM deals;
SELECT status, COUNT(*) FROM deals GROUP BY status;

-- PostgreSQL (should match)
SELECT COUNT(*) FROM deals;
SELECT status, COUNT(*) FROM deals GROUP BY status;
```

If counts match: migration successful. If off by < 0.01%: investigate, likely in-flight writes.

---

## Step 5 — Post-Migration Checklist

- [ ] Row counts match (MySQL vs PostgreSQL)
- [ ] Status distribution matches
- [ ] Spot-check 10 random rows — field values match
- [ ] `VACUUM ANALYZE deals;` run on PostgreSQL after bulk insert
- [ ] Indexes verified: `\d deals` in psql shows both indexes
- [ ] Application smoke test: GET /api/v1/deals/:id returns expected data
