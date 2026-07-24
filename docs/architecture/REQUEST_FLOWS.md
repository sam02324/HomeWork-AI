# GradeAI Request Flows

These flows describe current behavior. File paths are included so a developer can
trace each step in code. Future architecture belongs in the
[product roadmap](../GRADEAI_PRODUCT_MOBILE_AND_30_YEAR_ROADMAP.md).

## Common teacher API path

```text
browser
  -> src/proxy.ts (Clerk session required)
  -> src/app/api/.../route.ts
  -> getAuthUserId()
  -> local active-account check or first-use provisioning
  -> strict input validation
  -> teacher-scoped SQL ownership predicate
  -> Neon read/write
  -> { success, data } or { success, error, code }
  -> TanStack Query cache update/invalidation
```

`src/proxy.ts` only establishes authentication. Each API route must still prove
resource ownership. `getAuthUserId()` fails closed when the local account check is
unavailable and rejects suspended accounts.

## Classroom and assignment CRUD

1. A dashboard component calls a hook in `src/lib/api-client.ts`.
2. The resource route validates the authenticated teacher and body or query.
3. Create and update operations verify that referenced classrooms belong to the
   teacher.
4. Free-text assignment fields are stripped of HTML before storage.
5. List and detail queries scope by `teacherId` and return the standard envelope.
6. The client invalidates the affected classroom or assignment query keys.

Start with `src/app/api/classrooms/`, `src/app/api/assignments/`, and
`src/app/api/classrooms/[id]/students/`.

## Direct file upload

```text
POST /api/upload
  -> Clerk and active-account check
  -> per-user in-memory throttle
  -> multipart file extraction
  -> 10 MB limit and MIME allowlist
  -> binary signature check when the format has a recognized signature
  -> src/lib/storage/r2.ts
  -> R2 object URL returned to the caller
```

The storage helper requires all R2 settings and constructs a teacher-scoped,
random object key. Current records use permanent public URLs. Private objects and
authorized short-lived downloads remain a P0 item documented in
[CLAUDE.md](../../CLAUDE.md).

## Google OAuth

1. `GET /api/auth/google` requires the Clerk session, creates a random nonce, and
   stores it in a short-lived HTTP-only cookie.
2. The teacher is redirected to Google with read-only Sheets and Drive scopes.
3. Google returns to `GET /api/auth/google/callback`.
4. The callback uses the configured application origin, compares the state query
   value with the cookie, and takes user identity only from Clerk.
5. Access and refresh tokens are encrypted before the `google_tokens` upsert.
6. `src/lib/google-sheets.ts` refreshes expired access tokens. On refresh failure,
   stored tokens are removed and the teacher must reconnect.

Changing the token-encryption key makes existing encrypted tokens unreadable.
Deployment steps are canonical in [README.md](../../README.md).

## Google submission synchronization

```text
POST /api/sync-submissions { assignmentId }
  -> auth, throttle, strict Zod validation
  -> assignment ownership and spreadsheet-link check
  -> OAuth client when a teacher token exists
  -> read and parse Sheet rows
  -> skip existing Google response identifiers
  -> match or create classroom student
  -> download Drive file when present
  -> extract readable PDF text when possible
  -> upload file bytes to R2
  -> insert pending submission
  -> sanitized success/error summary
```

The current matching implementation tries roll number, then case-insensitive
name, then creates a student. Keep deduplication and identity behavior explicit
when changing this flow. Google and synchronization failures are recorded as
sanitized operational events.

`GET /api/sync-all` currently starts writes and is a documented API-design debt;
do not copy that method choice into new mutation endpoints.

## AI grading

1. `POST /api/assignments/[id]/grade` authenticates the teacher, applies an
   expensive-route throttle, and verifies assignment ownership.
2. An atomic conditional update claims the assignment by changing its status to
   `grading`; concurrent claims receive 409.
