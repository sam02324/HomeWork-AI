# GradeAI

GradeAI is a teacher-reviewed homework grading MVP for Indian teachers and coaching institutes. Teachers can import Google Form responses or upload text, PDF, and image submissions, generate rubric-based draft grades, review or override results, and monitor student performance.

AI output is a draft. The teacher remains the final decision-maker.

## Stack

- Next.js 16 and React 19
- Clerk authentication
- Neon PostgreSQL and Drizzle ORM
- Anthropic Claude
- Google Drive, Sheets, and Forms APIs
- Cloudflare R2 through the AWS S3-compatible SDK
- TanStack Query and Zustand
- Framer Motion, GSAP, Recharts, and CSS Modules
- Sentry monitoring

## Local setup

Requirements:

- Node.js 22 recommended; Next.js requires Node.js 20.9 or newer.
- A Neon PostgreSQL database.
- Clerk development credentials.
- Google OAuth web-client credentials.
- Anthropic and Cloudflare R2 credentials.

Install and configure:

```bash
npm ci
cp .env.example .env.local
# Local/disposable database only:
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

Never commit `.env.local`, `keys.txt`, Google credential JSON, or provider tokens. The repository audit checks tracked files without printing secret values:

```bash
npm run audit:repo
```

## Verification

Run the complete repository verification gate:

```bash
npm run verify
```

Individual checks:

```bash
npm run db:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Validate a local copy of the production environment contract:

```bash
npm run audit:launch
```

The launch audit reports variable names and configuration defects only. It never prints values.

## Database changes

Generate and review a migration:

```bash
npm run db:generate
npm run db:check
```

Apply reviewed migrations to the configured persistent database:

```bash
npm run db:migrate
```

Use `npm run db:push` only for disposable local development databases. Never use
schema push against production: it can update the schema without creating a
complete Drizzle migration ledger. Before the first production `db:migrate`,
confirm Neon `drizzle.__drizzle_migrations` matches
`src/db/migrations/meta/_journal.json`. Take a Neon recovery branch first and
verify forward migration and recovery.

## Google OAuth deployment

1. Set `NEXT_PUBLIC_APP_URL` to the exact HTTPS production origin without a trailing path.
2. Add `${NEXT_PUBLIC_APP_URL}/api/auth/google/callback` as an authorized redirect URI in the matching Google OAuth web client.
3. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in Railway.
4. Set `TOKEN_ENCRYPTION_KEY` to one stable 64-character hexadecimal value generated with `openssl rand -hex 32`.
5. Redeploy, then disconnect and reconnect Google when credentials, deployment account, or the encryption key changes.

Changing `TOKEN_ENCRYPTION_KEY` makes existing encrypted Google tokens unreadable.

## Railway deployment

The app runs as a standard Next.js Node server:

```text
Build command: npm run build
Start command: npm start
```

Before deploying:

1. Run `npm run verify` locally.
2. Run `npm run audit:launch` against the intended production variables.
3. Confirm `npm run db:check` passes and the production migration ledger matches
   the repository journal before applying `npm run db:migrate`.
4. Verify Clerk, Google, Anthropic, R2, and Sentry are using the production projects.
5. Deploy a release candidate and complete the smoke journey in `docs/launch/2026-08-beta-readiness.md`.

## Documentation

- [Developer documentation index](docs/README.md)
- [Contribution workflow](CONTRIBUTING.md)
- [Repository guide](docs/architecture/REPOSITORY_GUIDE.md)
- [Major request flows](docs/architecture/REQUEST_FLOWS.md)
- [File placement rules](docs/architecture/FILE_PLACEMENT.md)
- [August beta readiness](docs/launch/2026-08-beta-readiness.md)
- [Admin panel](docs/admin-panel.md)
- [Security notes](SECURITY.md)
- [Mobile, launch, and long-term roadmap](docs/GRADEAI_PRODUCT_MOBILE_AND_30_YEAR_ROADMAP.md)

## Current release posture

GradeAI should be operated as an invite-only beta until the P0 gates in the beta-readiness document are complete. In particular, current request-bound grading and public R2 object delivery are not the intended broad-launch architecture.
