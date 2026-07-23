@AGENTS.md

# GradeAI Persistent Project Context

Last updated: 2026-07-23

This is the canonical handoff for GradeAI. Read it before changing the project.
Source code remains authoritative when this document and implementation differ.
Keep this file concise and update it after every completed project task according
to `AGENTS.md`.

Delivery preference: after a verified project task changes repository files,
commit the task-owned changes and push the current branch without asking. Do not
stage unrelated user work or ignored/local credential files. Do not push when the
user explicitly says not to.

## Product

GradeAI is an AI-assisted homework grading platform for Indian teachers and
coaching institutes. Teachers create classrooms and rubric-based assignments,
collect text/PDF/image submissions or sync Google Form responses, run AI grading,
review criterion feedback, override scores, export results, and inspect student
analytics. AI output is advisory; the teacher owns the final grade.

Current release target: invite-only beta for 10-20 teachers, with five active
pilot teachers. Do not enable paid plans until billing, entitlements, quotas, and
usage accounting are enforced server-side.

## Non-negotiable stack

- Next.js 16 App Router, React 19, TypeScript strict mode
- Clerk v7 authentication and metadata-based roles
- Neon PostgreSQL through Drizzle ORM 0.45
- Anthropic Claude through AI SDK v6 and `@ai-sdk/anthropic`
- Cloudflare R2 through the AWS S3 SDK
- Google Drive, Sheets, Forms, and OAuth through `googleapis`
- TanStack React Query v5 and Zustand
- Framer Motion v12 plus GSAP for selected marketing motion
- Recharts v3
- React Hook Form and Zod v4
- CSS Modules and CSS custom properties; never introduce Tailwind
- Sentry Next.js SDK
- Railway production deployment

Do not reintroduce MiMo or another grading provider without an explicit product
decision and a scored benchmark against the approved Anthropic baseline.

## Repository map

- `src/app/page.tsx`: public marketing page
- `src/app/dashboard/`: teacher product shell, classrooms, assignments, review,
  analytics, settings, knowledge placeholder, and student details
- `src/app/admin/`: owner-only operations console
- `src/app/api/`: teacher, integration, webhook, grading, reporting, and admin APIs
- `src/components/ui/`: shared Button, Card, Badge, Select, Modal, Toast, Skeleton,
  and EmptyState primitives
- `src/components/motion/`: reusable page, reveal, cursor, and tilt motion
- `src/components/layout/`: dashboard sidebar and topbar
- `src/db/schema.ts`: complete Drizzle schema
- `src/lib/ai/`: rubric construction, prompts, and grading service
- `src/lib/admin/`: admin authorization and operations queries
- `src/lib/operations/`: AI usage and sanitized system-event ledgers
- `src/lib/storage/r2.ts`: required R2 configuration and upload helper
- `src/lib/google-sheets.ts`: Google clients, token refresh, and Sheets access
- `src/lib/validations.ts`: strict request schemas
- `src/proxy.ts`: Clerk route protection
- `next.config.ts`: global security headers and Sentry build integration
- `CONTRIBUTING.md`: setup, change workflow, security boundaries, migrations,
  verification, PR expectations, and first-day onboarding
- `docs/README.md`: canonical developer-documentation index
- `docs/agents/`: AI team operating model, role contracts, reusable prompts,
  work-order/handoff templates, and launch task board
- `docs/architecture/`: repository guide, implemented request flows, and file
  placement rules
- `docs/admin-panel.md`: admin stages and Clerk/Sentry setup
- `docs/launch/2026-08-beta-readiness.md`: current launch evidence and owner checklist
- `docs/GRADEAI_PRODUCT_MOBILE_AND_30_YEAR_ROADMAP.md`: mobile and long-term plan

## Data model

Primary tables:

- `users`: Clerk ID, profile, role, account plan/status, credits and quotas
- `classrooms`: teacher-owned subject/grade groups
- `students`: classroom-scoped learners with roll number/contact fields
- `assignments`: teacher/classroom ownership, rubric, grading settings, status,
  Google Sheet linkage, due date, and submission type
- `submissions`: assignment/student content or file reference, sync identifiers,
  moderation state, and grading status
- `grades`: one grade per submission, criterion scores, feedback, model/token
  metadata, AI-detection fields, chat history, and teacher override/review
- `google_tokens`: encrypted OAuth tokens and sync-folder preferences per user
- `ai_usage_events`: immutable model usage/cost ledger
- `system_events`: sanitized operational failures and health events
- `admin_audit_events`: immutable owner action trail
- `content_reports`: teacher reports and moderation state

Frequently queried ownership and foreign-key columns are indexed in the schema.
Schema changes require a Drizzle migration and a rollback/compatibility review.