3. `gradeAllSubmissions()` selects non-removed `pending` and `error` submissions
   and grades them sequentially.
4. `gradeSubmission()` resolves text, PDF, image, or Google Drive content, builds
   the effective rubric and prompt, and calls the configured Anthropic model.
5. The response is parsed with Zod and rubric math is recalculated before saving.
6. A Neon `db.batch()` atomically upserts the grade, marks the submission graded,
   and appends its AI usage event. Teacher override fields are preserved.
7. Failures mark the submission `error` and append sanitized usage/system events
   when possible; other submissions continue.
8. The assignment leaves `grading` based on fresh submission state.

Implementation starts in `src/app/api/assignments/[id]/grade/route.ts` and
`src/lib/ai/grading-service.ts`.

Grading is still performed inside the HTTP request. There is no durable queue,
worker retry, or abandoned-job recovery yet. Never describe the current polling
UI as a durable background-job system.

## Grade review, override, chat, and reports

- Grade reads and teacher overrides go through `src/app/api/grades/` and must
  join back through submission and assignment ownership.
- Submission chat uses
  `src/app/api/assignments/[id]/submissions/[subId]/chat/route.ts`; ownership must
  cover both path identifiers.
- A teacher reports content through `POST /api/reports` only after the submission
  is joined to one of their assignments.
- Duplicate reports from the same teacher and submission return a conflict.
- Report events contain identifiers and sanitized metadata, not student work.

AI output remains advisory. The teacher-reviewed or overridden score is the
product's final decision surface.

## Admin requests

```text
/admin page
  -> requireAdminPage()
  -> Clerk session metadata role check
  -> live Clerk Backend API publicMetadata.role check
  -> server-only query in src/lib/admin/

/api/admin/*
  -> requireAdminApi()
  -> the same session and live metadata checks
  -> validation and rate limit for mutations
  -> admin service action
  -> Neon batch plus admin_audit_events where state changes
```

The local `users.role` supports reporting only. It cannot grant admin access.
Account suspension also updates Clerk, with compensation attempted if the local
write fails. Moderation soft-removes submissions and preserves evidence. See
[admin-panel.md](../admin-panel.md) for the complete owner setup and feature map.

## Submission file path

```text
POST /api/upload
  -> authenticated teacher plus rate limit
  -> MIME, size, and file-signature validation
  -> private R2 object under a tenant-derived opaque scope
  -> return an r2: object reference, never a public object URL

GET /api/submissions/:id/file
  -> authenticated teacher
  -> submission/assignment ownership join
  -> short-lived R2 download signature or private Google Drive stream
  -> no-store response
```

List and detail APIs replace stored object references with the application file
route. Recognized legacy R2 URLs are owner-checked and re-signed; arbitrary
external URLs are rejected. Hard submission, assignment, classroom, account-wipe,
and Clerk user-deletion paths remove managed objects before deleting database
rows. Object storage and Neon cannot share a transaction, so deletion deliberately
fails before the database delete when R2 cleanup fails; reconciliation tooling is
still required for infrastructure-level partial failures.

## Provider webhooks

`src/app/api/webhooks/` is public at the route-protection layer so providers can
reach it. The active Clerk endpoint verifies the Svix signature before processing
data, uses conflict-safe writes for retries, and returns sanitized responses. The
legacy shared-secret Google Form webhook returns `410`; teacher imports now use the
authenticated Google OAuth sync flow. A new webhook is not complete until replay
and invalid-signature behavior are tested.

## Error and telemetry path

- Expected client errors use a safe status and stable code through
  `errorResponse()`.
- Unexpected errors are logged server-side and reduced to a generic 500 through
  `handleApiError()`.
- `src/lib/operations/system-events.ts` records sanitized operational facts.
- Sentry filtering removes request bodies, cookies, headers, and user PII.
- Student work, tokens, provider payloads, and stack traces must not enter API
responses, audit records, system events, or documentation.
