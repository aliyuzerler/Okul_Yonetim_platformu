# 0011. SaaS platform: separate control plane, school-instance based delivery

**Status:** Accepted

## Context

OpenSchool started as a self-hostable, single-tenant school platform: one
deployment serves one school, identities live in the school's own ThunderID
instance (ADR 0001). To earn subscription revenue the project needs a
commercial layer: school sign-up (kayıt olma), a 14-day trial, iyzico
payments and a platform-owner (super admin) panel.

Two delivery models were considered:

- **Shared multi-tenancy** — one deployment serves every school, with
  `tenant_id` scoping through all 21 modules and 57 migrations. Highest
  long-term density, but a sweeping refactor of a production-grade codebase
  (authorization, caching, audit, every query) with a large regression risk.
- **Instance per school ("kurulum bazlı")** — the school API stays
  single-tenant; a new *control plane* owns the commercial relationship and
  provisions one school instance per customer.

## Decision

Adopt the **instance-per-school** model and add a **separate control-plane
service** inside the same repository and Go module:

- `cmd/platform` — the control plane binary. Own database (`PLATFORM_DB_*`),
  own port, own migration set (`db/migrations_platform`). Never deployed on
  a school instance.
- `internal/platform/*` — control-plane code, mirroring the module layout of
  the school API (`auth`, `billing`, `admin`, `iyzico`, `authx`, `models`,
  `platformapp`). Reuses shared infrastructure: `mailer`, `middleware`,
  `apierror`, `httpx`, `database.Connect` tuning.
- The school instance binary (`cmd/api`) is unchanged in this phase; in a
  later phase it gains an optional license/access-state check against the
  control plane (see "Consequences").

Control-plane data model (own database):

| Table | Purpose |
| --- | --- |
| `platform_plans` | Tier catalog: Başlangıç (≤250), Standart (≤750), Kurumsal (unlimited); monthly + annual prices in kuruş |
| `platform_tenants` | One row per customer school, with status (`pending_verification → trial → active → past_due → expired → cancelled`) and computed `access_state` |
| `platform_users` | Local accounts (PBKDF2-SHA256), roles `tenant_admin` / `super_admin` |
| `platform_subscriptions` | One live subscription per tenant (partial unique index), iyzico references |
| `platform_payments` | Ledger of every payment/attempt with iyzico reconciliation ids |
| `platform_email_tokens` | Single-use, hash-only tokens (email verification, password reset) — ADR 0005 discipline |
| `platform_events` | Append-only lifecycle log the admin panel reasons from |

Why local platform accounts instead of ThunderID: the control plane must run
**before and independent of** any school's IdP. It is the bootstrap of the
business, not a tenant of it.

Why hand-written pgx queries instead of sqlc: the platform query surface is
small and the module must compile without regenerating sqlc artifacts;
migrating to sqlc later is mechanical if it grows.

## Consequences

- **Scaling per customer is trivially isolated**: one school = one instance;
  noisy neighbours, per-school backups and data export/erasure follow host
  boundaries. KVKK data-subject erasure becomes a per-instance operation.
- **Provisioning is still manual/semi-automated** at this phase: the control
  plane records tenant state, but starting a school instance (DB + API +
  static frontend + ThunderID) needs a worker. Until that lands (Faz 4),
  activation is done by the operator; `platform_events` records the intent.
- **The school instance is not yet tenant-aware**, so nothing stops an
  unlicensed instance from running. The access_state contract
  (`ok / read_only / locked`, ADR 0012) is designed so the school API can
  poll `GET /platform/v1/billing/subscription` (or a signed JWT license
  token) and degrade gracefully; wiring that is Faz 3.
- **Two migration sets** now exist. They must never share a database; the
  platform binary only runs `migrations_platform`.