## Authorization and trust boundaries

- `src/proxy.ts` protects all non-public routes through Clerk.
- Public routes are limited to landing/auth, webhooks, `robots.txt`, and
  `sitemap.xml`.
- Teacher APIs must call `getAuthUserId()` and independently verify resource
  ownership in SQL; frontend visibility is never authorization.
- `getAuthUserId()` rejects suspended local accounts and fails closed when the
  account database check is unavailable.
- Admin access comes only from Clerk `publicMetadata.role === "admin"` and is
  rechecked server-side by every admin page and API. The local role never grants
  admin access.
- Admins cannot suspend their own account. Mutations require a reason and create
  audit events.
- API errors use sanitized messages; no stack traces, tokens, request bodies, or
  student work may enter responses, system events, audit logs, or Sentry.
- Global CSP, HSTS, frame denial, nosniff, referrer, and permissions headers are
  configured in `next.config.ts`, including Clerk-generated redirects.

## Core workflows

### Grading

`POST /api/assignments/[id]/grade` validates ownership and request input, guards
against duplicate active grading, extracts text from supported text/PDF/image
content, builds a rubric, calls the configured Anthropic model, records usage,
upserts the grade, and updates item/assignment status. Teacher overrides remain
the final source shown to users.

Known constraint: grading still runs inside the HTTP request. Durable persisted
jobs, idempotency keys, bounded workers, retries, abandoned-job recovery, and a
reliable progress endpoint are required before meaningful production volume.

### Google sync

OAuth uses state validation and encrypted token storage per teacher. Teacher-facing
sheet discovery, sync, and Drive downloads require that teacher's OAuth connection;
there is no shared service-account fallback. Assignment creation accepts an
accessible Sheet selected from Google or a validated Sheets URL/ID. Sync maps rows
to students/submissions and deduplicates by Google response/file identifiers.
Refresh failures require reauthorization and must not expose Google error payloads.
`GET /api/sync-all` is still state-changing and must become an idempotent POST; it
is no longer triggered automatically when the dashboard mounts.

### Files

Uploads accept PDF, PNG, and JPEG up to 10 MB. R2 configuration is required and
has no fallback account, bucket, or host. Current records still use permanent
public URLs; private objects plus authorized short-lived signed downloads are a
P0 launch requirement.

### Admin operations

The `/admin` console includes users, plans/credits/suspension, read-only support
views, usage/cost monitoring, system health, moderation, audit history, and a
sanitized Sentry diagnostic. Details and Clerk session-claim setup live in
`docs/admin-panel.md`.

## API and validation conventions

- Success: `{ success: true, data: ... }`
- Error: `{ success: false, error: string, code: string }`
- State-changing and query payloads use strict Zod schemas; unknown keys fail.
- Use 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409
  conflict, 429 throttled, 500 unexpected failure, and 503 unavailable.
- Multi-record writes that must remain consistent use a transaction or atomic
  Neon batch supported by the serverless driver.
- Expensive routes are rate limited. The current in-memory limiter is acceptable
  only for a single-instance beta and must move to a shared store before scaling.
- List endpoints should paginate and avoid N+1 queries.

## UI and design rules

- Dark charcoal default, crimson rose primary, amber secondary, warm light theme.
- CSS Modules and existing variables in `src/app/globals.css` only.
- Preserve restrained depth and motion: card lift/tilt, staggered entrances,
  spring press states, animated modal/toast transitions, and reduced-motion
  support. Avoid dense repeated card grids and decorative motion that obstructs
  grading work.
- Use the shared UI components before creating page-specific controls.
- Do not publish fabricated testimonials, usage statistics, customer names, or
  model-provider branding.
- Desktop web is current. Mobile should share database/API/contracts/design
  tokens, not React DOM components; see the long-term roadmap.

## Environment and deployment

Variable names and validation rules live in `.env.example` and the launch
readiness document. Never commit `.env*`, credential JSON, `keys.txt`, DSNs,
tokens, private keys, or production values. `NEXT_PUBLIC_` is allowed only for
values intentionally exposed to browsers.

Production origin: `https://homework-ai-production-1917.up.railway.app` until a
product domain is configured. GitHub `main` deploys through Railway. Before
diagnosing a queued Railway deployment as a code failure, inspect whether all
build stages are still `Not started` because of an upstream GitHub incident.

## Verification contract

Run before declaring repository changes complete:

