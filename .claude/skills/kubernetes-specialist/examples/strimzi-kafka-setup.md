# Example: Strimzi Kafka Cluster on GKE

> Scenario: Setting up a Strimzi Kafka cluster on the Conveyor cluster's kafka-platform node pool.
> This is the correct approach for Kafka at Groupon — Strimzi on GKE, not self-hosted or MSK.

---

## Prerequisites

- Strimzi Operator installed in the `kafka` namespace (managed by CICDO)
- Node pool `kafka-platform` available: `e2-custom-12-65536`, 12 vCPU / 64 GB, taint `type=kafka-platform:NoSchedule`

---

## Step 1 — Verify Node Pool

```bash
kubectl get nodes -l cloud.google.com/gke-nodepool=kafka-platform
# Should show nodes with kafka-platform pool
```

---

## Step 2 — Kafka Cluster CRD

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: encore-events
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 3                   # minimum 3 for production HA
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      inter.broker.protocol.version: "3.6"
      log.retention.hours: 168    # 7 days default; override per topic
      log.retention.bytes: -1     # no size-based retention by default

    resources:
      requests:
        memory: 8Gi
        cpu: "2"
      limits:
        memory: 16Gi
        cpu: "4"

    storage:
      type: persistent-claim
      size: 200Gi
      class: standard-rwo         # GKE standard StorageClass (pd-standard)
      deleteClaim: false          # never delete PVCs when cluster is deleted

    # Target the kafka-platform node pool
    template:
      pod:
        tolerations:
          - key: "type"
            operator: "Equal"
            value: "kafka-platform"
            effect: "NoSchedule"
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: cloud.google.com/gke-nodepool
                      operator: In
                      values:
                        - kafka-platform
          # Spread brokers across zones
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchLabels:
                    strimzi.io/name: encore-events-kafka
                topologyKey: topology.kubernetes.io/zone

  zookeeper:
    replicas: 3
    resources:
      requests:
        memory: 2Gi
        cpu: "500m"
      limits:
        memory: 4Gi
        cpu: "1"
    storage:
      type: persistent-claim
      size: 20Gi
      class: standard-rwo
      deleteClaim: false
    template:
      pod:
        tolerations:
          - key: "type"
            operator: "Equal"
            value: "kafka-platform"
            effect: "NoSchedule"
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: cloud.google.com/gke-nodepool
                      operator: In
                      values:
                        - kafka-platform

  entityOperator:
    topicOperator: {}
    userOperator: {}
```

---

## Step 3 — Create a Topic

```yaml
# topic-deals-created.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: deals.created
  namespace: kafka
  labels:
    strimzi.io/cluster: encore-events
spec:
  partitions: 6               # sized for expected throughput; scale up later
  replicas: 3                 # must not exceed broker count
  config:
    retention.ms: "604800000" # 7 days (168h in ms)
    min.insync.replicas: "2"
    cleanup.policy: delete
```

---

## Step 4 — Apply and Verify

```bash
kubectl apply -f kafka-cluster.yaml -n kafka
kubectl apply -f topic-deals-created.yaml -n kafka

# Watch cluster come up (takes 2-3 minutes)
kubectl get kafka encore-events -n kafka -w

# Check all pods healthy
kubectl get pods -n kafka -l strimzi.io/cluster=encore-events

# Verify topic created
kubectl get kafkatopic deals.created -n kafka
```

---

## Step 5 — Encore Service Connection

Encore TypeScript services connect to Kafka via the Encore Topics abstraction (GCP Pub/Sub under the hood). For direct Kafka access from a non-Encore service on GKE:

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-consumer-service',
  brokers: [
    'encore-events-kafka-bootstrap.kafka.svc.cluster.local:9092'
  ],
  // For TLS listener (port 9093):
  // ssl: true,
  // sasl: { mechanism: 'tls', ... }
});

const consumer = kafka.consumer({ groupId: 'my-consumer-group' });

await consumer.connect();
await consumer.subscribe({ topic: 'deals.created', fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value!.toString());
    // handle event — must be idempotent (at-least-once delivery)
    await handleDealCreated(event);
  },
});
```

---

## Monitoring

The Strimzi cluster exposes JMX metrics consumed by Telegraf → CLAM → Thanos. Grafana dashboards for Kafka are available at:

```
https://prod-grafana.us-central1.logging.prod.gcp.groupondev.com
→ search: "Kafka"
```

Key metrics to watch:
- `kafka_consumer_group_lag` — consumer lag per topic/partition
- `kafka_server_replicamanager_underreplicatedpartitions` — should be 0
- `kafka_controller_activecontrollercount` — should be 1
