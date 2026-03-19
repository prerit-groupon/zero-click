# Monitoring, Logging & Tracing

## Current State Summary

| Layer | TS/Go Services (Encore) | Python Services | Status |
|-------|------------------------|-----------------|--------|
| Metrics | Encore built-in (basic) | None | Partial |
| Alerting | None configured | None | GAP |
| Logging | Encore structured logs | Unstructured / varies | Partial |
| Log aggregation | OpenSearch + Fluent Bit | OpenSearch + Fluent Bit | Partial |
| Distributed tracing | Encore built-in (per-service) | None | GAP |
| LLM tracing | N/A | Langfuse | Partial |
| Dashboards | Encore dashboard | None | Partial |
| Custom dashboards | None (Grafana not configured) | None | GAP |
| On-call | Jarvis (disconnected from service ownership) | Jarvis | Partial |

## Monitoring

### Encore Built-in Metrics
- Encore provides automatic metrics for TS/Go services: request rate, latency, error rate
- Available at `app.encore.cloud/groupon-encore-83x2/envs/prod-us-central1/flow`
- Limited customization — no custom metric emission, no custom labels
- No alerting layer on top of metrics (Encore Roadmap: P1 must, Gap)

### Python Services — No Metrics
- The 16 Python AI services running behind nginx in a single container have:
  - No Prometheus `/metrics` endpoint
  - No request-level instrumentation
  - No per-service resource tracking (CPU, memory per service vs. per container)
  - Container could be OOMing on one service while others look fine — no way to tell which

### Cloud Infrastructure Metrics
- GCP Cloud Monitoring provides basic resource metrics (CPU, memory, network) for Cloud SQL, Memorystore
- No custom dashboards tracking capacity trends
- No proactive alerting on Cloud SQL connection count, Memorystore memory utilization, Droplet saturation

### Alerting — DOES NOT EXIST
- No alerting standard across any services
- No golden signal alerts (latency, traffic, errors, saturation)
- No default alert templates
- No escalation paths defined
- Encore Roadmap confirms this as P1 must Gap: "Encore has metrics. Gap: entire alerting layer"
- Golden signal monitoring pending final approval from Ales on integration approach

## Logging

### OpenSearch + Fluent Bit
- Centralized log aggregation exists
- Fluent Bit collects logs from services and ships to OpenSearch
- OpenSearch provides search and visualization

### Known Gaps
- **No structured logging standard**: TS, Go, and Python services log in different formats
- **No shared field schema**: no consistent timestamp, service name, trace ID, severity, request ID, environment fields across runtimes
- **No PII scrubbing**: Fluent Bit pipeline has no sanitization filters — merchant data, deal data, SF payloads, AI model inputs/outputs likely contain sensitive data being logged
- **No log retention policy**: unclear how long logs are retained, no tiered retention (hot/warm/cold)
- **No log-based alerting**: no OpenSearch alert rules for critical error patterns
- **No RBAC on OpenSearch**: unclear who has access, no role-based index permissions
- **Correlating logs across services during incidents is manual grep work**

### Recommended Log Schema
```json
{
  "timestamp": "ISO 8601",
  "service": "service-name",
  "environment": "prod|staging|preview",
  "severity": "DEBUG|INFO|WARN|ERROR|FATAL",
  "trace_id": "W3C traceparent",
  "request_id": "unique request identifier",
  "message": "log message",
  "metadata": {}
}
```

## Tracing

### Distributed Tracing — DOES NOT EXIST (CRITICAL GAP)

This is the single biggest observability gap. A request flowing from frontend → Encore TS service → MBus bridge → Kafka → Python AI service → Cloud SQL is completely opaque end-to-end.

- No OpenTelemetry instrumentation
- No trace context propagation (W3C `traceparent` header)
- No cross-service trace correlation
- Encore provides per-service tracing for TS/Go, but traces don't span across service boundaries to non-Encore services
- Debugging cross-service issues is guesswork

### Langfuse (LLM Tracing Only)
- Used exclusively for the Python AI services
- Traces LLM calls: model inputs, outputs, token usage, latency
- Creates a tracing silo — AI traces live in Langfuse while everything else has no traces
- Decision needed: expand to general tracing (unlikely — Langfuse is LLM-focused) or adopt OpenTelemetry and integrate Langfuse as specialized LLM view within broader traces

### Encore Built-in Tracing
- Encore provides distributed tracing for its managed TS/Go services
- Encore Roadmap notes: "Encore has built-in distributed tracing with automatic instrumentation and daily-monthly budgets for sampling"
- However: this only covers Encore-managed services, not Python services or external dependencies
- Roadmap comment: "We might need more awareness and enablement on the service teams side"

## On-Call

- Jarvis at `jarvis.groupondev.com/oncall/` provides on-call rotation
- Disconnected from service ownership — rotations exist at team level but not mapped to specific services
- Recent incidents: on-call staff on leave, team forgot to update rota, Jarvis showed unavailable person
- No PagerDuty/Opsgenie integration with Workday leave calendar
- No automatic reassignment when primary on-call is on PTO

## Thanos / Telegraf / CLAM

Groupon operates a separate metrics infrastructure for the broader organization:
- **Thanos**: distributed Prometheus stack (Receiver, Store, Query, Query Frontend, Compact, Rule)
- **Telegraf**: metrics collection agent and gateway
- **CLAM**: Cluster Aggregator for Metrics
- **Kafka topics**: `metrics_aggregates`, `metrics_v2_histograms`

This is the legacy/organization-wide metrics stack. The Encore Roadmap notes that SRE "might be able to better integrate [golden signals] into the current stack" — indicating a need to bridge Encore metrics with the Thanos pipeline. See the `/observability` skill for detailed Thanos architecture.
