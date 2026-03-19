---
description: "Runbook for GCP persistent disk IOPS/throughput scaling. Use when disk I/O utilization alerts fire (>80-90%)."
domain: monitoring, logging
---

# Disk IOPS Increase Runbook

## Thresholds
- Disk I/O utilization above 80-90%
- Write IOPS below 1.5k-3k baseline
- Read IOPS below 3k-5k baseline
- Write throughput below 250MB baseline
- Read throughput below 100MB baseline

## Diagnosis
1. Check Grafana Disk IOPS and I/O Usage panels
2. `gcloud compute disks describe <disk-name> --zone=<zone> --impersonate-service-account=<sa>`

## Resolution
1. `gcloud compute disks update <disk-name> --zone=<zone> --provisioned-iops=<new-value> --impersonate-service-account=<sa>`
2. Update disk throughput if needed
3. Monitor Grafana before/after
4. Apply to both prod and stable GCP projects
