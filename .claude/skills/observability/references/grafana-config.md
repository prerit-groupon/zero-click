# Grafana Configuration — Detailed Reference

This document covers Grafana deployment, alerting, authentication, plugins, and the internal monitoring instance at Groupon.

## Table of Contents
1. [Production Grafana](#production-grafana)
2. [High Availability Alerting](#high-availability-alerting)
3. [Authentication](#authentication)
4. [Plugins](#plugins)
5. [Internal Grafana](#internal-grafana)
6. [Configuration Management](#configuration-management)
7. [Data Sources](#data-sources)
8. [Troubleshooting](#troubleshooting)

---

## Production Grafana

### Deployment
- Deployed in the **`logging`** namespace in Kubernetes
- Runs as a multi-replica deployment (`grafana-ha`) for high availability
- Uses an **external Postgres database** managed by the DBA team to store:
  - Dashboards
  - Alerts
  - User data
- The external database is critical — it's not managed by the metrics team but by a separate DBA team

### Dashboard URL
- Main Grafana: `https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com`

---

## High Availability Alerting

- Grafana Alerting evaluates alert rules on **every pod** in the deployment
- To prevent duplicate alert notifications, it uses a **"Grafana alerting" service** on **Port 9894**
- This service handles inter-pod state synchronization so that only one pod fires each alert
- Alert states are coordinated across all replicas to ensure exactly-once delivery

---

## Authentication

- Configured via **Okta** (SSO)
- Uses environment variables stored in **Kubernetes Secrets**:
  - `GF_AUTH_OKTA_CLIENT_ID` — Okta client identifier
  - Other Okta-related secrets for client secret, auth URL, etc.
- Secrets are managed separately from general configuration

---

## Plugins

- Additional functionality is added through **plugins**
- Plugins are installed dynamically via **init containers** during deployment
- This approach avoids the need to maintain custom Docker images with pre-installed plugins
- Init containers download and install plugins before the main Grafana container starts
- This makes plugin management more flexible — adding or updating a plugin just requires changing the init container configuration

---

## Internal Grafana

### Purpose
- A **separate, simplified Grafana instance** called **`grafana-internal`**
- Used specifically to **monitor the production Grafana service** and the Thanos stack itself
- Acts as a "watchdog" — if production Grafana goes down, the internal instance can still show what's happening

### Why It Exists
- You can't effectively monitor Grafana with itself
- If production Grafana has issues (e.g., high file descriptor usage, database connectivity problems), you need an independent monitoring point
- Internal Grafana provides that independent view

### Dashboard URL
- Internal Grafana: `http://grafana-internal.logging.prod.gcp.groupondev.com/dashboards/f/ce2iir85boxs0c/`

---

## Configuration Management

Grafana is configured through three mechanisms:

### 1. ConfigMaps
- Used for the **`grafana.ini`** file and general settings
- Contains non-sensitive configuration like:
  - SMTP settings for email notifications
  - Server root URLs
  - Feature toggles
  - Logging configuration

### 2. Kubernetes Secrets
- Used for **sensitive data** including:
  - Database credentials (Postgres connection strings)
  - Okta authentication keys
  - Storage bucket certificates
  - API keys for external integrations

### 3. Environment Variables
- Prefixed with **`GF_`** to override static configuration file settings
- Grafana automatically maps `GF_` environment variables to `grafana.ini` settings
- Example: `GF_AUTH_OKTA_CLIENT_ID` maps to `[auth.okta] client_id` in grafana.ini
- This allows runtime configuration without modifying ConfigMaps

---

## Data Sources

Grafana at Groupon connects to multiple data sources:

1. **Thanos** (Prometheus-compatible) — Primary metrics source, queried via Thanos Query Frontend
2. **Elasticsearch** — Used for log-based metrics and search
3. **Google Cloud Monitoring (Stackdriver)** — For GCP-native metrics

---

## Troubleshooting

### Open File Descriptors > 3,000
- If the "open file descriptors" metric on Grafana pods exceeds **3,000**, it indicates a resource leak
- **Remediation**: Perform a rollout restart of the `grafana-ha` deployment
  ```
  kubectl rollout restart deployment/grafana-ha -n logging
  ```

### Database Connectivity
- If dashboards aren't loading or alerts aren't evaluating, check connectivity to the external Postgres database
- The database is managed by the DBA team — escalate to them if there are connection issues

### Alert Duplication
- If alerts are firing multiple times, check the Grafana alerting service on Port 9894
- Ensure inter-pod communication is working (the pods need to sync alert state)

### Plugin Failures
- If a plugin isn't working after deployment, check the init container logs
- Verify the plugin download succeeded during the init phase
- Check that the plugin version is compatible with the deployed Grafana version
