# Agent Team Operating Model

## Command chain

1. **Owner:** sets product intent and approves high-impact decisions.
2. **Lead and integrator:** converts intent into work orders, owns the dependency
   graph, assigns specialists, integrates changes, and signs off on evidence.
3. **Specialists:** execute bounded work within an assigned write set and return
   a structured handoff.

No specialist overrides the lead's scope, and no agent overrides an owner
approval gate.

## Delegation model

The lead uses a single agent for trivial or tightly coupled work. For non-trivial
work, the lead may delegate when all of these are true:

- the subtask materially advances the requested outcome;
- its inputs and acceptance criteria are discoverable now;
- it can run independently of the lead's immediate blocking step;
- its write set does not overlap another active worker;
- the lead can review and test the result before integration.

Prefer two or three focused workers over a large swarm. Coordination cost and
conflicting edits usually exceed the value of more parallelism.

QA/release and DevOps/SRE remain separate responsibility contracts because one
qualifies behavior while the other operates infrastructure. A lead may assign
both contracts to one worker for a small, low-risk task.

Before delegation, the lead records:

- the critical path and dependency order;
- what the lead will do immediately;
- the specialist role and bounded outcome;
- files or directories the specialist may edit;
- required tests and handoff evidence;
- any owner approval gate.

## Write and Git ownership

- One active worker owns a file at a time.
- Shared contracts such as `src/db/schema.ts`, migrations,
  `src/lib/validations.ts`, `src/lib/api-client.ts`, `src/proxy.ts`,
  `next.config.ts`, package manifests, `AGENTS.md`, and `CLAUDE.md` change
  sequentially under the lead or one explicitly assigned writer.
- Specialists do not modify files outside their work order.
- Specialists do not revert pre-existing or unrelated changes.
- For an agent-run task, the lead is the sole integrator and owns final staging,
  commit, and push unless the work order explicitly delegates a separate branch.
- The lead reviews `git diff`, stages only task-owned files, and confirms the
  destination branch and remote before pushing.
- Routine verified changes follow the standing automatic delivery preference.
  A direct owner request to implement and push a named high-risk change is the
  approval for that code delivery; it does not authorize any separate production
  operation listed below.
- Deployment success is separate from Git push success and must be verified
  independently when deployment is part of the request.

## Human approval gates

Agents may investigate, draft, test locally, and recommend. Explicit owner
authorization is required immediately before any of these actions:

- writing to, migrating, restoring, or deleting data in a persistent database;
- changing production Railway, Clerk, Google, R2, Sentry, DNS, or GitHub settings;
- creating, rotating, revealing, copying, or revoking credentials or role grants;
- suspending accounts, changing quotas/credits, or viewing real student content;
- deleting branches, buckets, objects, users, submissions, or production logs;
- changing pricing, billing, refunds, entitlements, or cost-bearing limits;
- publishing legal language, customer claims, testimonials, usage figures, or
  external communications;
- changing the approved grading provider, model policy, scoring interpretation,
  or teacher-review guarantees.

An owner approval is scoped to the named action and environment. It is not a
standing permission for later actions.

## Data and privacy protocol

- Use synthetic fixtures and disposable development accounts by default.
- Minimize data passed between agents to the exact fields needed.
- Never place student submissions, names, contact details, OAuth tokens,
  credentials, raw provider errors, or production database rows in prompts.
- Sanitize diagnostics before handoff. Reference a secure system or event ID
  instead of copying sensitive payloads.
- If real data is unexpectedly exposed, stop processing it, avoid reproducing
  it, and tell the owner what location must be secured or rotated.

## Work lifecycle

1. **Intake:** define the user/operator outcome and non-goals.
2. **Trace:** inspect `CLAUDE.md`, relevant docs, source, tests, and current Git
   state.
3. **Plan:** record dependencies, risk, write ownership, and acceptance evidence.
4. **Execute:** keep changes focused; specialists report blockers early.
5. **Review:** lead checks behavior, authorization, privacy, migrations, UI, and
   operational impact as applicable.
6. **Verify:** run focused checks first, then the repository gate required by
   `CLAUDE.md`; never report an unexecuted check as passing.
7. **Document:** update canonical docs and release blockers only with verified
   facts.
8. **Deliver:** lead audits the staged diff, commits, pushes, and reports any
   deployment or owner-only action separately.

## Failure protocol

When behavior differs from expectation:

1. State observed versus expected behavior.
2. Rank three plausible hypotheses.
3. Test the highest-likelihood hypothesis with the smallest discriminating check.
4. Record the root cause and regression protection after it is confirmed.
5. Escalate only when progress requires an owner-only decision or external state.

Do not hide a failed check, lower a quality gate, or broaden permissions to make
verification pass.

## Definition of done

A task is complete only when:

- acceptance criteria are demonstrably met;
- delegated handoffs were reviewed, not merely received;
- authorization and cross-account behavior were considered for protected work;
- tests cover the changed happy path and important denial/failure path;
- required documentation and `CLAUDE.md` are current;
- the repository verification contract passes, or exact failures are reported;
- the staged diff contains only task-owned files;
- commit, push, deployment, and production operation states are reported as
  separate facts.
