# GradeAI Repository Guide

This guide explains the implemented repository shape. Read
[CLAUDE.md](../../CLAUDE.md) for current release status and
[REQUEST_FLOWS.md](REQUEST_FLOWS.md) before changing a cross-boundary workflow.

## System shape

GradeAI is one Next.js App Router application deployed as a Node service. It
contains the public site, teacher dashboard, owner console, API routes, provider
integrations, and database access in one repository.

```text
Browser
  -> Next.js pages and client components
  -> Next.js route handlers
  -> Clerk / Neon / Anthropic / Google / Cloudflare R2 / Sentry
```

Neon is the system of record for application data. Clerk is the identity source
and the source of truth for admin authorization. External files live in R2;
Google OAuth grants read access to teacher-selected Drive and Sheets data.

## Top-level map

| Path | Responsibility |
| --- | --- |
| `src/app/` | App Router pages, layouts, metadata routes, and HTTP APIs |
| `src/components/` | Shared layout, provider, UI, motion, and command-palette components |
| `src/db/` | Drizzle client, schema, generated SQL migrations, and migration metadata |
| `src/lib/` | Domain helpers, server integrations, validation, hooks, and client API hooks |
| `scripts/` | Repository, launch, and diagnostic scripts |
| `types/` | Shared ambient TypeScript declarations |
| `docs/` | Architecture, operations, launch evidence, and product direction |
| `.github/workflows/` | Continuous integration workflow |
| `src/proxy.ts` | Clerk authentication boundary and public-route allowlist |
| `next.config.ts` | Next.js configuration, security headers, and Sentry build integration |
| `.env.example` | Environment-variable names and safe setup guidance, never real values |

See [FILE_PLACEMENT.md](FILE_PLACEMENT.md) for where a new file belongs.

## Application routes

### Public and authentication

- `src/app/page.tsx` is the public marketing page.
- `src/app/(auth)/` contains Clerk sign-in and sign-up routes.
- `src/app/robots.ts` and `src/app/sitemap.ts` generate crawler metadata.

### Teacher product

`src/app/dashboard/` contains the authenticated teacher experience: dashboard,
classrooms, students, assignments, submission review, analytics, settings, and
the knowledge placeholder. Interactive pages use TanStack Query hooks from
`src/lib/api-client.ts` to call `src/app/api/`.

### Owner console

`src/app/admin/` contains the owner-only console. Server pages query through
`src/lib/admin/`; small client components handle mutations and interaction.
Admin setup and its double-check authorization model are documented in
[docs/admin-panel.md](../admin-panel.md).

### Route handlers

`src/app/api/` is grouped by resource or integration. Route handlers own HTTP
concerns: authentication, rate limits, parsing, validation, status codes, and
response envelopes. Reusable provider or domain behavior belongs under
`src/lib/`, not in a UI component.

## Shared layers

### Components

- `src/components/ui/`: reusable controls and feedback primitives.
- `src/components/layout/`: dashboard navigation and topbar.
- `src/components/motion/`: reusable motion wrappers with reduced-motion support.
- `src/components/providers/`: app-level React Query and theme providers.

Page-specific components and CSS stay beside their route when they are not
reused elsewhere.

### Library code

- `src/lib/ai/`: rubric normalization, prompts, Anthropic grading, and grading tests.
- `src/lib/admin/`: server-only admin auth and operational queries/actions.
- `src/lib/auth/`: role normalization shared by auth boundaries.
- `src/lib/operations/`: sanitized AI usage and system-event records.
- `src/lib/storage/`: R2 configuration, upload behavior, and tests.
- `src/lib/hooks/`: reusable browser hooks.
- `src/lib/google-sheets.ts`: Google auth clients, token refresh, Drive, and Sheets access.
- `src/lib/api-client.ts`: client-side fetch and TanStack Query hooks.
- `src/lib/validations.ts`: strict Zod schemas for request input.
- `src/lib/utils.ts`: central API envelopes, teacher auth, rate limiting,
  sanitization, and small grading helpers.

Modules that import database clients, secrets, or provider SDK credentials must
remain server-only and must never be imported into a client component.

## Data model and ownership

The complete schema is [src/db/schema.ts](../../src/db/schema.ts). The primary
teacher data ownership chain is:

```text
users (Clerk ID)
  -> classrooms (teacherId)
  -> students (classroomId)

users (teacherId)
  -> assignments (classroomId)
  -> submissions (assignmentId, studentId)
  -> grades (unique submissionId)
```

Additional tables store encrypted Google tokens, immutable AI usage, sanitized
system events, admin audit events, and content reports. Foreign-key and common
filter columns are indexed in the schema.

Every teacher query must establish ownership from the authenticated Clerk user
to the requested resource. Possessing a classroom, assignment, student,
submission, or grade ID is never sufficient authorization.

## Trust boundaries

| Boundary | Enforced by |
| --- | --- |
| Signed-in route access | Clerk middleware in `src/proxy.ts` |
| Active teacher account | `getAuthUserId()` and local `users.accountStatus` |
| Teacher tenant isolation | SQL ownership predicates in each teacher API |
| Owner console | Clerk session claim plus live `publicMetadata.role` checks |
| Request shape | Strict Zod schemas in `src/lib/validations.ts` |
| Google callback | Clerk session, one-time state cookie, configured callback origin |
| Google token storage | AES-256-GCM helpers in `src/lib/crypto.ts` |
| Upload configuration | Required R2 environment values and HTTPS public origin |
| Operational telemetry | Sanitized system events and Sentry filtering |

The browser, route protection, local role column, object URLs, and user-supplied
IDs are untrusted. Admin authorization must not fall back to a database role.

## Database lifecycle

The schema and migration journal are reviewed together:

- Schema: `src/db/schema.ts`
- SQL migrations: `src/db/migrations/*.sql`
- Journal: `src/db/migrations/meta/_journal.json`
- Drizzle configuration: `drizzle.config.ts`

Follow the migration procedure in [CONTRIBUTING.md](../../CONTRIBUTING.md).
Production currently has a known migration-ledger reconciliation blocker; the
verified evidence is in the
[beta-readiness runbook](../launch/2026-08-beta-readiness.md).

## Verification and delivery

`npm run verify` runs the repository audit, migration check, lint, TypeScript,
unit tests, and production build. Run the production dependency audit separately
as documented in [CONTRIBUTING.md](../../CONTRIBUTING.md). GitHub Actions runs on
pushes to `main` and pull requests; Railway deploys the production branch after a
successful push and platform build.

Current test coverage is focused on central auth, validation, storage, and rubric
logic. Browser end-to-end coverage and durable grading jobs remain launch work,
not hidden behavior; see [CLAUDE.md](../../CLAUDE.md).
