# GradeAI Agent Skill Matrix

Research date: 2026-07-23

Nora performed read-only Chrome research and Kelly reviewed the primary sources
and local installations. No third-party skill was installed, no permission was
accepted, and no external account or production system was changed.

## Compatibility rule

Codex discovers repository skills under `.agents/skills/` and supports the open
`SKILL.md` format. Claude marketplaces and Gemini plugin directories are separate
installation systems; a skill present there is not automatically available to
Codex. See the [official Codex skill documentation](https://developers.openai.com/codex/skills).

## Status vocabulary

- **Built in:** available in the current Codex environment; install nothing.
- **Ready for reviewed install:** strong fit and primary source, but still inspect
  and pin it before installation.
- **Adapt locally:** use the method to create a GradeAI-scoped repository skill;
  do not grant the upstream package broad authority.
- **Watch:** potentially useful after a concrete need and permission review.
- **Reject:** stale, redundant, incompatible, or insufficiently trustworthy.

## Role matrix

| Agent | Candidate | Decision | GradeAI use and boundary |
| --- | --- | --- | --- |
| Kelly | [Superpowers](https://github.com/obra/superpowers): planning, TDD, systematic debugging, and verification | Adapt locally | The methods are valuable and already reflected in GradeAI's operating model. Do not install the full workflow blindly: it adds hooks/scripts, overlaps Kelly's routing rules, and has optional external visual telemetry. Review and copy only bounded methods when a gap exists. |
| Kelly | Codex `review-agent` | Built in | Use for read-only, defect-first review of a bounded diff. It cannot edit, commit, push, or delegate. |
| Maya | Codex `product-design:audit` | Built in | Screenshot-first UX and accessibility review with no additional supply-chain dependency. |
| Maya | Vercel [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Ready for reviewed install | Useful for accessibility, focus, forms, motion, theming, touch, and performance audits. It supplements teacher research; it does not define product truth. |
| Theo | Vercel [React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | Ready for reviewed install | High-value React/Next.js performance guidance. GradeAI's installed Next.js 16 documentation and local conventions remain authoritative when guidance conflicts. |
| Theo | Vercel Web Design Guidelines | Ready for reviewed install | Share Maya's reviewed copy instead of adding a second frontend design system. |
| Arjun | Neon [Postgres Best Practices](https://github.com/neondatabase/postgres-skills/tree/main/skills/postgres-best-practices) | Adapt locally | Official, vendor-neutral schema/index/query guidance, but the repository was new at review time. Pin a reviewed revision and remove any implication of production SQL, credentials, console access, or migration authority. |
| Iris | [Promptfoo](https://github.com/promptfoo/promptfoo) evaluation workflow | Adapt locally | Build a GradeAI-specific synthetic benchmark skill for rubric accuracy, variance, parsing, cost, and latency. Promptfoo is tooling, not a drop-in role skill; model calls cost money and require approved credentials. |
| Iris | Generic community prompt-engineering skills | Reject | They do not replace a teacher-scored benchmark, GradeAI rubric constraints, privacy rules, or model-change approval. |
| Sana | Trail of Bits [Insecure Defaults](https://github.com/trailofbits/skills/tree/main/plugins/insecure-defaults/skills/insecure-defaults) | Ready for reviewed install | Strong fail-open/auth/configuration review. Its shell access makes it medium risk; default to read-only inspection and preserve owner approval for remediation. |
| Sana | Trail of Bits [Differential Review](https://github.com/trailofbits/skills/tree/main/plugins/differential-review) | Adapt locally | Restrict to task-owned Git diffs and security findings. It must not modify files, remediate automatically, commit, or push. |
| Quinn | Existing Chrome/browser workflow plus `npm run verify` | Built in | Preferred browser and repository verification path; avoids a redundant automation stack. |
| Quinn | Anthropic [Webapp Testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Watch | Its reconnaissance pattern is useful, but its Claude/Python Playwright assumptions duplicate Codex Chrome and GradeAI's current test workflow. |
| Rowan | Official [Sentry for Codex](https://github.com/getsentry/plugin-codex) | Watch | Supports setup and issue triage through Sentry MCP. Install only for a concrete workflow after scope review because it can expose production telemetry. GradeAI redaction rules remain mandatory. |
| Rowan | Archived `getsentry/sentry-agent-skills` | Reject | The upstream repository states it was superseded and is no longer the current distribution. |
| Nora | Existing Codex Chrome control | Built in | Use signed-in Chrome for explicit browser tasks without inspecting cookies, storage, profiles, passwords, or hidden credentials. |
| Nora | Sentry [Skill Scanner](https://github.com/getsentry/skills/tree/main/skills/skill-scanner) | Adapt locally | Useful as one pre-install signal for prompt injection, scripts, and excessive permissions. It uses Python/`uv`/shell and cannot replace manual review. |

## Minimal approved direction

Avoid a large marketplace stack. The highest-value sequence is:

1. Keep Codex review, product-design audit, Chrome, and GradeAI verification as
   the default built-in capabilities.
2. Review and pin Vercel React Best Practices and Web Design Guidelines for Theo
   and Maya.
3. Review and pin Trail of Bits Insecure Defaults for Sana with read-only use as
   the default.
4. Create local GradeAI-scoped skills from Neon Postgres guidance and a synthetic
   Promptfoo benchmark rather than granting generic tools production authority.
5. Add the official Sentry Codex plugin only when Rowan has a concrete issue
   triage workflow and the minimum Sentry scopes are known.

Superpowers is already present in the Gemini plugin directory, not Codex. Do not
assume cross-harness installation. GradeAI already encodes its strongest methods:
planning, bounded delegation, systematic debugging, test-first critical logic,
and verification before completion.

## Pre-install gate

Before any external skill is installed or copied into `.agents/skills/`:

1. Confirm the exact role gap and reject redundant capability.
2. Inspect `SKILL.md`, referenced files, scripts, hooks, MCP configuration,
   manifests, network access, telemetry, and license.
3. Pin a reviewed commit or release; record the source and review date.
4. Run static scanning as one signal, then manually review every executable path.
5. Deny production credentials and production-data access by default.
6. Test triggering, non-triggering, failure behavior, and role-authority limits in
   a disposable environment.
7. Update this matrix and `CLAUDE.md` only after verified installation.

An external skill changes method, not authority. `AGENTS.md`, the role contract,
and owner approval gates always win.
