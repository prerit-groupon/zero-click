# Telegraf & CLAM — Detailed Reference

This document covers the Telegraf Agent and Gateway architecture, CLAM (Cluster Aggregator for Metrics), and the Kafka topics that connect them.

## Table of Contents
1. [Telegraf Overview](#telegraf-overview)
2. [Telegraf Agent](#telegraf-agent)
3. [Telegraf Gateway](#telegraf-gateway)
4. [Input and Output Plugins](#input-and-output-plugins)
5. [CLAM (Cluster Aggregator for Metrics)](#clam)
6. [Kafka Topics](#kafka-topics)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Telegraf Overview

Telegraf is a server-based agent for collecting, processing, and forwarding metrics. At Groupon:
- Written in Go, compiles into a single binary with no external dependencies
- Uses a **forked version** containing custom in-house plugins for metric pre-processing and aggregation
- These custom plugins were historically necessary to limit **Time Series Per Minute (TPM)** costs when Groupon was using Wavefront as a metrics backend
- Telegraf handles the first half of metrics aggregation; CLAM handles the second

### Usage at Groupon
- Data collection via push and pull depending on the data source
- Performs first-tier metrics aggregation
- Routes metrics data to the second level of aggregation (CLAM) and to Thanos Receiver

---

## Telegraf Agent

The Telegraf Agent is the initial entry point for services pushing metrics.

### Architecture
- Sits behind the **`telegraf.production`** endpoint
- A **load balancer** distributes traffic across multiple agent pods
- Each agent performs first-tier metric aggregation and strips certain UIDs to manage cardinality

### Configuration
- Agent configuration: `https://github.groupondev.com/metrics/telegraf-deployment/blob/develop/telegraf.conf#L1`
- Agents are deployed as standard Kubernetes Deployments

### Hybrid Boundary (HBU)
- A **Custom Resource Definition (CRD)** used to manage service discovery and load balancing for the Telegraf architecture
- Defines how traffic is routed to Telegraf agent pods

---

## Telegraf Gateway

The Gateway is a centralized processing layer that receives data from all agents.

### Architecture
- Receives aggregated metrics from agents
- Applies additional processors (custom in-house plugins for further aggregation)
- Routes output to multiple destinations:
  - **Kafka** (for CLAM processing and as a data bus)
  - **Thanos Receiver** (via Prometheus remote write)

### Configuration
- Gateway configuration: `https://github.groupondev.com/metrics/telegraf-deployment/blob/develop/.meta/deployment/cloud/components/gateway/common.yml#L65`
- In Kubernetes, gateway configurations are stored as keys within **ConfigMaps**
- ConfigMaps allow defining specific **global tags** and **InfluxDB listeners**
- Uses the `influx_db_listener` input plugin to receive data from agents

---

## Input and Output Plugins

### Inputs
- **Gtier** (Java library): Used by services to push metrics to Telegraf
- **`influx_db_listener`**: Gateway input plugin that receives data from agents in InfluxDB line protocol format

### Processors and Aggregators
- Groupon uses a **forked version of Telegraf** with custom in-house plugins
- These handle metric pre-processing and aggregation
- Originally designed to manage TPM (Time Series Per Minute) costs
- Includes custom aggregator plugins for combining metrics before forwarding

### Outputs
- **Kafka**: Writes to topics like `metrics_v2_histograms` for CLAM processing
- **Thanos Receiver**: Forwards processed metrics via Prometheus remote write
- The gateway can output to multiple destinations simultaneously

---

## CLAM

CLAM (Cluster Aggregator for Metrics) is an application built on **Kafka Streams** that performs the second level of metric aggregation.

### What CLAM Does
- Consumes raw histogram data from the `metrics_v2_histograms` Kafka topic
- Performs complex mathematical aggregations and histogram merges
- Produces statistically accurate single representations from metrics coming from multiple sources
- Outputs results to the `metrics_aggregates` Kafka topic

### Data Flow
```
Kafka (metrics_v2_histograms) → CLAM (lots_of_math) → Kafka (metrics_aggregates) → Telegraf Gateway → Thanos Receiver
```

### Architecture
- Uses **Kafka Streams** as the processing framework
- Deployed as a **StatefulSet** in Kubernetes (requires Persistent Volume Claims / PVCs to store Kafka stream state data)
- The internal Kafka Streams topology includes: SOURCE → MAPVALUES → FILTER → AGGREGATE (with state store) → SUPPRESS → MAPVALUES → TOSTREAM → SINK

### Resources
- GitHub: `https://github.groupondev.com/metrics/CLAM_KafkaStream`
- Owners Manual: `https://groupondev.atlassian.net/wiki/spaces/METS/pages/42799186718/Kafka+Streams+Owners+Manual`
- Service Portal: `https://services.groupondev.com/services/clam`

---

## Kafka Topics

Two primary Kafka topics are used in the metrics pipeline:

### `metrics_v2_histograms`
- Contains raw histogram metric data from the Telegraf Gateway
- Consumed by CLAM for mathematical aggregation

### `metrics_aggregates`
- Contains the output from CLAM — fully aggregated metrics
- Consumed by the Telegraf Gateway as an input
- These aggregated metrics are then forwarded to Thanos Receiver

---

## Deployment

- **Telegraf** and **CLAM** are deployed using **Deploy Bot**
- Telegraf agents and gateways are standard Kubernetes Deployments
- CLAM is a StatefulSet (requires PVCs for Kafka Streams state)
- Configuration changes are managed through GitHub repos and deployed via the standard CI/CD pipeline

---

## Troubleshooting

### 500 Errors on Telegraf
- Check **Kibana** for elevated 500-series errors on the **Telegraf index**
- 500 errors indicate a pipeline issue on our side

### Metrics Not Appearing for a Service
- **Isolation step**: If 500 errors are seen on our side, it's a pipeline issue
- If **no** 500 errors and no metrics are being dropped, the issue is likely with the **service's internal Telegraf** or its **metric-pushing library** (e.g., Gtier configuration)

### CLAM Rebalancing Alerts
- "CLAM rebalancing" alerts typically indicate a **pod is down or restarting**
- This usually **self-resolves** over time as Kafka Streams rebalances consumers
- Monitor Kafka consumer lag to ensure processing catches up

### High Kafka Lag
- May indicate CLAM pods are behind in processing
- Check CLAM pod health and resource utilization
- May need to scale up CLAM replicas if lag persists
