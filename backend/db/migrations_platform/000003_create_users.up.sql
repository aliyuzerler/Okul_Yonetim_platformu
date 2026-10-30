-- Platform accounts: tenant owners (role 'tenant_admin') and platform staff
-- (role 'super_admin'). Unlike school-instance users (which live in ThunderID
-- per ADR 0001), platform users are local, because the control plane must run
-- before — and independently of — any school instance or IdP deployment.
--
-- Passwords are PBKDF2-HMAC-SHA256 (crypto/pbkdf2, FIPS 140-3) with a random
-- 16-byte salt, stored as "pbkdf2$<iterations>$<salt_b64>$<hash_b64>".
-- tenant_id is NULL for super admins.
CREATE TABLE platform_users (
    id                UUID         PRIMARY KEY,
    tenant_id         UUID         REFERENCES platform_tenants (id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL UNIQUE,
    full_name         VARCHAR(255) NOT NULL DEFAULT '',
    password_hash     VARCHAR(255) NOT NULL,
    role              VARCHAR(32)  NOT NULL CHECK (role IN ('super_admin', 'tenant_admin')),
    email_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
    status            VARCHAR(16)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_users_tenant ON platform_users (tenant_id);
