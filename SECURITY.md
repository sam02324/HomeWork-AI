# Security Notes

## Access model (SEC-18 — open item, product decision needed)

Every authenticated Clerk user is auto-provisioned as a **`teacher`** on first
request (`getAuthUserId()` in `src/lib/utils.ts`, and the Clerk webhook in
`src/app/api/webhooks/clerk/route.ts`). There is currently **no** admin/student
role enforcement: anyone who can sign up gets a full teacher workspace.

This is intentional for the current single-tenant / invite-gated deployment, but
it is **not** a substitute for an authorization model. Before opening signup
broadly, decide and implement:

- Who is allowed to become a `teacher` (invite/allowlist, domain restriction, or
  admin approval).
- Whether `student`/`admin` roles are needed, and gate routes accordingly.
- An admin surface for role management.

All data-access routes are already scoped by `teacherId`, so one teacher cannot
read another's data — but the provisioning policy itself is the open question.

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
