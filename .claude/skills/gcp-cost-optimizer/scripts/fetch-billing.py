#!/usr/bin/env python3
"""
GCP Billing Export Fetcher — Groupon FinOps
Fetches daily cost breakdown from the BigQuery billing export.

Usage:
  python scripts/fetch-billing.py --days 7
  python scripts/fetch-billing.py --project prj-grp-conveyor-prod-8dde --days 1

Requirements:
  pip install google-cloud-bigquery python-dotenv

Credentials:
  Copy tools/gcp-billing/.env.example → tools/gcp-billing/.env and fill in values.
  Service account: grpn-sa-billing-cost-mgmt@prj-grp-central-sa-prod-0b25.iam.gserviceaccount.com
  Required roles: bigquery.jobs.create, bigquery.tables.getData
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load credentials from tools/gcp-billing/.env
env_path = os.path.join(os.path.dirname(__file__), "../../../tools/gcp-billing/.env")
load_dotenv(env_path)

# Config
BILLING_PROJECT = os.getenv("BILLING_PROJECT", "prj-grp-central-billing-0b25")
BILLING_DATASET = os.getenv("BILLING_DATASET", "all_billing_data")
BILLING_TABLE = os.getenv("BILLING_TABLE", "gcp_billing_export_v1_GRPN_billing")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if GOOGLE_APPLICATION_CREDENTIALS:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GOOGLE_APPLICATION_CREDENTIALS


def fetch_daily_costs(days: int = 7, project_filter: str = None) -> list[dict]:
    """
    Fetch daily cost breakdown from BigQuery billing export.
    Returns list of {date, project, service, sku, cost, currency}.
    """
    try:
        from google.cloud import bigquery
    except ImportError:
        print("ERROR: google-cloud-bigquery not installed. Run: pip install google-cloud-bigquery")
        sys.exit(1)

    client = bigquery.Client(project=BILLING_PROJECT)

    project_clause = f"AND project.id = '{project_filter}'" if project_filter else ""
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    query = f"""
    SELECT
        DATE(usage_start_time) AS date,
        project.id AS project_id,
        project.name AS project_name,
        service.description AS service,
        sku.description AS sku,
        ROUND(SUM(cost), 2) AS cost,
        currency
    FROM
        `{BILLING_PROJECT}.{BILLING_DATASET}.{BILLING_TABLE}`
    WHERE
        DATE(usage_start_time) >= '{start_date}'
        AND cost > 0
        {project_clause}
    GROUP BY
        date, project_id, project_name, service, sku, currency
    ORDER BY
        date DESC, cost DESC
    """

    print(f"Fetching costs from {start_date} to today ({BILLING_PROJECT}.{BILLING_DATASET})...")
    results = []
    try:
        rows = client.query(query).result()
        for row in rows:
            results.append({
                "date": str(row.date),
                "project_id": row.project_id,
                "project_name": row.project_name,
                "service": row.service,
                "sku": row.sku,
                "cost": float(row.cost),
                "currency": row.currency,
            })
    except Exception as e:
        print(f"ERROR: BigQuery query failed: {e}")
        sys.exit(1)

    return results


def summarize_by_project(rows: list[dict]) -> dict:
    """Aggregate costs by project."""
    totals = {}
    for row in rows:
        pid = row["project_id"]
        if pid not in totals:
            totals[pid] = {"project_name": row["project_name"], "total": 0.0, "currency": row["currency"]}
        totals[pid]["total"] += row["cost"]
    return dict(sorted(totals.items(), key=lambda x: x[1]["total"], reverse=True))


def summarize_by_service(rows: list[dict]) -> dict:
    """Aggregate costs by GCP service."""
    totals = {}
    for row in rows:
        svc = row["service"]
        if svc not in totals:
            totals[svc] = 0.0
        totals[svc] += row["cost"]
    return dict(sorted(totals.items(), key=lambda x: x[1], reverse=True))


def detect_anomalies(rows: list[dict], threshold_pct: float = 0.20) -> list[dict]:
    """
    Detect projects/services with cost swing > threshold_pct vs 7-day average.
    Returns list of anomalies with actual vs expected cost and % change.
    """
    from collections import defaultdict

    # Group by project+service+date
    daily = defaultdict(lambda: defaultdict(float))
    for row in rows:
        key = f"{row['project_id']}|{row['service']}"
        daily[key][row["date"]] += row["cost"]

    anomalies = []
    dates = sorted(set(r["date"] for r in rows), reverse=True)
    if len(dates) < 2:
        return anomalies

    latest_date = dates[0]
    prior_dates = dates[1:]

    for key, date_costs in daily.items():
        latest_cost = date_costs.get(latest_date, 0)
        avg_prior = sum(date_costs.get(d, 0) for d in prior_dates) / len(prior_dates) if prior_dates else 0

        if avg_prior > 0 and latest_cost > 0:
            pct_change = (latest_cost - avg_prior) / avg_prior
            if abs(pct_change) > threshold_pct:
                project_id, service = key.split("|", 1)
                anomalies.append({
                    "project_id": project_id,
                    "service": service,
                    "latest_date": latest_date,
                    "latest_cost": round(latest_cost, 2),
                    "avg_prior": round(avg_prior, 2),
                    "pct_change": round(pct_change * 100, 1),
                })

    return sorted(anomalies, key=lambda x: abs(x["pct_change"]), reverse=True)


def print_report(rows: list[dict], days: int) -> None:
    """Print a structured cost digest."""
    if not rows:
        print("No billing data found for the requested period.")
        return

    total_cost = round(sum(r["cost"] for r in rows), 2)
    currency = rows[0]["currency"] if rows else "USD"

    print(f"\n{'='*60}")
    print(f"GCP BILLING DIGEST — last {days} days")
    print(f"Total spend: {total_cost:,.2f} {currency}")
    print(f"{'='*60}\n")

    print("TOP PROJECTS BY COST:")
    by_project = summarize_by_project(rows)
    for pid, info in list(by_project.items())[:10]:
        print(f"  {pid:<45} {info['total']:>10,.2f} {info['currency']}")

    print("\nTOP GCP SERVICES BY COST:")
    by_service = summarize_by_service(rows)
    for svc, cost in list(by_service.items())[:10]:
        print(f"  {svc:<45} {cost:>10,.2f} {currency}")

    print("\nCOST ANOMALIES (>20% swing vs prior average):")
    anomalies = detect_anomalies(rows)
    if anomalies:
        for a in anomalies[:10]:
            direction = "SPIKE" if a["pct_change"] > 0 else "DROP"
            print(f"  [{direction}] {a['project_id']} / {a['service']}")
            print(f"         {a['latest_date']}: {a['latest_cost']:.2f} vs avg {a['avg_prior']:.2f} ({a['pct_change']:+.1f}%)")
    else:
        print("  No anomalies detected.")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch GCP billing data from BigQuery export")
    parser.add_argument("--days", type=int, default=7, help="Number of days to fetch (default: 7)")
    parser.add_argument("--project", type=str, default=None, help="Filter to a specific GCP project ID")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of formatted report")
    args = parser.parse_args()

    rows = fetch_daily_costs(days=args.days, project_filter=args.project)

    if args.json:
        import json
        print(json.dumps(rows, indent=2, default=str))
    else:
        print_report(rows, args.days)
