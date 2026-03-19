---
description: "Core networking infrastructure — Conveyor VPCs, VPC peering, Cloud Router, NAT, firewall rules, private DNS"
---

# Infrastructure Networking

## Overview

The **terraform-gcp-core** repository manages the core networking infrastructure for Groupon's cloud platform. It provisions dedicated Conveyor VPCs per environment and region, establishes VPC peering with the shared VPC from gcp-landingzone, configures subnets for Kubernetes workloads, Cloud Router, NAT, firewall rules, and private DNS zones.

## Key Responsibilities

### Conveyor VPCs
- One VPC per environment (dev, staging, production) per region
- Regions: `us-central1`, `europe-west1` (GCP); `us-west-1`, `us-west-2`, `eu-west-1` (AWS)
- Managed lifecycle via Terraform

### VPC Peering
- Peering connections to shared VPC from gcp-landingzone
- Enables service discovery and cross-VPC communication
- Firewall rules in shared VPC affect all peered Conveyor VPCs

### Subnet Architecture
- Primary subnet for GKE pod CIDR range
- Secondary subnet for GKE service CIDR range
- Hybrid Boundary (HB) subnet for edge proxy services
- Subnets follow strict CIDR planning to avoid overlaps

### Cloud Router & NAT
- Cloud Router for dynamic routing via BGP (where applicable)
- Cloud NAT for outbound internet connectivity from pods
- Egress filtering and logging

### Firewall Rules
- Ingress rules for pod-to-pod communication
- Egress rules for internet and cross-VPC traffic
- Rules organized by environment and function

### Private DNS Zones
- Internal DNS for service discovery
- Zone peering with shared VPC DNS from gcp-landingzone
- Service records for Kubernetes services

## Key Technologies

- **Terraform** — infrastructure as code
- **Terragrunt** — composition and DRY principles
- **Terrabase** — shared modules
- **GCP Cloud APIs** — GCP service interaction

## Key Paths

- `terra-gcp-networks/` — GCP-specific network Terraform
- `env/` — environment-specific configurations
- `modules/` — reusable network modules (VPC, subnet, peering)

## Dependencies

- **Depends on:** `gcp-landingzone` (shared VPC, org policies)
- **Consumed by:** `conveyor_k8s` (GKE cluster networking)

## Related Documentation

- See [gotchas/infrastructure-networking.md](../gotchas/cloud-foundation.md#infrastructure-networking) for subnet coordination and firewall blast radius
- See [domains/cloud-foundation.md](./cloud-foundation.md) for org policies and shared VPC
- See [domains/kubernetes-platform.md](./kubernetes-platform.md) for GKE integration

---

**Repository:** `terraform-gcp-core`
**Status:** Critical infrastructure path
**Maintainers:** Cloud Platform team
