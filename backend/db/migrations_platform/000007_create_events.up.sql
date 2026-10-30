-- Append-only lifecycle log for the control plane: registration, email
-- verification, trial start, payments, provider webhooks, manual operator
-- overrides. This is what the super-admin tenant detail view (and later,
-- support) reasons from.
CREATE TABLE platform_events (
    id          UUID        PRIMARY KEY,
    tenant_id   UUID        REFERENCES platform_tenants (id) ON DELETE CASCADE,
    event_type  VARCHAR(64) NOT NULL,
    data        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    actor       VARCHAR(64) NOT NULL DEFAULT 'system',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_events_tenant ON platform_events (tenant_id, created_at DESC);
CREATE INDEX idx_platform_events_type ON platform_events (event_type);
