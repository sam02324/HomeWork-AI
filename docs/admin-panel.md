# GradeAI Admin Panel

## Stage 1: owner access

Clerk `publicMetadata.role` is the authorization source of truth. The local
`users.role` column is synchronized for reporting, but it never grants access to
`/admin` or `/api/admin/*`.

### One-time Clerk setup

Perform these steps in the same Clerk instance used by the deployed GradeAI app.
Development and production Clerk instances have separate users and settings.

1. Open **Clerk Dashboard > Sessions > Customize session token**.
2. Merge this claim into the session token and save:

   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

3. Open **Clerk Dashboard > Users**, select only the GradeAI owner account, and
   set its **Public metadata** to:

   ```json
   {
     "role": "admin"
   }
   ```

4. Sign out of GradeAI and sign in again so Clerk issues a session containing
   the new claim.
5. Open `/admin`. Then open `/api/admin/session`; it should return three passing
   checks inside the standard `{ success, data }` response envelope.

Do not put this role in `unsafeMetadata`: users can edit unsafe metadata from the
frontend. Do not assign `admin` to any other user.

### Enforcement model

- `src/app/admin/layout.tsx` rejects missing/non-admin session claims before the
  admin shell renders.
- Every admin page calls `requireAdminPage()` because Next.js layouts are not
  guaranteed to re-run during every client navigation.
- Every `/api/admin/*` route calls `requireAdminApi()` independently.
- Both page and API guards fetch the current Clerk user and re-check
  `publicMetadata.role`, so a stale session claim alone cannot retain access.
- Authenticated non-admin page requests receive a 404. Admin APIs return 401 for
  unauthenticated requests and 403 for authenticated non-admin requests.

## Build roadmap

### Stage 2: user and account overview (implemented)

- `/admin/users` lists every Clerk identity with signup and last-active timestamps.
- `/api/admin/users` independently enforces the admin role and returns the standard
  response envelope.
- Search, plan/role filters, and pagination are validated by
  `adminUserQuerySchema`; unknown query keys are rejected by the API.
- Clerk is the identity/activity source. Neon provides the explicit account plan
  plus grouped classroom, student, and assignment counts.
- `users.account_plan` is one of `unassigned`, `subscription`, or
  `pay_per_submission`. Existing users remain `unassigned` until an owner action or
  billing integration explicitly changes them; the UI never guesses a plan.

### Stage 3: usage and cost monitoring (implemented)

- `/admin/usage` and `/api/admin/usage` aggregate the immutable
  `ai_usage_events` ledger by day, model, and user.
- Every attempted Anthropic grading call records input/output tokens, result,
  latency, model pricing, and USD/INR rate snapshots. Historical cost never
  changes when the current price or exchange rate changes.
- The seven-day user view flags at least 20 calls that also exceed three times
  the active-user median. This is a review signal, not an automatic suspension.

### Stage 4: system health (implemented)

- `/admin/health` probes Neon and Clerk, verifies Anthropic/Google configuration,
  and shows the sanitized `system_events` ledger.
- Pending, grading, and failed submissions are explicitly labeled as an
  in-request backlog. GradeAI does not currently run a separate job queue.
- Grading and Google synchronization failures are captured without request
  bodies, student work, secrets, or stack traces in the database event.

### Stage 5: manual account actions (implemented)

- `/admin/accounts` provides search, account details, read-only classroom and
  assignment support views, plan changes, credits, quotas, and suspension.
- Suspension calls Clerk `banUser`/`unbanUser`, then atomically batches local
  state and an `admin_audit_events` row. A failed local commit attempts to
  compensate the Clerk change.
- The owner cannot suspend their own administrator account. Credit balances
  cannot become negative. Every mutation requires a reason.

### Stage 6: moderation (implemented)

- Teachers can report a submission from its review page through `/api/reports`.
- `/admin/moderation` supports resolve, dismiss, soft remove, and restore.
  Removed submissions are excluded from grading, analytics, exports, chat, and
  teacher submission APIs without deleting the evidence or audit trail.
- The owner UI shows at most an 800-character sanitized text preview. Student
  content is never copied into audit, system-event, or Sentry payloads.

### Stage 7: Sentry (implemented)

- `@sentry/nextjs` initializes client, Node, edge, router transition, request,
  and global React error capture. Production traces are sampled; replay and
  application log capture are disabled.
- Before-send hooks remove request bodies, cookies, headers, and user PII.
- `/admin/monitoring` reports configuration state without returning DSNs or
  tokens. Its protected diagnostic event is rate limited and audited.

### Sentry deployment variables

Create a Sentry Next.js project, then add these variables in Railway:

```text
NEXT_PUBLIC_SENTRY_DSN=public project DSN
SENTRY_DSN=the same project DSN
SENTRY_ORG=organization slug
SENTRY_PROJECT=project slug
SENTRY_AUTH_TOKEN=CI source-map upload token
SENTRY_ENVIRONMENT=production
```

`SENTRY_AUTH_TOKEN` is server/build-only and must never use a `NEXT_PUBLIC_`
prefix. Set `SENTRY_DASHBOARD_URL` only when the default organization issues URL
is not correct. After deployment, open `/admin/monitoring` and send one
diagnostic event to verify delivery and source mapping.
