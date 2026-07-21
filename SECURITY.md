# Security Notes

## Access model (SEC-18)

Every authenticated Clerk user is auto-provisioned as a **`teacher`** unless
their Clerk public metadata contains a recognized role. Admin access uses Clerk
`publicMetadata.role = "admin"` plus a custom session claim; it never relies on
the local database role or a hardcoded email/user ID.

The `/admin` layout and every admin page enforce the session role. Every admin
page and `/api/admin/*` route also reads the current Clerk Backend user and
re-checks public metadata, making stale claims insufficient after revocation.
See `docs/admin-panel.md` for the owner setup and enforcement contract.

Teacher data-access routes remain scoped by `teacherId`. Signup policy for who
may become a teacher is still a separate product decision before broad access.

## Rate limiting (SEC-22 — accepted limitation)

`rateLimitGuard` in `src/lib/utils.ts` is an in-process limiter. It resets on
deploy and is not shared across serverless instances, so it is best-effort, not
a global guarantee. Swap for a shared store (e.g. Redis) if stronger limits are
required.

## Token encryption (SEC-4)

Google OAuth access/refresh tokens are encrypted at rest with AES-256-GCM
(`src/lib/crypto.ts`). This requires the **`TOKEN_ENCRYPTION_KEY`** env var
(64 hex chars / 32 bytes — `openssl rand -hex 32`). Reads transparently fall
back to plaintext for tokens stored before encryption was enabled.
