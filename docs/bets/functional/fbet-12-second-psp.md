# Functional Bet 12: 2nd Payment Service Provider

> **Type:** Functional Bet
> **Org:** Finance
> **Sponsor:** Jiri Ponrt
> **DRI:** Bartłomiej Gmur

---

## Goal

Improve authorization performance, lower cost, and eliminate dependency on a single PSP —
while enabling AI-driven checkout, embedded experiences, and future payment methods without
disruption.

---

## Summary

This bet reduces payment risk, lifts conversion, and prepares Groupon for AI-driven checkout
by introducing a dual-PSP architecture with a PSP-agnostic token vault. The aim: payments
stay up, get faster, and scale without re-integration.

Guided by GROW², the team is:

- Enabling dual-PSP routing & automatic failover under 60 seconds
- Building a unified token vault for consistent refunds & reconciliation
- Benchmarking PSPs (Stripe, Checkout.com, Nuvei, Worldpay) vs Adyen
- Preparing architecture to support 3+ PSPs/APMs across markets
- Defining data-driven routing (by BIN, region, success rate, cost)

---

## Links

- [Back to Functional Bets](index.md)
- [processes.md](../../processes.md)
