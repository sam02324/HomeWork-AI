# GradeAI Agent Team

This directory defines the reusable AI team that works on GradeAI. The team is
an operating model, not a set of continuously running background workers. A lead
agent instantiates only the roles needed for a bounded task, reviews their work,
and remains accountable for the integrated result.

## Team roster

| Role | Primary responsibility | Prompt |
| --- | --- | --- |
| Owner | Product authority, production approval, policy, budget, and external communication | Human role |
| Lead and integrator | Plan, delegate, resolve conflicts, verify, document, commit, and push | [Lead prompt](prompts/lead.md) |
| Product and UX | Teacher workflows, truthful product behavior, accessibility, and design quality | [Product and UX prompt](prompts/product-ux.md) |
| Frontend | Next.js UI, CSS Modules, shared components, responsive behavior, and motion | [Frontend prompt](prompts/frontend.md) |
| Backend and data | APIs, authorization, validation, Drizzle, migrations, and provider boundaries | [Backend and data prompt](prompts/backend-data.md) |
| AI quality | Rubrics, grading accuracy, benchmarks, model usage, and cost evidence | [AI quality prompt](prompts/ai-quality.md) |
| Security and privacy | Tenant isolation, student-data minimization, abuse cases, and control review | [Security and privacy prompt](prompts/security-privacy.md) |
| QA and release | Tests, regression evidence, launch gates, and release qualification | [QA and release prompt](prompts/qa-release.md) |
| DevOps and SRE | Railway, Neon, R2, Google, Sentry, observability, and recovery runbooks | [DevOps and SRE prompt](prompts/devops-sre.md) |

## Start a task

1. Read `AGENTS.md`, `CLAUDE.md`, and the relevant architecture or launch docs.
2. Create a [work order](templates/WORK_ORDER.md) with one outcome, acceptance
   evidence, dependencies, and an explicit write set.
3. The lead identifies the critical path and keeps the immediate blocking work
   local. Independent sidecars may be delegated to specialists.
4. Specialists return a [handoff](templates/HANDOFF.md). They do not silently
   expand scope, commit, push, deploy, or operate production.
5. The lead reviews the diff, runs the required verification, updates canonical
   documentation, and owns the final commit and push.

The detailed command chain, approval gates, and definition of done are in the
[operating model](OPERATING_MODEL.md). Role boundaries are in [roles](ROLES.md),
and prioritized work is tracked in the [task board](TASK_BOARD.md).

For a future task, the owner can simply say `Use the GradeAI team for <outcome>`
or `Start GAI-002`. The lead will create the work order, choose the minimum roles,
run integration and verification, update the board, and deliver the verified
change. No role remains active after its bounded assignment is complete.

## Rules that always apply

- Source code and committed migrations remain authoritative.
- Agents inspect current code before proposing or editing behavior.
- Each delegated task has one owner and a non-overlapping write set.
- Student work, personal data, credentials, tokens, provider payloads, and
  production records never enter prompts, Markdown, test fixtures, or telemetry.
- AI grading remains advisory. A teacher owns the final grade.
- Only the human owner approves production mutations, destructive operations,
  account-role changes, billing decisions, legal/public claims, or grading-model
  policy changes.
- A completed handoff is evidence, not automatic acceptance. The lead must review
  and verify it.
