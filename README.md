# Semesterly

One dashboard. Every app. Automatic priorities.

Semesterly is a student-first academic command center. The MVP focuses on the daily dashboard: courses, assignments, schedule, and an explainable priority queue.

## Demo target

Laptop-first daily dashboard with a clean Google Calendar-style aesthetic.

Current prototype includes:

- Today dashboard
- Daily brief
- Priority queue with explanations
- Next up card
- Today schedule
- Due soon card
- Suggested focus plan
- Quick assignment add
- Course, assignment, and schedule entry screens
- Browser persistence via `localStorage`
- Prisma schema ready for DB-backed persistence later

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>.

## Verify

```bash
npx prisma validate
npm run typecheck
npm run build
```

## Docs

- `docs/product-brief.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/ux.md`
- `docs/research-notes.md`
- `docs/github-plan.md`
- `docs/build-status.md`
- `docs/security-and-trust.md`
- `docs/admin-access.md`
- `docs/competitive-strategy.md`
- `docs/api-plan.md`
- `docs/demo-script.md`
- `docs/morning-summary.md`
- `docs/github-readiness.md`
- `docs/next-build-steps.md`
- `docs/deployment.md`
- `docs/development-agents.md`
- `agents/README.md`

## GitHub note

Use this `semesterly/` folder as the GitHub repository root. Do not push the parent OpenClaw workspace.



