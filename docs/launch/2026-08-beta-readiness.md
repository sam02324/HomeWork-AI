# GradeAI August 2026 Beta Readiness

Target: invite-only beta on 2026-08-01
Fallback: 2026-08-03
Audience: 10-20 invited teachers, with 5 active pilot teachers
Rule: no paid launch until billing and entitlements are enforced server-side.

## Day 0 evidence - 2026-07-22

Repository baseline before Day 0 work: `97ee826` on `main`.

| Check | Result | Evidence |
| --- | --- | --- |
| Tracked secret-name scan | Pass | No tracked `.env`, `keys.txt`, or Google credential file |
| Credential-pattern scan | Pass | No key/token/private-key pattern in tracked source |
| Removed provider scan | Pass | No MiMo endpoint/model reference in tracked application files |
| Public-secret naming | Pass | No server secret uses a `NEXT_PUBLIC_` name |
| Hardcoded R2 host scan | Pass | Embedded public R2 fallback removed from application source |
| Lint | Pass | `npm run lint` |
| Strict TypeScript | Pass | `npm run typecheck` |
| Automated tests | Pass | 14 tests across auth, validation, storage, and grading rubric behavior |
| Production build | Pass | Next.js 16.2.11, 31 static pages generated, all routes compiled |
| Runtime dependency audit | Pass | `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities |
| Development dependency audit | Accepted for beta | Four moderate alerts remain in Drizzle Kit's development-only legacy loader chain; current Drizzle Kit still depends on it |
| Local production smoke | Pass | Landing 200; dashboard/admin/API redirect unauthenticated users; CSP, DENY, and nosniff present |
| Live Railway public smoke | Pass on previous deployment | Landing 200; no `Powered by Claude` or fabricated Priya content; protected routes redirect to Clerk |
| Neon point-in-time recovery | Pass with migration caveat | Isolated 10:55 IST branch created in 0.68s; 11 tables readable; 8 integrity checks returned zero; production untouched |

The live Railway result describes the commit deployed at audit time. Verify this change set again after a successful Railway deployment; a Git push alone does not prove production is current.

## Day 0 changes

- Suspended users are rejected centrally before teacher API route logic runs.
- Account verification now fails closed with 503 when the database cannot be checked.
- R2 configuration is centralized and has no bucket/host fallback.
- State-changing Zod schemas reject unknown keys, including nested rubric objects.
- A non-secret production environment auditor is available as `npm run audit:launch`.
- Vitest and critical baseline tests are installed.
- GitHub Actions now gates audit, lint, type-check, test, runtime dependency audit, and build.
- Next.js was patched from 16.2.6 to 16.2.11.
- Vulnerable PostCSS/Sharp transitives are overridden to patched versions and verified by a production build.
- Security headers moved to global Next.js headers so protected redirects receive them after deployment.
- Canonical/Open Graph/Twitter metadata, `robots.txt`, and `sitemap.xml` were added.
- The boilerplate README was replaced with the real setup and deployment runbook.

## Local environment audit result

`npm run audit:launch` currently identifies these local defects:

- `CLERK_WEBHOOK_SECRET` contains a placeholder.
- `TOKEN_ENCRYPTION_KEY` is missing.
- `WEBHOOK_SECRET` is missing.
- `SENTRY_AUTH_TOKEN` is missing.
- `NEXT_PUBLIC_APP_URL` is HTTP, which is correct for local development but not production.

This does not prove Railway has the same defects. Railway values must be checked separately without copying their values into source control or this document.

## Owner-only actions for today

These require access to external accounts or real teacher data and cannot be completed safely from repository code alone.

### 1. Rotate exposed credentials

- Revoke the previously shared Sentry source-map token.
- Create a replacement with source-map/release CI scope only.
- Replace `SENTRY_AUTH_TOKEN` in Railway and redeploy.
- Revoke the previously shared MiMo token if that provider account still exists, even though MiMo code is removed.
- Do not paste replacement token values into Git, documentation, screenshots, or chat.

### 2. Verify Railway variable names

Confirm each variable exists and is non-placeholder:

```text
DATABASE_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
ANTHROPIC_API_KEY
ANTHROPIC_MODEL
WEBHOOK_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
SENTRY_ENVIRONMENT
```

Production-specific assertions:

- `NEXT_PUBLIC_APP_URL` is exactly the HTTPS Railway/custom-domain origin with no path.
- `ANTHROPIC_MODEL` is the approved Anthropic model.
- `TOKEN_ENCRYPTION_KEY` is one stable 64-character hexadecimal value.
- Clerk keys all belong to the same production Clerk instance.
- Google credentials and callback URI belong to the same Google Cloud project.
- R2 credentials and bucket belong to the intended GradeAI account.
- Sentry org/project/DSN/token belong to the intended production project.

### 3. Verify provider consoles

- Clerk: production paths, allowed origins, webhook endpoint, admin metadata, and session claim.
- Google: consent screen, verified domain, minimum scopes, and exact callback URI.
- Neon: point-in-time branch recovery and data integrity passed on 2026-07-23.
  Migration ledger reconciliation remains open: Neon has 2 ledger rows while the
  repository journal has 6 entries.
- R2: identify whether every existing submission object is public; do not assume obscurity protects it.
- Sentry: send one sanitized diagnostic and confirm source mapping.

### 4. Complete the fresh-account smoke journey

Use a non-admin Google/Clerk account that has never used GradeAI:

- [ ] Sign up and sign in.
- [ ] Confirm `/admin` is unavailable.
- [ ] Create one classroom.
- [ ] Add two students with distinct roll numbers.
- [ ] Create one text assignment and one `any` assignment.
- [ ] Connect Google.
- [ ] List Drive folders and Sheets.
- [ ] Sync three responses from one Sheet.
- [ ] Sync again and confirm zero duplicate submissions.
- [ ] Upload valid PDF, JPEG/PNG, and text files.
- [ ] Confirm invalid/oversized files fail clearly.
- [ ] Grade all pending submissions.
- [ ] Review one result and override its score.
- [ ] Export grades.
- [ ] Report one submission and confirm it appears in admin moderation.
- [ ] Wipe the test account data and verify it is gone.

Record the exact account, assignment ID, time, observed result, expected result, and screenshot for every failure. Do not record submission content or tokens.

### 5. Prepare pilot evidence

- Five assignments representing the first launch subjects.
- At least 20 educator-scored submissions across text, clean PDF, scanned PDF, clean image, poor image, and handwriting.
- Expected rubric scores and acceptable score ranges.
- Named teacher reviewer for each subject.

## Remaining P0 before August 1

### P0.1 Durable grading execution

Current grading runs inside the request. Before inviting meaningful volume, accepted grading work must survive request timeout/restart and expose reliable item-level status. Minimum beta solution:

- persisted grading job and item states.
- one idempotency key per run.
- bounded concurrency.
- retry only transient failures.
- recovery for abandoned `grading` states.
- progress endpoint and completion notification.

### P0.2 Private student files

The current database stores public R2 URLs. Before broad access:

- make the bucket private.
- store object keys rather than permanent public URLs.
- authorize and issue short-lived signed downloads.
- use direct signed uploads or a strictly bounded server upload.
- define retention and account-deletion cleanup.

### P0.3 Critical browser tests

Unit tests now exist, but the launch needs Playwright coverage for:

- unauthenticated redirects and cross-account denial.
- classroom/assignment/submission happy path.
- Google reconnect failure UI.
- grading run and duplicate click.
- teacher override.
- admin denial.
- account wipe.

### P0.4 Legal and support surface

Publish reviewed versions of:

- Privacy Policy.
- Terms of Service.
- Acceptable Use Policy.
- beta limitations and AI/teacher-review disclosure.
- data retention/export/deletion policy.
- support and grievance contact.
- Refund/Cancellation Policy before accepting payment.

Use qualified Indian privacy counsel for DPDP and children's/student-data obligations. Repository code cannot certify legal compliance.

### P0.5 Backup and restore evidence (recovery passed; ledger reconciliation open)

Completed on 2026-07-23:

- Created point-in-time branch `restore-drill-2026-07-23` from `production` at
  10:55 IST with one-day auto-deletion; production was not modified.
- Neon reported a 0.68-second fork. Schema/data validation finished within two
  minutes in the isolated SQL editor.
- Verified all 11 expected GradeAI tables. Recovery counts were 2 users,
  1 classroom, 1 student, 1 assignment, 3 submissions, and 2 grades.
- Verified zero orphaned classrooms, students, assignments, submissions, grades,
  and zero duplicate grades across eight integrity checks.
- Verified `drizzle.__drizzle_migrations` exists.

Remaining before this P0 closes:

- Reconcile 2 Neon migration ledger rows with 6 entries in
  `src/db/migrations/meta/_journal.json`. Existing schema is current, but earlier
  changes were most likely applied through `db:push` without ledger entries.
- After reconciliation, run `npm run db:migrate` against an isolated recovery
  branch and confirm it is a no-op before enabling production migrations.

## P1 for the first beta week

- Replace the Railway hostname with a product domain and branded email.
- Replace in-memory rate limiting with a shared store before scaling instances.
- Add support intake and a simple public status page.
- Add product analytics with a documented event dictionary and PII redaction.
- Add accessibility and Lighthouse audits.
- Add upload quarantine/malware scanning.
- Standardize the remaining legacy API response shapes.
- Convert state-changing `/api/sync-all` from GET to POST with idempotency.

## Explicitly deferred

- Native mobile application.
- paid plans and pay-per-submission checkout.
- enterprise SSO/SCIM.
- template marketplace.
- broad board/language expansion.
- further visual redesign.
- model-provider routing.

Deferred items do not block an invite-only free beta unless an advertised claim depends on them.

## Launch decision

Launch on August 1 only when:

- all P0 items above are closed or explicitly reduced to a documented, tested pilot constraint.
- five teachers independently complete the smoke journey.
- at least 100 valid pilot submissions produce no data loss, cross-account access, or duplicate grading charge/work.
- valid grading jobs complete at least 98% of the time.
- backup restoration, incident owner, and rollback route are known.

Use August 3 only as the fallback for security, data-integrity, auth, grading, deletion, or recovery failures. Do not delay for cosmetic changes.
