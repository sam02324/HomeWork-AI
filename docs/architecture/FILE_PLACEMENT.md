# GradeAI File Placement

Use the narrowest existing ownership boundary. Do not add a new top-level folder
or abstraction until the code has a concrete cross-feature responsibility.

## Placement table

| Change | Location | Notes |
| --- | --- | --- |
| Public page | `src/app/<route>/page.tsx` | Co-locate `page.module.css`; keep data server-side where practical |
| Teacher page | `src/app/dashboard/<feature>/` | Reuse the dashboard shell and API contracts |
| Owner page | `src/app/admin/<feature>/` | Every page calls `requireAdminPage()` |
| HTTP endpoint | `src/app/api/<resource>/route.ts` | Authenticate, validate, authorize, call domain/provider code, envelope response |
| Admin endpoint | `src/app/api/admin/<resource>/route.ts` | Every handler calls `requireAdminApi()` |
| Page-only component | Beside its page | Keep it local until another route genuinely reuses it |
| Reusable control | `src/components/ui/` | Pair component and CSS Module; preserve variants and accessibility |
| Shared dashboard chrome | `src/components/layout/` | Navigation, topbar, and shell behavior only |
| Reusable animation | `src/components/motion/` | Include reduced-motion behavior |
| React provider | `src/components/providers/` | App-level client context only |
| Browser hook | `src/lib/hooks/` | Must start with `'use client'` when browser APIs are used |
| Client API hook | `src/lib/api-client.ts` | Follow existing query keys and standard response-envelope handling |
| AI behavior | `src/lib/ai/` | Prompt, rubric, parsing, and grading logic; keep provider calls server-side |
| Admin operation | `src/lib/admin/` | Mark server-only; separate page/API guards from data operations |
| Operational ledger | `src/lib/operations/` | Sanitized usage and system events only |
| Storage integration | `src/lib/storage/` | Centralize required configuration and object policy |
| Google integration | `src/lib/google-sheets.ts` | Keep OAuth credentials and token access server-side |
| Request schema | `src/lib/validations.ts` | Strict Zod schema; export inferred types when reused |
| Cross-feature server helper | `src/lib/<domain>/` or focused file in `src/lib/` | Add `server-only` when it touches DB, secrets, or privileged providers |
| Database table/relation | `src/db/schema.ts` | Add indexes and ownership relations deliberately |
| Database migration | `src/db/migrations/` | Generate with Drizzle; never hand-edit migration metadata casually |
| Unit test | Beside the tested module as `*.test.ts` | Use Vitest and test behavior, not implementation details |
| Ambient type | `types/` | Only declarations that cannot live beside their owner |
| Operational script | `scripts/` | No embedded credentials or production data; document destructive behavior |
| Durable architecture doc | `docs/architecture/` | Current system boundaries and decisions |
| Agent role or workflow doc | `docs/agents/` | Team contracts, prompts, work orders, handoffs, and task board |
| Dated release evidence | `docs/launch/` | Verification evidence, owner steps, and launch gates |

## Route handler shape

Use this order for a protected mutation:

1. Authenticate with `getAuthUserId()` or `requireAdminApi()`.
2. Apply a rate limit when the operation is expensive or abuse-sensitive.
3. Parse the request with a strict schema.
4. Verify ownership using the authenticated user ID in the SQL predicate.
5. Call a focused server helper when behavior spans providers or multiple steps.
6. Commit coupled writes with `db.batch()`.
7. Return `successResponse()` or a safe `errorResponse()`.
8. Route unexpected errors through `handleApiError()` and sanitized telemetry.

Do not accept a `teacherId`, `userId`, or admin role from the browser as proof of
authority.

## Component placement

Keep a component beside its route when it knows page-specific data shapes or
navigation. Promote it to `src/components/ui/` only when it is domain-neutral and
has a stable reusable API. Promote repeated transition behavior to
`src/components/motion/`, not copied animation objects in multiple pages.

CSS follows its component as `Component.module.css` or `page.module.css`. Global
tokens, resets, and truly application-wide rules belong in
`src/app/globals.css`. Do not introduce Tailwind or a second design-token system.

## Server boundary

Use `import 'server-only'` for modules that expose privileged queries or provider
operations. Never import these into a `'use client'` tree:

- `src/db/`
- `src/lib/admin/`
- `src/lib/operations/`
- token encryption, storage credentials, or provider clients

Pass serializable, minimized data to client components. Environment variables
without the `NEXT_PUBLIC_` prefix remain server-only. A new public environment
variable requires explicit review because its value is shipped to browsers.

## Database placement and migration rule

A schema change includes all of the following in one focused pull request:

1. `src/db/schema.ts` change.
2. Generated SQL and migration metadata under `src/db/migrations/`.
3. Query and validation changes needed for compatibility.
4. Tests for new constraints or state transitions.
5. A rollout and rollback or compatibility note.

Run `npm run db:generate` and `npm run db:check`. Do not use `db:push` on a
persistent database. Follow [CONTRIBUTING.md](../../CONTRIBUTING.md) and the
[beta-readiness migration warning](../launch/2026-08-beta-readiness.md) before
applying migrations.

## When not to add a file

- Do not create another generic fetch helper while `src/lib/api-client.ts` owns
  the current browser contract.
- Do not duplicate auth or response helpers inside a feature route.
- Do not create a shared component for one call site.
- Do not create a repository-wide `utils` dumping ground; use a named domain
  module when behavior has a clear owner.
- Do not add generated output, local diagnostics, credentials, or scratch files
  to version control.
- Do not move existing code solely to make the tree look symmetrical. Move code
  only with tests and a clear ownership improvement.

## Documentation placement

Update [CLAUDE.md](../../CLAUDE.md) after verified project-state changes as
required by `AGENTS.md`. Keep setup commands in [README.md](../../README.md),
contributor process in [CONTRIBUTING.md](../../CONTRIBUTING.md), security details
in [SECURITY.md](../../SECURITY.md), and navigation in [docs/README.md](../README.md).
Link instead of copying long sections.
