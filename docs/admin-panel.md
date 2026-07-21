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

### Stage 2: user and account overview

- Add explicit account-plan fields; no plan is inferred from UI copy.
- Add a paginated admin users API with search/filter validation.
- Aggregate classroom, student, and assignment counts with grouped queries.
- Show Clerk creation/last-active timestamps without exposing Clerk metadata.

### Stage 3: usage and cost monitoring

- Add an immutable AI usage event per grading call with input/output tokens,
  model, status, latency, and a price snapshot.
- Derive daily/weekly totals and anomaly flags from that ledger.
- Never estimate historical cost from today's model price.

### Stage 4: system health

- Add sanitized system/job events and health probes for Neon and Clerk.
- Report pending/grading submission counts as backlog while grading remains an
  in-request workflow; do not claim a separate queue exists.

### Stage 5: manual account actions

- Add suspension, credits/quota fields, and immutable admin audit events.
- Re-check admin access inside every action and record actor, target, reason,
  before/after values, and timestamp in one transaction.

### Stage 6: moderation

- Add teacher-created reports and a restricted review queue.
- Use soft removal plus an audit trail; avoid copying student content into logs.

### Stage 7: Sentry

- Add server/client/edge error capture, release/environment tags, source maps,
  and an admin monitoring summary after the event taxonomy in Stage 4 exists.
- Alert rules and any Sentry-backed admin features will be scoped before this
  stage so the app does not expose project credentials to the browser.
