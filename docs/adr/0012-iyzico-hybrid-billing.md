# 0012. iyzico billing: hybrid cycles, mock-first integration

**Status:** Accepted

## Context

The platform sells tiered subscriptions (ADR 0011) in Turkey, where iyzico
is a mainstream PSP for SaaS billing. Schools differ in budgeting: private
schools often prefer card-on-file monthly billing; public-adjacent
institutions pay from annual budgets. iyzico offers both shapes natively:

- **Subscription API** — product + pricing plan + customer; iyzico stores
  the card and charges every period automatically.
- **Checkout form payment** — one-shot 3D Secure payment; with
  `payWithRegistration` the card can be saved for later charges.

## Decision

Run a **hybrid billing model**, selectable per purchase:

- **Monthly** → iyzico *Subscription API*: initialize a subscription
  checkout form (`POST /v2/subscriptions/initialize/checkout-form`) with the
  plan's pricing-plan reference (mapped via `IYZICO_PP_<CODE>_MONTHLY`).
  iyzico owns the renewal clock; the platform listens to webhooks.
- **Annual** → one-shot *checkout form payment*
  (`POST /v2/payment/iyzipos/checkoutform/initialize/auth3d/ecom`) at the
  discounted annual price (seeded as 10× monthly: two months free), with
  `payWithRegistration: 1` so Faz 4 can offer saved-card renewal.

The subscription state machine on the platform side:

```
trialing ──checkout success──▶ active ──webhook failed──▶ past_due
   │                             │                            │
   └─trial ends (lazy)─▶ expired ◀──manual override──────────┘
 expired/cancelled ⇒ access_state locked, past_due ⇒ read_only
```

- `access_state` (`ok / read_only / locked`) is persisted on the tenant row
  and is the contract the school instance will consume in Faz 3: trial over
  or failed renewal → `read_only`; expired/cancelled → `locked`.
- Trial expiry is applied **lazily on read** (`Status`) so correctness never
  depends on a cron being alive.
- Every transition lands in `platform_events` for the admin panel.

Authentication follows iyzico REST v2: `Authorization: IYZWSv2 base64(apiKey:randomString:signature)`
with `signature = HMAC-SHA256(secretKey, randomString + uriPath + requestBody)`;
webhook signatures are `HMAC-SHA256(secretKey, secretKey + iyziEventToken)`.
The client is dependency-free (`net/http` + stdlib crypto), matching the
Expo push client precedent.

**Mock-first development:** `IYZICO_MODE=mock` (the default without
credentials) runs the identical state machine offline — checkout returns a
frontend URL, `POST /billing/mock/pay` settles it, webhooks are simulated.
The whole revenue flow is testable in CI with zero provider dependency.

## Consequences

- **Field names and endpoints follow docs.iyzipay.com as of writing, but
  the integration must be validated against real sandbox credentials before
  live mode** — response payload variations (e.g. between subscription and
  payment checkout results) are normalized defensively, and result
  retrieval tries both endpoints. `go test` pins the signature formats;
  they are not derived from an official test vector.
- **The buyer `ip` field is a placeholder** in the checkout payload; iyzico
  validates the shape, not reachability, but Faz 4 should pass the real
  request IP for fraud scoring.
- **Annual auto-renewal is deliberately out of scope** for this phase: the
  renewal reminder + saved-card charge lands in Faz 4; until then the
  annual customer receives a renewal reminder and pays through a fresh
  checkout link.
- **Prices live in the database** (seeded migration), never in code: raising
  prices is an UPDATE, not a release.
- **Refunds/chargebacks** are out of scope this phase; the payments ledger
  records provider ids needed to reconcile them later.
