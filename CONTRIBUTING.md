# Contributing to GradeAI

GradeAI handles teacher and student data. Changes must preserve tenant isolation,
teacher review, and operational traceability before optimizing delivery speed.

## Start here

Read these in order before making a non-trivial change:

1. [AGENTS.md](AGENTS.md) for repository-specific working rules.
2. [CLAUDE.md](CLAUDE.md) for the current verified handoff and launch blockers.
3. [README.md](README.md) for setup, deployment, and database commands.
4. [Documentation index](docs/README.md) for architecture and operational guides.
5. [Agent team](docs/agents/README.md) when work is delegated across AI roles.
6. The source files involved in the change. Source and migrations are authoritative.

## Local setup

Use Node.js 22. Next.js requires Node.js 20.9 or newer.

```bash
npm ci
cp .env.example .env.local
npm run db:push # disposable local database only
npm run dev
```

Ask a maintainer for development-provider access through an approved secret
channel. Never paste secrets into issues, pull requests, fixtures, logs, Markdown,
or source files. Do not copy production student data into local environments.

## Change workflow

1. Create a focused feature branch from the latest `main`.
2. Trace the relevant path using the [repository guide](docs/architecture/REPOSITORY_GUIDE.md)
   and [request flows](docs/architecture/REQUEST_FLOWS.md).
3. Put new files according to [file placement](docs/architecture/FILE_PLACEMENT.md).
4. Add or update tests for changed behavior, especially authorization, validation,
   grading, synchronization, and data mutations.
5. Run the verification gate before opening a pull request.
6. Update canonical documentation when behavior, architecture, release state, or
   operator steps change.

Keep a pull request limited to one concern. Do not combine product work with
unrelated renames, formatting churn, dependency upgrades, or generated files.

## Engineering boundaries

### Authentication and authorization

- `src/proxy.ts` is the outer Clerk authentication boundary, not the complete
  authorization model.
- Teacher API routes must call `getAuthUserId()` and scope every resource query
  through the authenticated teacher's ownership chain.
- Return 404 when exposing whether another teacher's resource exists would leak
  information.
- Admin pages must call `requireAdminPage()`; admin APIs must call
  `requireAdminApi()`. A local database role never grants admin access.
- Public webhooks must validate their provider secret or signature before any
  write.

Frontend visibility is not authorization. Test both an allowed owner and a
different or unauthenticated user for every protected operation.

### API and data handling

- Validate bodies and query parameters with strict Zod schemas from
  `src/lib/validations.ts`; unknown fields must fail.
- Use the standard response envelope: `{ success: true, data }` or
  `{ success: false, error, code }`.
- Sanitize stored free text and return only safe client-facing errors.
- Use `db.batch()` for writes that must commit atomically with the Neon HTTP
  driver. Preserve idempotency or conflict handling for retried requests.
- Never log request bodies, student work, OAuth tokens, credentials, or provider
  error payloads.

### Server and client code

- Keep database, provider SDK, admin, storage, and operations code server-only.
- Add `'use client'` only when browser state, effects, event handlers, or browser
  APIs require it.
- Use TanStack Query for existing client-side server state and invalidate the
  narrowest affected query keys after mutations.
- Reuse `src/components/ui/`, `src/components/motion/`, and CSS custom properties
  before adding page-specific primitives. Styling remains CSS Modules, not
  Tailwind.

## Database changes

`src/db/schema.ts` and `src/db/migrations/` must change together.

```bash
npm run db:generate
npm run db:check
```

Review generated SQL for destructive operations, locks, defaults, nullability,
foreign keys, and indexes. State the rollout and rollback or compatibility plan
in the pull request.

Use `npm run db:push` only for a disposable local database. Before any persistent
environment migration:

1. Reconcile the database migration ledger with
   `src/db/migrations/meta/_journal.json`.
2. Create a Neon recovery branch.
3. Run `npm run db:migrate` against an isolated branch first.
4. Verify schema and representative reads before production rollout.

The current production ledger caveat is tracked in the
[beta-readiness runbook](docs/launch/2026-08-beta-readiness.md).

## Verification

Run the repository gate:

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```

For focused development, run the nearest tests first, then the complete gate.
For auth, headers, redirects, or routing, also run a local production server and
smoke-test the routes listed in [CLAUDE.md](CLAUDE.md). For documentation-only
changes, verify every relative link resolves from its containing file.

Do not claim a check passed unless it was executed in the current change.

## Pull request expectations

Include:

- the user or operator problem and the chosen behavior;
- files and boundaries affected;
- authorization and data-privacy impact;
- migration, environment-variable, and deployment impact;
- tests run with exact results;
- screenshots for visible UI changes;
- known limitations or follow-up work.

Reviewers should reject changes that rely only on client-side authorization,
introduce unvalidated mutation input, expose student content in telemetry, bypass
migration history, or reintroduce an unbenchmarked grading provider.

## First day for a new developer

1. Complete local setup using development accounts and a disposable database.
2. Run `npm run verify` without modifying code.
3. Read the repository guide and trace one assignment request end to end.
4. Sign in as a development teacher and create a classroom and draft assignment.
5. Review the current launch blockers without attempting a production migration.
6. Make one small tested change, document its security impact, and open a focused
   pull request.
