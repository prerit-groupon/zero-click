---
description: "Runbook for CLAM troubleshooting. Covers Kafka stream issues, metric abnormalities, pod failures, MSK maintenance."
domain: monitoring
---

# CLAM Troubleshooting Runbook

## Common Symptoms
- CLAM Kafka Stream metric abnormalities
- Conveyor Cloud Customer metrics issues (memory, CPU, network)
- CLAM pod failures or restarts
- MSK cluster maintenance events
- Metric ingestion delays/gaps

## Diagnosis Steps

1. **Check dashboards**: CLAM Kafka Stream dashboard in Wavefront; Conveyor Cloud Customer Metrics dashboard
2. **Check logs**: ELK logs under `metrics_clam` index; Pod internal logs: `var/groupon/logs/clam.log`
3. **Check pod status**: `kubectl get pods -l app=clam` and `kubectl describe pod <pod-name>`
4. **Exec into pod**: `kubectl exec -it <pod-name> -- cat /var/groupon/logs/clam.log`
5. **MSK maintenance**: Contact Kafka team to verify if maintenance is in progress (causes transient metric gaps during rebalancing, typically 10-30 min)

## Resolution
- Pod crash-loops: check resource limits, Kafka connectivity, config
- Metric gaps during MSK maintenance: wait for rebalancing (10-30 min)
- Sustained abnormalities: check CLAM aggregation rules and Kafka consumer lag
