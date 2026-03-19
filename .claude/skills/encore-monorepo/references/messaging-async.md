# Messaging & Async Communication

## Encore Pub/Sub

- **27 topics** with **30+ subscription handlers** across 78 TS services
- Topics include: `deal-lifecycle`, `sf-webhook-events`, `notification-dispatch`, `order-events`, `merchant-updates`, and others
- At-least-once delivery with automatic retries
- No configurable DLQ sink after max retries — failed messages are dropped silently
- No schema registry — any service can publish a payload change that breaks downstream subscribers

## MBus Bridges (Kafka → Encore Pub/Sub)

Three bridge services translate between legacy Kafka (MBus) and Encore Pub/Sub:

1. **`mbus-bridge-deal-sync`** — bridges deal lifecycle events
2. **`mbus-bridge-sf-events`** — bridges Salesforce webhook callbacks
3. **`mbus-bridge-notifications`** — bridges notification triggers

Located under `apps/encore-ts/mbus-bridge-*/`

**These are migration artifacts** — they exist because legacy consumers still read from Kafka. Each bridge should be decommissioned as consumers migrate to native Encore Pub/Sub.

**CRITICAL: EMEA bridges disabled** — all three bridges only operate in the US region. EMEA deal events, SF callbacks, and notifications are silently dropped. No consumer for EMEA Kafka partitions.

**Bridge failure handling**: Failed bridge publishes are logged but not queued. No error capture path for bridge failures.

## Kafka (Legacy MBus)

- Legacy messaging system being migrated away from
- Still has active topics and consumer groups
- No documented inventory of active Kafka topics or consumer group lifecycle
- As services migrate, orphaned topics and zombie consumer groups accumulate
- Kafka topics related to metrics: `metrics_aggregates`, `metrics_v2_histograms` (part of Thanos/CLAM pipeline)

## Temporal Workflows

- Temporal workflow engine runs alongside Encore services
- Used for long-running business processes
- Interacts with Encore services via HTTP calls
- Separate infrastructure from Encore (not Encore-managed)
- No documented migration path (stays as permanent sidecar or gets replaced by Encore-native primitives)

## Dead Letter Queue (DLQ) — DOES NOT EXIST

**This is a critical gap.** The architecture has:
- No DLQ sink for any of the 27 Pub/Sub topics
- No monitoring of message failures
- No replay mechanism for failed messages
- No poison message detection
- No equivalent of the GDS DLQ dashboards and replay tooling

When a subscriber fails to process a message (transient errors, schema mismatches, downstream outages), the message is retried and then silently lost.

## Async Communication Risks

1. **No schema registry**: payload changes break subscribers silently
2. **No DLQ**: failed messages across 27 topics lost forever
3. **EMEA bridge gap**: entire EU region has no event propagation
4. **Bridge observability**: no health metrics for bridge lag, throughput, or consumer group offset drift
5. **No topic lifecycle governance**: no process for creating, deprecating, or decommissioning Kafka topics
