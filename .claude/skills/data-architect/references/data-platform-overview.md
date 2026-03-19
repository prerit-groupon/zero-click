# Data Platform — Deep Reference

> Source: data-architect SKILL.md
> Query current state: `node scripts/query-manifest.mjs search "data"`

---

## Platform Overview

The Data Platform sits within Continuum (ID:297) as `containers-continuum-platform-data-analytics` with **31 elements**. It serves as the data backbone for all Groupon platforms — Continuum, Encore, and MBNXT all consume its outputs.

---

## Tribe Structure (5 Squads)

| Squad | Responsibility | Key Systems |
|-------|---------------|-------------|
| **DnD Infrastructure** | GCP infrastructure for all data stores | Teradata, BigQuery, Bigtable, Data Lake, Dataproc |
| **DnD Janus** | Foundational data ingestion — raw events to canonical datasets | Janus Engine, Janus Yati, Janus Muncher, Watson Realtime, Ask Janus AI |
| **DnD Ingestion** | CDC from operational databases | Megatron (MySQL, PostgreSQL, RDS, CloudSQL), Magneto (Salesforce), GCP Datastream |
| **DnD PRE** | Platform Reliability Engineering — 24/7 pipeline operations | Airflow (Cloud Composer), Zombie Runner, CKOD, PRE Observability dashboards |
| **DnD Tools** | Analytics and experimentation tooling | Tableau, OpenMetadata (Data Catalog V2), Optimus Prime ETL, Expy A/B testing |

---

## Key Technologies (Active)

| Technology | Role | Notes |
|------------|------|-------|
| **BigQuery** | Cloud data warehouse (target state) | Replacing Teradata in 2026 |
| **Keboola** | Cloud ETL platform | Replacing legacy ETL pipelines |
| **Kafka** (Strimzi/Conveyor) | Real-time event streaming | Migrating from Amazon MSK |
| **Airflow** (Cloud Composer) | Pipeline orchestration | Multi-tenant, 24/7 ops by DnD PRE |
| **OpenMetadata** | Data catalog v2 — discovery, lineage, governance | Replacing legacy catalog |
| **Bigtable** (ID:360) | Real-time audience store | Active |
| **ElasticSearch** (ID:346) | Search indexing and log analytics | Active |
| **GCP Datastream** | Managed CDC service | Used alongside Megatron |
| **Megatron** | Internal CDC engine | MySQL, PostgreSQL, RDS, CloudSQL sources |

---

## Legacy Infrastructure (Minimize / Decommission)

| Technology | ID | Status | Replacement |
|------------|-----|--------|-------------|
| **Teradata EDW** | 299 | `ToDecommission` | BigQuery (2026) |
| **Hive Warehouse** | 357 | Legacy | BigQuery for new workloads |
| **HDFS** | 358 | Legacy | GCS / BigQuery |
| **Cassandra Audience Cluster** | 359 | Legacy | Bigtable |
| **OptimusPrime Analytics** | 91 | `ToDecommission` | Keboola + Expy |

---

## Data Flow Pattern

```
Source Systems (commerce, merchant, user activity)
    │
    ├── CDC (Megatron / GCP Datastream)
    │       └─→ BigQuery (replaces Teradata)
    │
    ├── Events (ActiveMQ Message Bus)
    │       └─→ Kafka (Janus Tier1 Topic, ID:361)
    │               └─→ BigQuery
    │
    ├── Batch ETL (EDW Exporters / Keboola)
    │       └─→ BigQuery
    │
    └── BigQuery
            ├─→ Tableau / Reporting / Analytics / ML
            └─→ Encore services (via BigQuery Wrapper, ID:7663)
```

---

## Janus System

Janus is the foundational ingestion layer. Components:

| Component | Role |
|-----------|------|
| **Janus Engine** | Core ingestion processor |
| **Janus Yati** | Yet Another Transform Interface — transformation layer |
| **Janus Muncher** | Batch consumption from event streams |
| **Watson Realtime** | Real-time stream processing |
| **Ask Janus AI** | AI-assisted data discovery |
| **Janus Tier1 Topic** (ID:361) | Primary Kafka topic — event backbone |

---

## Megatron CDC

Megatron replicates operational data from source databases into the data warehouse.

**Supported sources:**
- MySQL (Continuum shared clusters)
- PostgreSQL (Encore Cloud SQL instances)
- Amazon RDS
- GCP Cloud SQL

**Destination:** BigQuery (replacing Teradata)

**Usage rule:** Never query production databases for analytics. Megatron maintains the OLTP/OLAP boundary.

---

## Major 2026 Initiative: Teradata → BigQuery Migration

The dominant data infrastructure initiative for 2026. Teradata currently serves financial systems, reporting, and analytics.

**Migration impacts:**
- Financial Data Engine (FDE) and Journal Ledger Accounting (JLA) pipelines
- AdsOnGroupon reporting (Scala/Spark jobs → Keboola)
- Megatron CDC pipelines (DnD Ingestion squad)
- All downstream Tableau dashboards and reports

**Rule:** No new Teradata dependencies. Every new pipeline targets BigQuery.

---

## OpenMetadata (Data Catalog V2)

All datasets, pipelines, and data assets must be registered in OpenMetadata:

- **Ownership** — which squad owns this dataset
- **Lineage** — full source-to-destination trace
- **Quality metadata** — freshness, completeness, accuracy scores
- **PII classification** — fields tagged for GDPR compliance

**Rule:** Unregistered datasets are unowned datasets. Every new asset goes into OpenMetadata before consumers build on it.

---

## Compliance Constraints

**GDPR / PII:**
- PII must never land in unencrypted stores
- PII must be masked in catalogs and logs
- Right-to-deletion must be supported in all pipelines containing customer data
- Data retention policies are architecture constraints — define at design time

**Financial data:**
- SOX compliance applies to FDE and JLA pipelines
- Audit trail required for all financial transformations
- Lazlo SOX aggregator handles the compliance layer for consumer-facing financial data

---

## Approved Ingestion Paths

| Freshness Requirement | Ingestion Method |
|----------------------|-----------------|
| Real-time (< 1 min) | Kafka (Janus Tier1 Topic) |
| Near-real-time (1-15 min) | Megatron CDC / GCP Datastream |
| Batch (hourly/daily) | Keboola ETL / Airflow |

**Decision rule:** Freshness requirement determines ingestion path. Define this before designing the pipeline.
