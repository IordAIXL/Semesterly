# Deployment Notes

## Current deploy target

Semesterly is now set up as a deployable demo app with:

- Next.js App Router frontend and API routes
- Prisma-backed users, courses, tasks, events, privacy export/delete, demo reset, readiness, and admin users
- API-backed frontend loading for selected students, with local fallback if the API is unavailable
- User-scoped task/course/event routes
- Real account registration and password login with PBKDF2 password hashes and signed HttpOnly session cookies
- Same-origin guard for cookie-backed mutation routes
- Signed session-token support, with `x-user-id` kept only as an explicit demo-auth bridge
- Admin API token protection plus server-verified admin demo sessions
- PWA/mobile install shell with manifest, icons, standalone viewport metadata, service worker, and offline fallback
- Pinned dependency versions
- `npm audit` clean state
- `npm run deploy:check` for pre-deploy guardrails

## Required environment

```txt
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/semesterly?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/semesterly?sslmode=require"
ADMIN_TOKEN="replace-with-a-long-random-token"
SESSION_SECRET="replace-with-at-least-32-random-characters"
DEMO_AUTH_ENABLED="false"
```

Use Postgres for hosted/serverless production. For Neon/Supabase pooled connections, use the pooled URL for `DATABASE_URL` and the direct/unpooled URL for `DIRECT_URL`.

Local/offline demos can still use SQLite through `prisma/schema.sqlite.prisma` and the `db:local:*` scripts. Production deploy checks now fail if demo auth is enabled or if `DATABASE_URL` is not Postgres.

## Pre-deploy validation

Run:

```bash
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
npm run agent:check
npm audit
npm run deploy:check
```

`npm run build` also runs `prisma generate`, but Windows can lock Prisma's query engine DLL locally. If that happens, use `npx next build` for frontend validation and report the Prisma DLL lock plainly.

`npm run smoke` also checks the PWA manifest, offline page, and service worker so mobile install regressions fail before deploy.

## Data model now needed by deploy

Events support optional `courseId`, so course calendars stay meaningful when loaded from the API. Users support `email` and `passwordHash` for first-party auth.

For production schema changes, use migrations:

```bash
npm run db:migrate
```

Seed only when intentionally preparing demo data:

```bash
npm run db:seed
```

For local SQLite demo maintenance:

```bash
npm run db:local:push
npm run db:seed
```

See `docs/postgres.md` for the full Postgres deployment plan.

## Known production gaps

Before a real public beta:

1. Add email verification and password reset.
2. Add account/profile settings for password change and email changes.
3. Add optional stricter CSRF token flow if Origin/Referer checks are not enough for launch.
4. Add real calendar import/sync and background jobs.
5. Add hosted observability/error monitoring.
