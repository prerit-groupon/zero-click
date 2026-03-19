# Cloudability by IBM — API Reference

> Add your API token to `tools/cloudability/.env` when available.
> Generate at: https://app.cloudability.com/settings/api

---

## Authentication

All requests use Bearer token auth:

```
Authorization: Bearer <CLOUDABILITY_API_TOKEN>
Content-Type: application/json
```

Base URL: `https://api.cloudability.com`

---

## Key Endpoints

### GET /v3/accounts

List all linked cloud accounts (GCP projects, AWS accounts).

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.cloudability.com/v3/accounts
```

Response fields:
- `vendor` — `AWS`, `GCP`, `Azure`
- `vendor_account_identifier` — GCP project ID or AWS account ID
- `vendor_account_name` — Human-readable name
- `status` — `enabled` / `disabled`

---

### GET /v3/reporting/cost/run

Flexible cost reporting — the primary data source for the daily digest.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudability.com/v3/reporting/cost/run?\
start_date=2026-03-12&\
end_date=2026-03-12&\
dimensions=vendor,vendor_account_identifier,vendor_account_name,service_name,region_name,date&\
metrics=unblended_cost,amortized_cost,net_amortized_cost&\
sort=-unblended_cost&\
limit=500"
```

**Key dimensions:**

| Dimension | Description |
|-----------|-------------|
| `vendor` | Cloud provider: AWS, GCP, Azure |
| `vendor_account_identifier` | GCP project ID / AWS account ID |
| `vendor_account_name` | Human-readable account name |
| `service_name` | GCP service or AWS service |
| `region_name` | Region (e.g. us-central1, us-east-1) |
| `date` | Usage date YYYY-MM-DD |
| `tag:team` | Custom team tag (if applied in cloud console) |
| `tag:environment` | e.g. prod, staging |

**Key metrics:**

| Metric | Description |
|--------|-------------|
| `unblended_cost` | Gross cost before any discounts |
| `amortized_cost` | Cost with CUD/RI amortised upfront fees spread |
| `net_amortized_cost` | Amortized cost after all credits and refunds |
| `on_demand_cost` | Cost at on-demand rates (no discounts) |
| `savings` | Discount savings vs on-demand |

**Filters (optional):**

| Filter | Example |
|--------|---------|
| `vendor=GCP` | GCP only |
| `vendor=AWS` | AWS only |
| `vendor=GCP,AWS` | Multi-cloud |
| `tag:environment=prod` | Filter by tag value |

---

### GET /v3/reporting/cost/dimensions

List all available dimensions for a given date range.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudability.com/v3/reporting/cost/dimensions?start_date=2026-03-01&end_date=2026-03-12"
```

---

### GET /v3/reporting/cost/metrics

List all available metrics.

---

### GET /v3/budgets

List all configured budgets.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.cloudability.com/v3/budgets
```

---

### POST /v3/alerts

Create cost anomaly alerts (if not using the skill's built-in anomaly detection).

---

## Pagination

Results are paginated. Use `limit` and `offset`:

```
?limit=500&offset=0
?limit=500&offset=500
```

The response includes `pagination.total` to know total record count.

---

## Rate Limits

- 60 requests/minute per token
- For large date ranges, use daily granularity + offset pagination

---

## Groupon-Specific Dimensions

Once the API token is connected, confirm which custom tags are applied:

```bash
node tools/cloudability/fetch-costs.js --mode accounts
```

Expected Groupon GCP project IDs:
- `prj-grp-conveyor-prod`
- `prj-grp-conveyor-stable`
- `prj-grp-janus-prod`
- `prj-grp-ingestion-prod`
- `prj-grp-pipelines-prod`
- `prj-grp-data-comp-prod`
- `prj-grp-mta-net-prod`
- `prj-grp-tableau-prod`

---

## Cloudability Documentation

- Full API reference: https://help.apptio.com/en-us/cloudability/api/v3/
- Authentication guide: https://help.apptio.com/en-us/cloudability/api/v3/authentication
- Reporting API guide: https://help.apptio.com/en-us/cloudability/api/v3/reporting
