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
