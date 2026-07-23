## What changed

<!-- Describe behavior, not just filenames. -->

## Why

<!-- Link the issue/decision and state the user or operational outcome. -->

## Risk

- [ ] Authentication or authorization
- [ ] Database schema or migration
- [ ] Student data, uploads, Google tokens, or other sensitive content
- [ ] AI grading behavior, rubric scoring, or model usage/cost
- [ ] Deployment variables, Railway, Clerk, Neon, R2, Google, or Sentry
- [ ] UI-only change

## Verification

- [ ] `npm run audit:repo`
- [ ] `npm run db:check`
- [ ] `npm run docs:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Happy path tested
- [ ] Relevant failure/forbidden path tested

## Database checklist

- [ ] No schema change
- [ ] Migration generated and reviewed
- [ ] Forward migration tested on an isolated Neon branch
- [ ] Rollback/recovery steps documented
- [ ] Production migration ledger reconciled before deployment

## Evidence

<!-- Add screenshots for visual changes and sanitized logs/results for operations. -->

## Documentation

- [ ] `CLAUDE.md` current state/change log updated
- [ ] Developer or operations documentation updated where behavior changed
- [ ] No secret, token, DSN, student work, or personal data included
