-- name: UpsertPushToken :one
-- Registering a token refreshes its platform and re-enables it (a device
-- that signed out and back in flips its pruned token back on).
INSERT INTO push_tokens (user_id, token, platform, enabled)
VALUES ($1, $2, $3, TRUE)
ON CONFLICT (user_id, token) DO UPDATE
SET platform = EXCLUDED.platform, enabled = TRUE, updated_at = NOW()
RETURNING *;

-- name: DisablePushToken :execrows
-- The mobile app unregisters its own token on sign-out; the row is kept
-- disabled so nothing is sent to it until the device registers again.
UPDATE push_tokens
SET enabled = FALSE, updated_at = NOW()
WHERE user_id = $1 AND token = $2;

-- name: ListMyPushTokens :many
SELECT * FROM push_tokens
WHERE user_id = $1
ORDER BY created_at DESC, token;

-- name: ListEnabledPushTokensByUsers :many
-- Batch fan-out: every enabled token owned by the given recipients.
SELECT user_id, token, platform
FROM push_tokens
WHERE enabled AND user_id = ANY(sqlc.arg(user_ids)::uuid[]);

-- name: PrunePushTokens :execrows
-- DeviceNotRegistered budama: Expo rejected these tokens, so stop sending
-- to them until the devices register again.
UPDATE push_tokens
SET enabled = FALSE, updated_at = NOW()
WHERE enabled AND token = ANY(sqlc.arg(tokens)::text[]);
