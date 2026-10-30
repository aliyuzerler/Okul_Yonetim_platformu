-- One row per customer school. The platform is the source of truth for the
-- commercial relationship; the school instance itself stays single-tenant
-- (docs/adr/0011) and is provisioned once the subscription allows it.
--
-- status lifecycle:
--   pending_verification  owner registered, verification email not yet confirmed
--   trial                 email verified, 14-day trial running
--   active                paid subscription running (monthly auto-renew or annual one-shot)
--   past_due              latest renewal payment failed
--   expired               trial or paid period ended without a successful payment
--   cancelled             tenant or platform operator ended the agreement
CREATE TABLE platform_tenants (
    id                  UUID         PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(64)  NOT NULL UNIQUE,
    city                VARCHAR(128) NOT NULL DEFAULT '',
    phone               VARCHAR(32)  NOT NULL DEFAULT '',
    contact_name        VARCHAR(255) NOT NULL DEFAULT '',
    -- plan the school chose at registration; the trial runs on it and the
    -- checkout page preselects it.
    selected_plan_id    UUID         REFERENCES platform_plans (id),
    status              VARCHAR(32)  NOT NULL DEFAULT 'pending_verification'
                        CHECK (status IN ('pending_verification', 'trial', 'active', 'past_due', 'expired', 'cancelled')),
    trial_ends_at       TIMESTAMPTZ,
    access_state        VARCHAR(16)  NOT NULL DEFAULT 'ok' CHECK (access_state IN ('ok', 'read_only', 'locked')),
    access_changed_at   TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_tenants_status ON platform_tenants (status);
