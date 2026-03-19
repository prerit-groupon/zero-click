---
description: "Public traffic routing layer — CDN integration, edge proxy, TLS termination, Vert.x api-proxy, nginx, routing configuration via .flexi DSL"
---

# Traffic Routing & Proxy

## Overview

The **routing and proxy** layer handles all public-facing traffic for Groupon services. It comprises a carefully orchestrated pipeline from CDN (Cloudflare/Akamai) through edge proxies, routing service, TLS termination, request routing, and finally to backend service ILBs. This layer spans 6 repositories with complex deployment orchestration and configuration management.

## Architecture

### Full Traffic Path

```
Client
  ↓
CDN (Cloudflare / Akamai)
  ↓
HB edge proxy (public namespace, shared VPC)
  ↓ (routes to)
routing-service ILB (Layer 4 load balancer)
  ↓
nginx pod (TLS termination, port 443)
  ↓ (proxies to)
api-proxy pod (Vert.x, .flexi rules, port 9000)
  ↓ (routes to)
backend HBU ILBs (service pods)
```

## Key Components

### 1. API Proxy
**Repository:** `api-proxy`

Java-based request router using Vert.x framework:
- Implements .flexi routing rules (custom DSL)
- Listens on port 9000 (HTTP/1.1 from nginx)
- Performs request routing, rate limiting, auth, transformation
- **Two deployments exist:**
  1. **routing-service pod** — deployed without mTLS sidecar (no encryption to backend)
  2. **standalone api-proxy** — deployed with mTLS sidecar and HBU integration
- Code changes affect BOTH deployments

### 2. Proxy Config
**Repository:** `proxy-config`

JSON-based configuration for proxy behavior:
- Load balancing rules
- Backend selection
- Circuit breaker policies
- Timeout settings
- Consumed by api-proxy

### 3. Routing Config (Production & Staging)
**Repositories:** `routing-config-production`, `routing-config-staging`

.flexi DSL routing rule definitions:
- Request matching (path, method, headers)
- Traffic splitting and canary rules
- Service routing destinations
- **Always test in routing-config-staging BEFORE production**
- Validation: run `gradlew validate` before committing

### 4. Web Config
**Repository:** `web-config`

nginx Mustache templates:
- TLS certificate configuration
- Virtual host definitions
- Upstream backend configuration
- Header manipulation
- Compiled to nginx.conf during deployment

### 5. Routing Deployment
**Repository:** `routing-deployment`

Kustomize-based Kubernetes deployment:
- 4 init containers (certificate setup, config validation, secrets injection, warmup)
- 6 runtime containers (nginx, api-proxy, sidecar, logging agents, monitoring, etc.)
- Manages container startup order and health checks
- **Image tags auto-updated by Jenkins** (never edit manually)

### 6. Deployment Pipeline
**Repository:** Pipeline configuration (GitHub Actions / Jenkins)

Orchestrates the deployment chain:
- Config repo merge → Jenkins build trigger
- Docker image build and registry push
- routing-deployment image tag update
- DeployBot deployment initiation

## Deployment Pipeline Detail

### Configuration → Deployment Flow

```
Changes to any config repo:
┌─────────────────────────────────────────┐
│ routing-config-production/staging       │
│ proxy-config                            │
│ web-config                              │
└────────────┬────────────────────────────┘
             ↓
    GitHub Actions trigger
             ↓
    Jenkins build job
             ↓
    Config validation + merge
             ↓
    Docker image build
             ↓
    routing-deployment manifest update
    (image tag + config versions)
             ↓
    DeployBot deployment
             ↓
    routing-service pod restart
```

### Key Points

- **Config repos:** routing-config-*, proxy-config, web-config all trigger routing-deployment updates
- **Merging any repo starts a deploy chain** — changes propagate immediately
- **Never manually edit routing-deployment image tags** — Jenkins updates them
- **routing-service ILB is a STATIC resource** — not HBU-managed, special case

## Deployment Variants

### routing-service Pod (no mTLS)
- Standard deployment
- nginx → api-proxy on localhost:9000 (HTTP/1.1, no TLS)
- Routes to backend HBU ILBs
- No mTLS sidecar

### Standalone api-proxy (with mTLS)
- Alternative deployment
- Includes mTLS sidecar for backend encryption
- Registers with Hybrid Boundary
- Used for high-security services

## Key Technologies

- **Java (Vert.x)** — api-proxy request router
- **.flexi DSL** — custom routing language (Java-based)
- **nginx** — reverse proxy, TLS termination
- **Kustomize** — Kubernetes manifest templating
- **Mustache templates** — nginx config generation
- **Docker** — container images
- **Kubernetes** — orchestration and deployment
- **Jenkins / GitHub Actions** — CI/CD pipeline

## Key Paths

- `api-proxy/` — main routing logic (Vert.x)
- `proxy-config/` — JSON config files
- `routing-config-*/` — .flexi routing rules
- `web-config/` — nginx Mustache templates
- `routing-deployment/kustomization.yaml` — Kubernetes deployment manifest
- `Jenkinsfile` — pipeline definition

## Validation & Testing

### .flexi DSL Validation
```bash
cd routing-config-production  # or staging
./gradlew validate
```
Always run before committing routing rules.

### Testing Progression
1. Develop in `routing-config-staging`
2. Test in staging cluster
3. Validate routing rules with `gradlew validate`
4. Merge to `routing-config-production` (triggers deploy)

## Important Constraints

- **nginx ↔ api-proxy:** HTTP/1.1 only, localhost:9000, no TLS between them (within pod)
- **api-proxy ↔ backends:** depends on deployment (routing-service uses direct HTTP, standalone uses mTLS sidecar)
- **TLS termination:** nginx terminates TLS from clients on port 443
- **Static ILB:** routing-service ILB is not HBU-managed — it's a special case

## Cross-Domain Dependencies

- **Depends on:**
  - `hybrid-boundary-controller` (backend service ILB creation and registration)
  - `service-mesh` (backend HBU integration)
  - `cmf-helm-charts` (mTLS sidecar if using standalone api-proxy)

- **Provides to:**
  - All client traffic (public-facing entry point)
  - CDN (Cloudflare/Akamai) uses this layer as origin

## Related Documentation

- See [gotchas/routing.md](../gotchas/routing.md) for deployment constraints, config repo chain reactions, and .flexi validation
- See [domains/service-mesh.md](./service-mesh.md) for backend ILB management and HBU integration
- See [domains/application-deployment.md](./application-deployment.md) for mTLS sidecar availability

---

**Repositories:** `api-proxy`, `proxy-config`, `routing-config-production`, `routing-config-staging`, `web-config`, `routing-deployment`
**Status:** Critical infrastructure — public traffic entry point
**Maintainers:** Cloud Platform team
