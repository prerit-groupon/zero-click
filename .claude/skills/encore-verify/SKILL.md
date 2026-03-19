---
name: encore-verify
description: >
  Verification skill for Encore TS services in Groupon's monorepo. Use this skill to confirm that
  code changes actually work — running the service locally, smoke-testing endpoints, verifying
  Drizzle migrations applied cleanly, checking Pub/Sub message delivery, and validating Cloud Run
  health in staging. Trigger after: implementing an API endpoint, applying a migration, adding a
  Pub/Sub subscriber, or before marking a task done. Pair with /encore-style for writing correct code.
---

# Encore Verify — Confirmation That It Actually Works

Category: Verification

This skill closes the loop between "Claude wrote the code" and "the code actually works." It covers the verification steps for Encore TS services — local testing, database migration validation, endpoint smoke tests, and staging health checks.

**Rule: Nothing is done until it is verified.** Use this skill before marking any implementation task complete.

---

## 1. Local Development Server

```bash
# From monorepo root
encore run

# Or for a specific service
encore run ./apps/encore-ts/<service-name>/...
```

Expected output:
```
INF  Starting Encore application
INF  API Gateway started on http://localhost:4000
INF  <service-name> started
```

If Encore fails to start, check:
- `encore.service.ts` exists in the service directory
- No TypeScript compile errors (`tsc --noEmit`)
- Database migrations are up to date

---

## 2. TypeScript Compilation Check

Before running anything, verify there are no type errors:

```bash
cd apps/encore-ts/<service-name>
npx tsc --noEmit
```

Zero output = no type errors. This catches the most common issues before runtime.

---

## 3. Database Migration Verification

After writing or modifying a Drizzle schema:

```bash
# Generate migration from schema changes
npx drizzle-kit generate:pg --config drizzle/drizzle.config.ts

# Apply migration to local dev DB (Encore manages the DB)
encore db migrate <service-name>
```

Verify the migration applied:
```bash
encore db shell <service-name>
# In psql:
\d <table-name>   -- check column structure
```

**Check for:**
- New columns have the correct type and nullability
- Indexes were created (`\di <table-name>_*`)
- No orphaned columns from a previous draft

---

## 4. API Endpoint Smoke Tests

With `encore run` active, test endpoints via the Encore Local Dashboard or curl:

```bash
# Encore Local Dashboard (auto-opens)
http://localhost:9400/

# Or curl directly
curl -s http://localhost:4000/<service-name>/<endpoint-path> | jq .

# POST with body
curl -s -X POST http://localhost:4000/<service-name>/<endpoint-path> \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}' | jq .
```

**Verify:**
- ✅ 200 response with correct shape
- ✅ 404 response for non-existent resources (not 500)
- ✅ 400 response for invalid input (not 500)
- ✅ Response matches the TypeScript return type definition

---

## 5. Pub/Sub Verification

After adding a Topic publisher or Subscription handler:

```bash
# In the Encore Local Dashboard, navigate to Pub/Sub
http://localhost:9400/pubsub

# Publish a test message manually via the dashboard
# Or trigger the publisher via an API call and watch the subscriber log
```

Verify in `encore run` output:
```
INF  Published message to DEAL_SYNC_TOPIC  id=msg-123
INF  [process-deal-sync] Processing event  dealId=d-456
```

**Common failure:** Subscriber not firing = wrong topic reference. Confirm the subscriber imports the exact same `Topic` instance as the publisher.

---

## 6. Run Tests

```bash
# Run all tests for a service
encore test ./apps/encore-ts/<service-name>/...

# Run a specific test file
encore test ./apps/encore-ts/<service-name>/<service-name>.test.ts

# Run with verbose output
encore test -v ./apps/encore-ts/<service-name>/...
```

All tests must pass before marking the task done. No exceptions for "it works locally."

---

## 7. Staging Health Check (Cloud Run)

After deployment to staging:

```bash
# Check Cloud Run service health
gcloud run services describe <service-name> \
  --region us-central1 \
  --project prj-grp-gds-stable-63d2 \
  --format "value(status.conditions[0].status)"
# Expected: True

# Check recent revisions
gcloud run revisions list \
  --service <service-name> \
  --region us-central1 \
  --project prj-grp-gds-stable-63d2
```

Check Encore Cloud dashboard for staging deployment status and any startup errors.

---

## 8. Checklist — Done Means All of These

```
- [ ] encore run starts without errors
- [ ] tsc --noEmit passes with 0 errors
- [ ] Drizzle migration applied and schema matches intent
- [ ] All API endpoints return correct status codes for happy and error paths
- [ ] Pub/Sub messages are published and consumed (if applicable)
- [ ] encore test passes with 0 failures
- [ ] No TypeScript `any` types introduced without justification
- [ ] No console.log left in production code paths
```

---

## Gotchas

**`encore run` failing silently** — If Encore starts but a service is missing, check for a missing `encore.service.ts`. Encore won't error loudly — it just won't include the service.

**Migration applied locally but not in staging** — Encore Cloud runs migrations automatically on deployment. If staging behaves differently than local, check whether the migration file was committed and included in the deployment. `encore db migrate` is local only.

**Pub/Sub subscriber not firing** — The subscriber imports a `Topic` object. If there are two different `Topic` instances with the same name string (e.g., one in each service), they are different instances and messages won't cross. Always import the exact Topic exported from the publisher's module.

**Test database is not the local database** — Encore creates isolated test databases for each test run. Tests that pass locally may fail in CI if they depend on seed data from `encore run`'s database. Make tests self-contained — create all required data within the test.

**Type errors hidden by `any`** — TypeScript's `any` can hide type mismatches that will crash at runtime. If `tsc --noEmit` passes but the endpoint crashes, search for `any` in the diff. Encore's API types are strict — `any` breaks the type-safety guarantees.

**Cloud Run startup failures look like 404s** — If staging returns 404 on a valid endpoint, the service may not have started correctly. Check Encore Cloud deployment logs and Cloud Run revision status before assuming the endpoint path is wrong.
