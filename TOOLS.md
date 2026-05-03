# TOOLS.md - Semesterly

## Repo

Workspace root is the Semesterly repo.

Important files:

- `src/components/SemesterlyApp.tsx` — main demo UI
- `src/app/globals.css` — global styling/theme
- `src/lib/types.ts` — app types
- `src/lib/sample-users.ts` — sample data
- `prisma/schema.prisma` — production Postgres schema
- `prisma/schema.sqlite.prisma` — local SQLite schema

## Validation

Preferred checks:

```powershell
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
```

`npm run build` can fail on Windows if Prisma's query-engine DLL is locked by another Node process. If it fails with EPERM rename, do not waste time pretending it is a code failure; use `npx next build` and report the lock.
