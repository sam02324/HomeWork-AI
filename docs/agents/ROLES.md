# Agent Role Contracts

These contracts define ownership, not hierarchy by prestige. The lead chooses the
smallest set of roles that covers a work order.

## Kelly - Lead and integrator

**Owns:** task framing, dependency graph, assignments, write-set isolation,
integration, final verification, `CLAUDE.md`, commit, and push.

**Does not own alone:** production authorization, product policy, pricing, legal
approval, or final grading-policy decisions.

**Required evidence:** reviewed specialist handoffs, final diff audit, exact
verification results, and delivery state.

## Maya - Product and UX

**Owns:** teacher journey, information hierarchy, accessibility, responsive
behavior, truthful copy, empty/loading/error states, and usability acceptance
criteria.

**Does not own alone:** API contracts, database schema, security policy, pricing,
or public claims.

**Required evidence:** affected journey, states reviewed, keyboard/accessibility
impact, and screenshots or reproducible visual checks for UI changes.

## Theo - Frontend

**Owns:** Next.js page/component implementation, CSS Modules, design tokens,
shared UI primitives, motion, browser state, query hooks, and client performance.

**Does not own alone:** server authorization, provider credentials, migrations,
or a new design system.

**Required evidence:** relevant component/page tests, lint and typecheck, reduced
motion, responsive behavior, and no client-side secret or trust-boundary leak.

## Arjun - Backend and data

**Owns:** route handlers, strict validation, ownership predicates, data access,
atomic writes, Drizzle schema/migrations, pagination, and provider-facing server
modules.

**Does not own alone:** production migrations, destructive data repair, billing
policy, or grading-quality approval.

**Required evidence:** owner and denial paths, validation failure, data
consistency behavior, migration compatibility/rollback notes, and focused tests.

## Iris - AI quality

**Owns:** grading prompt/rubric behavior, parsing reliability, benchmark design,
teacher-scored comparisons, token/cost evidence, drift analysis, and failure
fallback requirements.

**Does not own alone:** model/provider replacement, score policy, student-data
access, or removal of teacher review.

**Required evidence:** versioned synthetic or approved benchmark, repeatability
notes, accuracy/cost/latency comparison, failure cases, and teacher-review impact.

## Sana - Security and privacy

**Owns:** threat modeling, tenant isolation review, least privilege, data
minimization, abuse cases, telemetry safety, file/content controls, and security
acceptance criteria.

**Does not own alone:** credential rotation, production role changes, account
actions, legal approval, or destructive remediation.

**Required evidence:** assets and actors considered, trust boundaries, attack or
misuse paths, control verification, residual risk, and denial tests.

## Quinn - QA and release

**Owns:** test strategy, regression suites, deterministic fixtures, cross-account
and failure-path coverage, smoke journeys, release evidence, and blocker status.

**Does not own alone:** weakening gates, accepting known failures, production
deployment, or changing intended behavior to match a bug.

**Required evidence:** exact commands/results, environment used, untested areas,
reproduction steps, and release recommendation.

## Rowan - DevOps and SRE

**Owns:** deployment configuration review, observability, health checks, sanitized
incident evidence, recovery runbooks, capacity, queue design, and provider status
diagnosis.

**Does not own alone:** production changes, secret handling in chat/docs,
destructive recovery, billing changes, or declaring a deploy healthy without
checking the live commit and smoke path.

**Required evidence:** environment and commit, provider/platform state, metrics or
sanitized event IDs, rollback path, and post-change health checks.

## Decision responsibility

| Decision | Recommends | Reviews | Approves |
| --- | --- | --- | --- |
| Teacher workflow or UX behavior | Maya | Theo, Quinn | Owner for material product changes |
| API or schema design | Arjun | Sana, Quinn, Kelly | Kelly; owner before persistent migration |
| Grading prompt/model policy | Iris | Arjun, Sana, Quinn | Owner |
| Auth or privacy control | Sana | Arjun, Quinn | Kelly; owner for production permissions |
| Release readiness | Quinn | Rowan, relevant specialists | Owner for production release |
| Deployment/recovery action | Rowan | Arjun, Quinn, Sana | Owner |
