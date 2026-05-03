# Postgres Deployment Plan

Semesterly's primary Prisma schema now targets Postgres for deploys. A SQLite schema is kept only for local/offline demos.

## Files

- Primary deploy schema: `prisma/schema.prisma`
  - `provider = "postgresql"`
  - `DATABASE_URL` for runtime
  - `DIRECT_URL` for Prisma migrations
- Local demo schema: `prisma/schema.sqlite.prisma`
  - `provider = "sqlite"`
  - uses local `.env` `DATABASE_URL="file:./dev.db"`
- Initial deploy migration: `prisma/migrations/0001_init_postgres/migration.sql`

## Environment

Production needs:

```txt
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/semesterly?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/semesterly?sslmode=require"
ADMIN_TOKEN="long-random-admin-token"
SESSION_SECRET="at-least-32-random-characters"
DEMO_AUTH_ENABLED="false"
```

For Neon/Supabase pooled runtime connections, use the pooled URL for `DATABASE_URL` and the direct/unpooled URL for `DIRECT_URL`.

## Commands

Deploy database migrations:

```bash
npm run db:migrate
```

Seed demo data when intentionally preparing a demo environment:

```bash
npm run db:seed
```

Local SQLite demo maintenance:

```bash
npm run db:local:push
npm run db:seed
```

## Validation

Before deploy:

```bash
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
npm run agent:check
npm audit
npm run deploy:check
```

Also verify production env posture:

```bash
NODE_ENV=production \
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/semesterly?sslmode=require" \
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/semesterly?sslmode=require" \
ADMIN_TOKEN="long-random-admin-token" \
SESSION_SECRET="at-least-32-random-characters" \
DEMO_AUTH_ENABLED="false" \
npm run deploy:check
```

## Notes

- Do not use SQLite for serverless/hosted production.
- Keep `DEMO_AUTH_ENABLED="false"` in production. Real email/password sessions and admin token/session auth should be used instead.
- `x-user-id` exists only as a local/demo bridge and is blocked by deploy guardrails when demo auth is enabled in production.
