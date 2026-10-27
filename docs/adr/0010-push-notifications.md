# ADR 0010: Push notifications via the Expo push service

Status: accepted

## Context

In-app notifications (ADR 0004) are the single source of truth for
notifications, but they are only visible while a user has the app open. The
mobile app (parent and student panels) needs a second delivery channel so
guardians learn about absences and notices even when the app is closed.

We deliberately keep the platform surface small: no Firebase Cloud Messaging
project wiring inside the backend, no APNs certificates, no per-platform
token plumbing. The mobile app is built with Expo, and Expo operates a push
relay (`https://exp.host/--/api/v2/push/send`) that accepts a single
platform-agnostic message format and fans out to FCM (Android) and APNs
(iOS).

## Decision

- The backend stores **Expo push tokens** per user (`push_tokens` table:
  user, token, platform, enabled). Tokens are registered by the device
  through `POST /me/push-tokens`, listed via `GET /me/push-tokens`, and
  disabled (or pruned) via `DELETE /me/push-tokens`.
- The backend talks **only to the Expo push service** using a dependency-free
  `net/http` client: messages are batched in groups of 100, HTTP 429 is
  surfaced with its `Retry-After`, and tickets that report
  `DeviceNotRegistered` cause the token to be pruned (disabled) so the next
  send skips it.
- `NotificationService` gains an optional `PushSender`. `Create`,
  `SendDraft` and `SendDirect` hand recipient IDs to a detached goroutine
  with a 30-second timeout; push failures are logged, never propagated —
  the in-app notification is the source of truth and must not fail because
  the second channel did.
- Configuration comes from the environment only: `PUSH_ENABLED`,
  `EXPO_PUSH_BASE_URL`, `EXPO_PUSH_ACCESS_TOKEN`. With
  `PUSH_ENABLED=false` (the default) the sender is a no-op, which keeps
  local development and CI free of external calls.
- Expo push tokens are validated against the
  `ExponentPushToken[…]` shape before storage and are always masked in
  logs.

## Consequences

- One server-side secret (`EXPO_PUSH_ACCESS_TOKEN`) instead of one per
  platform; FCM/APNs credentials are uploaded to the Expo account, not the
  server (see `docs/MOBILE.tr.md` §5.2).
- Latency of the second channel is best-effort by design; the in-app inbox
  remains the correctness reference.
- If a future web client needs push, a new token platform value
  (`web`) is already allowed by the schema.
