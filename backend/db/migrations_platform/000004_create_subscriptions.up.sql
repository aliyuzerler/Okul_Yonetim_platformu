-- The commercial state of one school. A tenant has at most one live
-- subscription enforced with a partial unique index; terminal rows
-- (expired/cancelled) are kept as history.
--
-- billing_cycle: 'monthly' runs on the iyzico Subscription API (card stored
-- by iyzico, auto-renewal); 'annual' is a one-shot checkout-form payment per
-- period (docs/adr/0012).
CREATE TABLE platform_subscriptions (
    id                    UUID        PRIMARY KEY,
    tenant_id             UUID        NOT NULL REFERENCES platform_tenants (id) ON DELETE CASCADE,
    plan_id               UUID        NOT NULL REFERENCES platform_plans (id),
    status                VARCHAR(32) NOT NULL
                          CHECK (status IN ('trialing', 'active', 'past_due', 'expired', 'cancelled')),
    billing_cycle         VARCHAR(16) CHECK (billing_cycle IN ('monthly', 'annual')),
    trial_ends_at         TIMESTAMPTZ,
    current_period_start  TIMESTAMPTZ,
    current_period_end    TIMESTAMPTZ,
    cancel_at_period_end  BOOLEAN     NOT NULL DEFAULT FALSE,
    -- iyzico references for the recurring (monthly) subscription, when one exists.
    iyzico_customer_ref   VARCHAR(128),
    iyzico_product_ref    VARCHAR(128),
    iyzico_subscription_ref VARCHAR(128),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_subscriptions_tenant ON platform_subscriptions (tenant_id);
CREATE INDEX idx_platform_subscriptions_status ON platform_subscriptions (status);

-- Only one live subscription per tenant; historical rows are exempt.
CREATE UNIQUE INDEX uq_platform_subscriptions_live
    ON platform_subscriptions (tenant_id)
    WHERE status IN ('trialing', 'active', 'past_due');
