---
description: "Known failure patterns for Monitoring domain (Thanos, CLAM, Telegraf, Grafana). Update this every time you discover a new gotcha."
domain: monitoring
---

# Monitoring Gotchas

## Thanos

- **Replication factor**: Thanos receiver needs minimum 3 pods. If any restart, replication alerts fire immediately. Don't panic — check if pods are recovering.
- **Open file descriptors**: Thanos Store can hit fd limits silently, causing query timeouts without clear errors. Check `ulimit` and container limits.
- **Query Frontend caching**: Stale query cache can return outdated data after compaction. Clear cache if dashboards show data gaps that don't match Store.
- **Compact race conditions**: Running multiple Compact instances against the same bucket corrupts data. Only one Compact per bucket.

## CLAM

- **MSK maintenance rebalancing**: During Kafka MSK maintenance, CLAM rebalances consumers. This causes 10-30 min metric gaps. Not a CLAM bug — wait it out.
- **Memory pressure**: CLAM aggregation rules that group by high-cardinality labels cause OOM. Check label cardinality before adding new aggregation rules.

## Telegraf

- **Config changes need rolling restart**: Telegraf doesn't hot-reload config. Must restart agents/gateways for changes to take effect.
- **Silent metric drops**: If Telegraf can't reach Kafka, it drops metrics silently (no alert by default). Check Telegraf internal metrics for output errors.

## Grafana

- **Alert rule evaluation**: Grafana alert rules evaluate on a fixed interval. If the data source is slow, alerts may fire late or miss short spikes.
- **Dashboard provisioning**: Terraform-managed dashboards are overwritten on apply. Manual edits in Grafana UI will be lost.