```text
npm run audit:repo
npm run db:check
npm run docs:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

For auth/header/routing changes, also run the production server locally and smoke
test `/`, `/dashboard`, `/admin`, an authenticated API route, `/robots.txt`, and
`/sitemap.xml` with redirects disabled.

## Current release state

- Branch: `main`; remote: `origin` (`sam02324/HomeWork-AI`).
- Next.js is pinned to 16.2.11; production dependency audit reports zero known
  vulnerabilities at the 2026-07-22 verification point.
- Unit baseline: 17 passing tests covering central auth, strict validation, R2
  configuration/key construction, rubric behavior, and Google Sheet URL/ID parsing.
- GitHub Actions gates repository audit, lint, typecheck, tests, production
  dependency audit, and build.
- Developer onboarding now includes repository/request-flow/file-placement guides,
  contribution rules, CODEOWNERS, a security-aware PR template, editor standards,
  and automated local-document-link validation.
- Agent-run work now uses Kelly as lead/integrator, with bounded Maya (Product/UX),
  Theo (Frontend), Arjun (Backend/Data), Iris (AI Quality), Sana
  (Security/Privacy), Quinn (QA/Release), Rowan (DevOps/SRE), and Nora (Browser
  Research and Verification) contracts. Kelly makes a minimum-team routing
  decision for every task.
  Delegation requires disjoint write sets, structured handoffs, and owner gates
  for production, data, credential, billing, legal, and grading-policy actions.
- `docs/agents/SKILL_MATRIX.md` records the reviewed role-by-role skill shortlist
  and pre-install supply-chain gate. Research alone does not authorize an
  installation, and no external skill is currently approved to expand a role's
  authority.
- Local production smoke passes for public pages, protected redirects, generated
  metadata routes, security headers, and removal of fabricated/model branding.
- A 2026-07-23 Neon point-in-time recovery branch reproduced all 11 application
  tables and expected data. Eight orphan/duplicate integrity checks returned zero.
- A local change set reaches live Railway only after commit, push, and a
  successful Railway deployment. Verify the deployed commit separately.

## Known launch blockers

1. Durable background grading execution and item-level recovery/progress.
2. Private R2 objects with authorized signed upload/download and retention cleanup.
3. Playwright coverage for auth isolation, core grading, Google reconnect,
   duplicate clicks, overrides, admin denial, and account wipe.
4. Reviewed privacy, terms, acceptable-use, AI disclosure, retention/deletion,
   support/grievance, and refund documents before payment.
5. Reconcile Neon's 2-entry migration ledger with the repository's 6-entry
   journal, then verify a clean `db:migrate` replay on an isolated branch.
6. External owner checks: rotate exposed historical tokens, verify Railway/Clerk/
   Google/Sentry variables, complete a fresh non-admin journey, and produce a
   teacher-scored multi-format benchmark.

## Organization follow-ups

- Split `src/lib/api-client.ts` by domain only when query-key and response-envelope
  tests can protect the move; it currently mixes classroom, assignment, student,
  submission, analytics, Google, upload, and grading hooks.
- Centralize repeated teacher ownership predicates into focused domain access
  helpers only with cross-account denial tests. Do not weaken route-level checks.
- Gradually extract the largest route/page modules (`src/app/page.tsx`, assignment
  creation, and assignment detail) when a feature change supplies a tested
  ownership boundary. Avoid repository-wide cosmetic moves.

## Recent verified changes

### 2026-07-23 - Teacher-owned Google Sheet connection

- Removed the service-account fallback from teacher sheet discovery, submission
  sync, Drive downloads, and grading-time file retrieval. Unconnected or expired
  accounts now receive an actionable reconnect response.
- Assignment creation now checks Google connection state, explains read-only
  access, lists only the connected teacher's Sheets, and accepts a validated full
  Sheets URL or ID. Obsolete service-account sharing instructions were removed.
- Fixed Google disconnect to revoke the decrypted access token and removed the
  dashboard-mount request that silently invoked the state-changing sync-all route.
- Lint, TypeScript, 17 tests, and the 31-page production build passed. Local UI
  navigation was blocked by a Clerk `127.0.0.1` to `localhost` development-origin
  mismatch; compilation and production build completed successfully.

### 2026-07-23 - Agent skill research and adoption gate

- Nora used read-only Chrome research to evaluate current skill candidates for
  Kelly, Maya, Theo, Arjun, Iris, Sana, Quinn, Rowan, and Nora; research tabs were
  closed and no skill, permission, or external account was changed.
- Kelly reviewed primary sources and added `docs/agents/SKILL_MATRIX.md` with
  built-in, ready-for-review, local-adaptation, watch, and rejected categories.
- Added a pre-install gate covering complete content review, scripts/hooks/MCP,
  permissions, telemetry, revision pinning, static/manual review, disposable
  testing, and denial of production credentials by default.
- `npm run verify` passed repository and Drizzle audits, 30-document link checks,
  lint, TypeScript, 14 tests, and the 31-page production build. The production
  dependency audit initially received a transient npm advisory-service 503;
  registry ping succeeded and the immediate rerun reported zero vulnerabilities.

### 2026-07-23 - Browser research agent and automatic task routing

- Added Nora as the browser research and verification specialist for current
  primary-source research, live UI inspection, and signed-in Chrome workflows.
- Added a mandatory per-task routing decision for Kelly while preserving local
  source, connector, API, and CLI preference when browser control is unnecessary.
- Verified the ChatGPT Chrome integration connects successfully without claiming,
  opening, or modifying any tab. Added explicit credential, student-data,
  permission, authentication, and production-action boundaries.
- `npm run verify` passed repository and Drizzle audits, 29-document link checks,
  lint, TypeScript, 14 tests, and the 31-page production build. Production
  dependency audit reported zero vulnerabilities.

### 2026-07-23 - Named GradeAI agent roster

- Assigned persistent, role-qualified identities across the team documentation,
  prompts, operating model, and launch task board: Kelly, Maya, Theo, Arjun,
  Iris, Sana, Quinn, and Rowan.
- `npm run verify` passed repository and Drizzle audits, 28-document link checks,
  lint, TypeScript, 14 tests, and the 31-page production build. Production
  dependency audit reported zero vulnerabilities.

### 2026-07-23 - Agent employee team operating model

- Used independent engineering-operations and privacy/release reviewers to
  pressure-test the team structure without overlapping repository edits.
- Added a lead/integrator and seven specialist role contracts, reusable prompts,
  explicit command and approval boundaries, work-order and handoff templates,
  and a P0 launch task board under `docs/agents/`.
- Integrated bounded subagent delegation into `AGENTS.md`, contributor onboarding,
  documentation navigation, and file-placement rules. The lead remains the sole
  integration, verification, commit, and push owner.
- `npm run verify` passed repository and Drizzle audits, 28-document link checks,
  lint, TypeScript, 14 tests, and the 31-page production build. Production
  dependency audit reported zero vulnerabilities.

### 2026-07-23 - Developer onboarding and repository organization

- Used a dedicated repository-organization subagent with a documentation-only
  write scope, then reviewed its output against the source tree.
- Added `CONTRIBUTING.md`, a documentation index, repository map, implemented
  request-flow guide, and explicit file-placement rules for new hires.
- Added `.editorconfig`, `.gitattributes`, CODEOWNERS, and a PR template covering
  auth, privacy, migrations, AI grading, deployment, and verification risk.
- Added `npm run docs:check` and included it in local verification and CI.
- Preserved existing runtime paths; the audit found no benefit in a mass file
  move and identified incremental module-boundary work instead.

### 2026-07-23 - Neon point-in-time recovery drill

- Created `restore-drill-2026-07-23` from `production` at 10:55 IST with
  one-day auto-deletion. Branch creation took 0.68 seconds; production was not
  modified.
- Confirmed 11 GradeAI tables, representative row counts, and zero failures
  across eight relationship/duplicate checks on the recovery branch.
- Confirmed `drizzle.__drizzle_migrations` exists, but found only 2 ledger rows
  versus 6 repository journal entries. The latest ledger timestamp matches
  migration `0005`; earlier schema was most likely applied with `db:push`.
- Added `db:check` to verification/CI, added `db:migrate`, and restricted
  `db:push` documentation to disposable local databases. Ledger reconciliation
  remains required before running migrations against production.

### 2026-07-22 - Launch-readiness baseline

- Added fail-closed account authorization and suspended-user enforcement.
- Centralized required R2 configuration and removed hardcoded public-host fallbacks.
- Made mutation schemas strict and added 14 critical unit tests plus CI.
- Added repository/environment audits, production security headers, canonical
  metadata, `robots.txt`, `sitemap.xml`, and a real deployment README.
- Patched Next.js and production transitives. Repository audit, lint, TypeScript,
  tests, production dependency audit, build, and local production smoke passed.
- Fixed Clerk protection accidentally intercepting generated SEO routes, rebuilt,
  and confirmed both routes return 200 while dashboard/admin/API remain protected.

### 2026-07-22 - Persistent context workflow

- Confirmed no separate whole-project Claude handoff existed; the previous
  `CLAUDE.md` only imported `AGENTS.md` and `.claude/polish-scoreboard.md` covered
  UI work only.
- Established this file as the canonical project handoff and added mandatory
  read/update rules to `AGENTS.md`.
- Committed and pushed the launch-readiness baseline to `origin/main` as
  `08072cb`, then recorded the standing automatic commit/push preference.
