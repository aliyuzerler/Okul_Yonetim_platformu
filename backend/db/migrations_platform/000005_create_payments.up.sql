-- One row per payment or payment attempt. For monthly plans this is written
-- by the iyzico subscription webhook; for annual plans by the checkout-form
-- result. Amounts are kuruş. iyzi_* columns hold provider references needed
-- to reconcile against the iyzico merchant panel.
CREATE TABLE platform_payments (
    id                  UUID        PRIMARY KEY,
    tenant_id           UUID        NOT NULL REFERENCES platform_tenants (id) ON DELETE CASCADE,
    subscription_id     UUID        REFERENCES platform_subscriptions (id) ON DELETE SET NULL,
    billing_cycle       VARCHAR(16) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    amount_kurus        BIGINT      NOT NULL CHECK (amount_kurus >= 0),
    currency            VARCHAR(8)  NOT NULL DEFAULT 'TRY',
    status              VARCHAR(16) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'succeeded', 'failed')),
    failure_reason      TEXT,
    iyzico_token        VARCHAR(128),
    iyzico_payment_id   VARCHAR(128),
    iyzico_conversation_id VARCHAR(128),
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_payments_tenant ON platform_payments (tenant_id);
CREATE INDEX idx_platform_payments_status ON platform_payments (status);
CREATE INDEX idx_platform_payments_token ON platform_payments (iyzico_token);
