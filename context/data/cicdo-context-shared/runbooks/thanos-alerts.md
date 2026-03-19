---
description: "Runbook for Thanos alerts. Covers receiver replication failures, pod crashes, component sync issues."
domain: monitoring
---

# Thanos Alerts Runbook

## Alert: Thanos Receive High Replication Failures

**Symptom**: Thanos receiver router pods crashing/restarting, or insufficient thanos-receiver pods. Replication factor violated (minimum 3 pods required).

**Diagnosis**:
1. Check thanos-receiver pods (router and ingestor):
   ```
   kubectl get pods -n observability-cluster -l app=thanos-receiver
   ```
2. Look for restarts/crashes:
   ```
   kubectl describe pod <pod-name> -n observability-cluster
   ```
3. Check pod logs:
   ```
   kubectl logs <pod-name> -n observability-cluster
   ```

**Resolution**:
1. If crash-looping: check resource limits, OOM kills, config errors in logs
2. Scale up thanos-receiver pods to meet replication factor of 3
3. Verify networking between receiver components
4. Check Thanos query endpoint availability

**Escalation**: If receiver pods won't stabilize, check underlying node health and PVC status.
