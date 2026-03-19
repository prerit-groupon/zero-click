/**
 * Drizzle ORM schema template for Groupon Encore services.
 *
 * Usage:
 *   1. Copy to your service: encore-[service-name]/src/db/schema.ts
 *   2. Replace [entity] with your domain entity name (camelCase / snake_case)
 *   3. Add your domain-specific columns
 *   4. Run: drizzle-kit generate to create the migration file
 *
 * Conventions:
 *   - Every table has: id (UUID), created_at, updated_at
 *   - Use snake_case for column names
 *   - Use camelCase for TypeScript field names (mapped via .notNull() aliases)
 *   - Each service owns one Cloud SQL instance — no cross-service table access
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────

export const [entity]StatusEnum = pgEnum('[entity]_status', [
  'active',
  'inactive',
  'deleted',
]);

// ─────────────────────────────────────────────
// Main table
// ─────────────────────────────────────────────

export const [entities] = pgTable(
  '[entities]',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // --- Domain columns (replace with your fields) ---
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    status: [entity]StatusEnum('[entity]_status').notNull().default('active'),
    amount: decimal('amount', { precision: 10, scale: 2 }),
    isEnabled: boolean('is_enabled').notNull().default(true),

    // --- Foreign key (if applicable) ---
    // ownerId: uuid('owner_id').notNull().references(() => owners.id),

    // --- Audit columns (always present) ---
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // Composite index for common query pattern
    statusIdx: index('[entities]_status_idx').on(table.status),
    // Unique constraint example
    // nameUniqueIdx: uniqueIndex('[entities]_name_unique').on(table.name),
  }),
);

// ─────────────────────────────────────────────
// Relations (if using relational queries)
// ─────────────────────────────────────────────

// export const [entities]Relations = relations([entities], ({ one, many }) => ({
//   owner: one(owners, {
//     fields: [[entities].ownerId],
//     references: [owners.id],
//   }),
// }));

// ─────────────────────────────────────────────
// Type exports
// ─────────────────────────────────────────────

export type [Entity] = typeof [entities].$inferSelect;
export type New[Entity] = typeof [entities].$inferInsert;
