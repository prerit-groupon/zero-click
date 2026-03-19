---
description: "Application deployment standardization — Helm charts, HBU CRD emission, mTLS sidecar injection, SOX compliance, Artifactory publishing"
---

# Application Deployment

## Overview

The **application deployment** layer provides standardized Helm chart packaging for all Groupon Kubernetes services. The **cmf-helm-charts** repository contains a library chart system that emits Hybrid Boundary Unit (HBU) Custom Resource Definitions, injects mTLS sidecars, and enforces SOX compliance. All applications follow this standard for consistent, secure deployment.

## Key Components

### Chart Architecture

#### Common Library Chart
**Chart:** `common`

Shared utilities and helpers:
- Base configuration templates
- Shared labels and annotations
- ServiceAccount configuration
- ConfigMap and Secret templates
- Helper functions for all framework charts

#### Framework Charts
Specialized charts for different application types:

1. **generic** — Basic service (minimal configuration)
   - Suitable for lightweight services
   - Deployment, Service, ConfigMap, Secret
   - No language-specific assumptions

2. **java** — Java applications
   - JVM-specific resource requests
   - Java memory configuration
   - Classpath and library injection
   - GC log configuration

3. **jTier** — Legacy J2EE applications
   - EJB container support
   - Legacy class loading
   - Transaction management
   - Backward compatibility

4. **rails** — Rails applications
   - Bundle configuration
   - Asset pipeline
   - Database migration hooks
   - Rails-specific environment variables

5. **i-tier** — Internal integration tier services
   - Internal service standards
   - Batch processing support
   - Legacy protocol support
   - Integration-specific logging

### HBU CRD Emission

Every application deployment **automatically emits HBU Custom Resource Definitions**:

```yaml
# Generated from values.yaml
HBUCluster:
  - namespace
  - cluster name
  - service selector

HBUService:
  - service name
  - port mapping
  - protocol (gRPC, HTTP/1.1, HTTP/2)
  - health check configuration

HBUPolicy:
  - access control rules
  - data classification (C1-C3, SOX, PCI)
  - traffic policies
```

These CRDs are automatically consumed by `hybrid-boundary-controller` to:
- Create Internal Load Balancers (ILBs) for the service
- Register the service in the Hybrid Boundary mesh
- Apply mTLS policies
- Configure service discovery

### mTLS Sidecar Injection

#### Injection Method
Template: `_tls-sidecar.tpl`

Automatically injects Envoy mTLS sidecar into all pod specs:
- Sidecar container with cert-manager integration
- init container for iptables configuration
- Volume mounts for certificates
- Resource requests/limits

#### Opt-In Configuration
- HTTP/2 support: opt-in via values (default: false)
- Sidecar version: configurable per chart version
- Certificate rotation: automatic via cert-manager
- Traffic interception: iptables-based transparency

#### Usage
```yaml
# values.yaml
mtls:
  enabled: true
  http2: false  # OPT-IN required for HTTP/2
  certManager:
    issuer: cluster-issuer-name
```

### Helm Values Structure

Standard values layout across all charts:

```yaml
replicaCount: 3
image:
  repository: groupon/my-service
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080
  targetPort: 8080
  protocol: HTTP/1.1  # HTTP/1.1, gRPC, HTTP/2

hbu:
  enabled: true
  dataClassification: C2  # C1, C2, C3, SOX, PCI
  policies:
    - action: allow
      principal: service:other-service
      resource: api.endpoints

mtls:
  enabled: true
  http2: false

resources:
  requests:
    memory: 256Mi
    cpu: 100m
  limits:
    memory: 512Mi
    cpu: 500m

affinity:
  podAntiAffinity: preferred

securityContext:
  runAsNonRoot: true
  capabilities:
    drop:
      - ALL
```

## Publishing & Distribution

### Artifactory
- All charts published to Artifactory Helm repository
- Versioning via Semantic Versioning (SemVer)
- Release pipeline: chart version bump → build → publish → DeployBot trigger

### DeployBot Integration
- DeployBot consumes published charts from Artifactory
- Deployment triggered via deploy tags (e.g., `deploy-prod`, `deploy-staging`)
- SOX compliance logging: all deployments tracked for audit

## SOX Compliance

All deployments are SOX-compliant:
- Security context enforcement (non-root, dropped capabilities)
- Network policy integration (if applicable)
- Audit logging via DeployBot
- RBAC through Kubernetes ServiceAccounts
- Secret management via cert-manager and Kubernetes Secrets

## Key Technologies

- **Helm 3** — package manager for Kubernetes
- **Mustache/Go Templates** — Helm templating
- **Kustomize** — optional post-processing
- **cert-manager** — mTLS certificate management
- **Envoy** — mTLS sidecar (via mtls-sidecar repo)
- **Kubernetes CRDs** — HBU resource definitions
- **Artifactory** — Helm chart repository
- **DeployBot** — deployment automation

## Key Paths

- `common/` — library chart with shared templates
- `charts/generic/` — generic framework chart
- `charts/java/` — Java framework chart
- `charts/rails/` — Rails framework chart
- `charts/jTier/` — Legacy J2EE chart
- `charts/i-tier/` — Internal services chart
- `templates/` — shared template directory
- `_tls-sidecar.tpl` — mTLS injection template
- `Chart.yaml` — chart metadata
- `values.yaml` — default configuration

## Usage Example

### Deploying a Java Service

1. Create or update `values.yaml`:
   ```yaml
   image:
     repository: groupon/payment-service
     tag: v1.2.3

   service:
     port: 8080
     protocol: HTTP/1.1

   hbu:
     enabled: true
     dataClassification: C3  # Confidential

   mtls:
     enabled: true
     http2: false

   java:
     heap: "256m"
   ```

2. Deploy via DeployBot or Helm:
   ```bash
   helm install payment-service groupon/java -f values.yaml
   ```

3. Service is automatically:
   - Deployed with mTLS sidecar
   - Registered in Hybrid Boundary mesh
   - Assigned HBU ILB
   - Subject to HBU policies

## Cross-Domain Dependencies

- **Depends on:**
  - `service-mesh` (HBU CRD definitions, mTLS sidecar implementation)
  - `hybrid-boundary-controller` (consumes emitted CRDs)
  - `mtls-sidecar` (sidecar container image)

- **Provides to:**
  - All Groupon applications
  - CI/CD pipelines (standardized deployment)
  - Observability stack (mTLS enables encrypted communication)

## Important Behaviors

- **HBU CRDs are auto-emitted** — no manual CRD creation needed
- **mTLS sidecar is always injected** (when enabled) — transparent to application
- **HTTP/2 is OPT-IN** — set `mtls.http2: true` to enable
- **Chart updates require HBU schema compatibility** — coordinate with hybrid-boundary-controller
- **Data classification drives policy** — incorrect classification in values.yaml affects access control

## Related Documentation

- See [gotchas/application-deployment.md](../gotchas/general.md) for deployment best practices
- See [domains/service-mesh.md](./service-mesh.md) for HBU CRD structure and mTLS sidecar implementation
- See [domains/routing-proxy.md](./routing-proxy.md) for external traffic routing to applications

---

**Repository:** `cmf-helm-charts`
**Status:** Critical infrastructure — all applications depend on this
**Maintainers:** Cloud Platform team
