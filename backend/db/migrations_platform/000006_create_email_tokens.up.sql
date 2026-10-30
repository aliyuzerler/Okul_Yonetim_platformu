-- One-time email tokens (email verification, password reset). Following the
-- same discipline as the school instance (ADR 0005): only a SHA-256 hash of
-- the token is stored, tokens are single-use and short-lived. The token is
-- delivered by email and never returned by an API response.
CREATE TABLE platform_email_tokens (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES platform_users (id) ON DELETE CASCADE,
    token_type  VARCHAR(32) NOT NULL CHECK (token_type IN ('email_verify', 'password_reset')),
    token_hash  CHAR(64)    NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_email_tokens_user ON platform_email_tokens (user_id, token_type);
