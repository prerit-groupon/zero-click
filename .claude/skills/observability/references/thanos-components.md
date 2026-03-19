# Thanos Components — Detailed Reference

This document covers every Thanos component deployed at Groupon, including configuration details, deployment info, and troubleshooting procedures.

## Table of Contents
1. [Thanos Receiver](#thanos-receiver)
2. [Thanos Store](#thanos-store)
3. [Thanos Query and Query Frontend](#thanos-query-and-query-frontend)
4. [Thanos Compact](#thanos-compact)
5. [Thanos Rule](#thanos-rule)
6. [Deployment and Configuration Management](#deployment-and-configuration-management)

---

## Thanos Receiver

The Thanos Receiver is the primary write endpoint for the metrics pipeline. Telegraf gateways and legacy services push metrics to it via Prometheus remote write.

### Architecture
- Uses a **router-ingestor** architecture
- The **router** distributes incoming metrics across ingestor pods using a **hash ring**
- Deployed as a **StatefulSet** in Kubernetes

### Configuration
- **Replication Factor**: Set to **2** — every metric is replicated to at least one other pod. This means:
  - At least **2 ingestor pods** must be running at all times
  - If fewer than 2 pods are healthy, the router will crash loop
- **Time Window**: Configured to accept data only up to **5 minutes** in the future, blocking erroneous metrics with bad timestamps
- **Endpoints**: Uses `receive-local-endpoint` for internal communication between router and ingestors
- **Networking**: Uses a **headless service** in Kubernetes to enable direct communication between specific stateful set pods by name

### Hash Ring Management
- Managed by the **`thanos-receive-controller`** — a specialized controller that automatically updates the hash ring configuration
- The controller maintains a **JSON-formatted ConfigMap** containing the addresses of all healthy ingestor pods
- When a Receiver pod restarts, the controller automatically detects the change and updates the ConfigMap
- This ensures metrics are always routed to healthy pods without manual intervention

### Troubleshooting
- **Router crash loop**: Check if at least 2 ingestor pods are running. The replication factor requires a minimum of 2 healthy pods.
- **Pod restarts**: The `thanos-receive-controller` should automatically update the hash ring. Verify the ConfigMap is being updated.

---

## Thanos Store

Thanos Store acts as a gateway to object storage (GCS buckets). It downloads metrics from bucket storage and advertises them to Thanos Query, making historical data available for queries.

### Configuration
- Uses **Redis** for index caching to accelerate data retrieval and speed up pod recovery after restarts
- Pod naming follows the pattern: `thanos-store-0`, `thanos-store-1`, etc.

### Key Metric: Concurrent Capacity
- The team monitors **"concurrent capacity"** — a metric that indicates how many concurrent requests a Store pod can handle
- When this metric reaches **zero**, the Store pod can no longer handle new requests
- Requests pile up, causing **high latency** or **query failures**

### Troubleshooting

**Out-of-Capacity / High Latency:**
1. Identify the affected Store pod (e.g., `thanos-store-0`)
2. Delete the pod to clear the request queue — Kubernetes will recreate it automatically
3. The pod will recover and begin serving requests again
4. After restart, Redis index cache helps speed up recovery

**Redis Issues:**
- Monitor Redis memory utilization
- If Redis memory reaches **99%**, the data must be flushed
- A full Redis cache degrades Store query performance significantly

**Long-term**: Many historical CPU spike issues were resolved by migrating Stores from the "conveyor" cluster to a new cluster with better instance types

---

## Thanos Query and Query Frontend

### Thanos Query
- Provides a **Prometheus-compatible HTTP v1 API** for querying the entire cluster
- Retrieves data from both **Thanos Receivers** (recent data) and **Thanos Stores** (historical data from buckets)
- Acts as the central query engine

### Thanos Query Frontend
- Sits in front of Thanos Query as the entry point for all user queries (via Grafana)
- Based on the **Cortex** project
- Caches **range queries** in a **Redis cluster** to speed up repeated user requests
- Significantly improves performance for dashboards that are viewed frequently

### Troubleshooting
- **Query timeouts**: Perform a rollout restart of the `thanos-query` deployment
  ```
  kubectl rollout restart deployment/thanos-query -n <namespace>
  ```
- Check Grafana dashboard for query latency and error rates

---

## Thanos Compact

- A **single-instance** component (not replicated)
- Performs **data compaction** and **downsampling** on objects stored in GCS buckets
- Compaction merges small TSDB blocks into larger ones for more efficient storage and querying
- Downsampling creates lower-resolution versions of old data

### Troubleshooting
- May trigger **low disk space alerts** because it must download objects from the bucket to local disk for processing
- Monitor disk usage — may need larger persistent volumes or manual cleanup of temporary files

---

## Thanos Rule (Ruler)

- Currently being implemented at Groupon
- Designed to simplify complex queries and **rewrite metrics** for teams
- Evaluates recording rules against the Thanos Query API and writes results back to object storage
- Helps reduce query complexity for frequently-used metric transformations

---

## Deployment and Configuration Management

### Raw Manifests
- Thanos components are deployed using raw Kubernetes manifests
- Source: `https://github.groupondev.com/metrics/metrics-v2/tree/main/charts/thanos-groupon-stack/templates`
- This is a Helm chart structure with templates for each component

### Namespaces
- Thanos components run in the GCP logging production project
- The observability cluster hosts the Thanos stack

### Cluster Migration
- A migration to a new cluster has been completed/is in progress
- The new cluster uses better instance types, resolving many historical performance issues
- Team members need access to the new GCP logging production project and the observability cluster to troubleshoot issues

### Configuration Approach
- **ConfigMaps**: Used for non-sensitive configuration (e.g., hash ring config, component flags)
- **Secrets**: Used for sensitive data (storage bucket certificates, authentication tokens)
- **Environment Variables**: Used to override specific settings at deployment time
