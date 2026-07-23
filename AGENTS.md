<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project context continuity

`CLAUDE.md` is the persistent GradeAI project handoff. Read it before every
non-trivial project task, then inspect the relevant source files instead of
assuming the handoff is perfectly current.

After every completed project task:

1. Update the `Last updated` date when project state changed.
2. Add a concise entry to `Recent verified changes` describing what changed and
   which checks passed.
3. Update `Current release state` or `Known launch blockers` when the task
   changes either section.
4. Record only verified facts. Never store credentials, secret values, student
   work, personal data, or production tokens in Markdown.

## Agent team workflow

GradeAI's reusable team contracts live in `docs/agents/`. For non-trivial work
with genuinely independent workstreams, the lead may use the specialist roles
defined there as subagents. Keep trivial or tightly coupled work with one agent.

For every user task, Kelly first makes a routing decision and selects the minimum
team needed. Kelly handles trivial and critical-path work directly, assigns
implementation to the matching domain specialists, and assigns current web
research, signed-in Chrome workflows, live-site inspection, or browser evidence
to Nora when those capabilities materially help. Browser use is not mandatory
when local source, a connector, an API, or a CLI is the better surface.

Before delegation:

1. State the dependency graph and the immediate critical-path step the lead will
   handle locally.
2. Give each specialist a concrete outcome, acceptance evidence, and a disjoint
   write set using `docs/agents/templates/WORK_ORDER.md`.
3. Keep shared contracts and integration files under one writer at a time.

Kelly, the lead, remains the sole integrator: review every handoff and diff, run final
verification, update `CLAUDE.md`, and own staging, commit, and push. Specialists
must not silently expand scope, revert unrelated changes, commit, push, deploy,
or operate production.

Because `main` can deploy through Railway, a direct owner request to implement
and push a named change counts as approval for that code delivery only. It does
not authorize a production migration, provider-console change, production-data
access, credential or role operation, billing action, legal publication, or
destructive operation. Those actions require separate explicit owner approval as
defined in `docs/agents/OPERATING_MODEL.md`.
