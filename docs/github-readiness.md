# GitHub Readiness

## Repo root

Use this folder as the repo root:

```txt
semesterly/
```

Do not push the parent OpenClaw workspace.

## Safe to commit

- `src/`
- `prisma/schema.prisma`
- `prisma/seed.js`
- `docs/`
- `.github/workflows/ci.yml`
- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`
- `README.md`

## Do not commit

- `.env`
- `node_modules/`
- `.next/`
- `prisma/dev.db`
- uploaded research docs unless intentionally sanitized

## Suggested first commit

```bash
git init
git add .
git commit -m "Build Semesterly MVP demo"
```

## Before pushing public

- Replace demo admin code with real auth plan.
- Keep `ADMIN_TOKEN` out of git.
- Review docs for private notes.
- Confirm no uploaded docs are inside repo.

## CI

GitHub Actions runs:

- `npm ci`
- `npx prisma validate`
- `npm run typecheck`
- `npm run build`
