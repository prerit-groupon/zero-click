# Redis & Caching

## GCP Memorystore (Redis)

**CRITICAL: Staging and production share the same Redis cluster.**

- Single GCP Memorystore instance serves both environments
- No namespace isolation — staging keys can collide with production keys
- A staging FLUSHDB or accidental FLUSHALL would wipe production data

## Client Libraries

- **TypeScript services**: `ioredis` — async Redis client with cluster support
- **Go services**: `go-redis` — standard Go Redis client
- **Python services**: not documented (may use `redis-py` or direct connections)

## Configuration Issues

- **No namespace convention**: services write keys without environment prefixes (e.g., no `prod:` or `stg:` prefix)
- **No TTL enforcement**: services can write keys without expiry, leading to unbounded memory growth
- **No eviction policy configured**: Memorystore likely uses `noeviction` default — when memory is full, all writes fail
- **No memory alerts**: no alerting at 70%/85%/95% memory thresholds
- **No connection pooling standard**: TS and Go services configure Redis connections independently with no shared pattern
- **No sentinel/cluster mode**: no failover handling — a Memorystore maintenance window cascades connection errors across all services

## Known Risks

| Risk | Severity | Detail |
|------|----------|--------|
| Shared staging/production cluster | CRITICAL | Data corruption, staging commands affecting production |
| No namespace isolation | HIGH | Key collisions between environments and between services |
| No TTL policies | HIGH | Unbounded memory growth, eventual eviction or OOM |
| No eviction policy config | HIGH | `noeviction` default means writes fail when memory full |
| No memory alerting | MEDIUM | No visibility into approaching memory limits |
| No failover handling | MEDIUM | Maintenance window causes cascading errors |
| No connection pooling standard | LOW | Inconsistent connection management across runtimes |

## Proposed Fix (from analysis)

1. Provision dedicated Memorystore instance for staging
2. Implement environment-prefixed namespace convention (`prod:`, `stg:`)
3. Enforce mandatory TTL on all keys, audit existing keys without expiry
4. Set eviction policy to `allkeys-lru`
5. Configure memory alerts at 70%/85%/95% thresholds
6. Update secret configuration to eliminate shared credentials across environments
