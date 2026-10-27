-- Push notifications (ADR 0010): Expo push tokens registered by the mobile
-- app, one row per (user, device). In-app notifications stay the source of
-- truth; every enabled token of a recipient is also fanned out through the
-- Expo push gateway, and tokens Expo reports as no longer registered are
-- pruned (disabled, not deleted, so a re-registering device flips back on).
CREATE TABLE push_tokens (
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token        VARCHAR(128) NOT NULL,
    platform     VARCHAR(10)  NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, token)
);

-- Pruning dead tokens matches on the token alone, without knowing the owner.
CREATE INDEX idx_push_tokens_token ON push_tokens (token);
