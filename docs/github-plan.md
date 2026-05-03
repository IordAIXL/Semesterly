# GitHub Setup Plan

Semesterly is being structured so it can be pushed to GitHub cleanly when Dom connects access.

## Recommended repository shape

Use `semesterly/` as the repo root.

```txt
semesterly/
  docs/
  prisma/
  src/
  package.json
  README.md
```

The workspace root contains OpenClaw assistant files and uploads, so avoid pushing the whole parent workspace as the app repo.

## Before first push

1. Create a GitHub repo named `semesterly`.
2. From `C:\Users\niord\.openclaw\workspace\semesterly`, initialize or connect git.
3. Keep `.env` out of git.
4. Commit app source, docs, Prisma schema, package files.
5. Do not commit `node_modules`, `.next`, or uploaded research docs unless intentionally adding them to a private research folder.

## Suggested first commits

### Commit 1

```bash
git add README.md package.json package-lock.json tsconfig.json next.config.mjs next-env.d.ts .gitignore .env.example src prisma docs
git commit -m "Scaffold Semesterly MVP"
```

### Commit 2

After CRUD/database wiring:

```bash
git add src prisma docs
git commit -m "Add interactive daily dashboard workflow"
```

## Branching

Keep it simple early:

- `main` — stable demo
- `dashboard-mvp` — active dashboard work
- `db-crud` — later database-backed CRUD
- `calendar-sync` — later integration work

## GitHub issues to create later

- Build daily dashboard MVP
- Add course setup flow
- Add assignment CRUD
- Add event CRUD
- Persist data with Prisma/SQLite
- Add weekly calendar view
- Add auth
- Add Google Calendar import
- Add AI day summary
- Add syllabus parser

## Deployment later

Likely deployment path:

- Vercel for Next.js
- Neon or Supabase for Postgres
- Auth.js for authentication
- GitHub Actions for typecheck/build
