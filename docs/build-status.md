# Build Status

Last verified: Postgres primary schema + SQLite local schema + real account signup + password login + signed HttpOnly sessions + PWA/mobile install shell + API-backed delete/reset flows + readiness check + mobile layout polish + deploy guardrails + build + smoke + audits pass

## Working

- Next.js app shell
- Daily dashboard
- 60-second demo path card that jumps through Today Plan, Week Calendar, and Trust Controls
- Google Calendar-style UI direction
- One-click focus-block scheduling finds an open slot, marks the task in progress, and jumps to Day calendar
- Action confirmation banner for captured tasks, added courses/events, selected students, and scheduled focus blocks
- 20 sample students
- Student picker
- Per-student courses, assignments, and events
- Priority queue with explanations
- Today Plan card with top task, top-three focus sequence, next calendar item, direct start/done actions, and smart focus-block scheduling
- Due soon
- Next up
- Risk watch
- Suggested focus plan
- Semesterly coach smart nudges
- Smart capture beta
- Multi-line syllabus/task capture
- Natural-language task parser
- `/api/tasks/parse`
- Functional focus timer with task picker, 25/50 minute focus presets, break mode, start/pause, and reset
- Insights page
- Course load analytics
- At-risk assignment view
- First-run Setup page
- Profile/settings page
- Light/dark mode toggle
- Mobile-first polish: safe-area bottom navigation, compact header controls, single-column cards/forms, touch-sized actions, scrollable course picker, and mobile calendar stacking
- PWA/mobile install shell: manifest, app icons, standalone viewport metadata, service worker, and offline fallback page
- Trust Center page
- Export/delete product controls shown in UI
- Trust Center JSON export wired for demo
- Delete account demo requires typing `DELETE` before the destructive action is enabled
- Quick add
- Courses page with course risk overview cards, highest-risk strip, course drilldown, Add dropdown, assignments, exams, and calendar items
- Assignments page
- Week page
- Admin-only demo page
- Protected admin API route
- Health check route
- Readiness route checks required database configuration and connectivity
- Account registration route with password policy, PBKDF2 hashing, and signed HttpOnly session cookie
- Password login route with PBKDF2 password verification and signed HttpOnly session cookie
- Logout and session routes
- Same-origin guard for cookie-backed mutation routes
- Signed demo session route retained only as local/demo bridge
- User-isolated `/api/me` route
- API-backed frontend workspace loading with local fallback
- DB-backed task/course/event API routes
- Task create/update/delete route
- Course patch/delete route
- Event patch/delete route
- API-backed demo reset route with explicit confirmation and admin-account protection
- Server-verified admin demo unlock; the frontend no longer compares a hardcoded admin code
- Privacy export route
- Guarded account delete route
- Postgres primary Prisma schema with `DATABASE_URL` and `DIRECT_URL`
- Initial Postgres migration at `prisma/migrations/0001_init_postgres/migration.sql`
- SQLite local/offline demo schema at `prisma/schema.sqlite.prisma`
- Seed script
- Security/trust docs
- Competitive strategy notes
- Smoke test script with identity/security checks, account-registration cleanup checks, password-login/cookie/logout checks, cookie cross-site mutation rejection, signed-session checks, PWA/offline checks, cross-user ownership rejection checks, mutation lifecycle checks, readiness checks, and demo reset verification
- Deploy check script for pinned dependencies, required env docs, Postgres schema/migration presence, critical API/PWA route presence, critical PWA asset presence, and production env guardrails including failure if demo auth is enabled in production or production DB is not Postgres
- Standing development-agent roster in `agents/`
- Agent manifest with per-agent default files, validation commands, runtime note, and workflows
- Agent CLI helpers for list, brief, prompt generation, workflow display, and structural checks
- Agent audit checks development-agent files, manifest validation, npm scripts, and required report format
- Dependency versions are pinned and PostCSS is overridden to a non-vulnerable version

## Verified commands

```bash
npx prisma validate --schema prisma/schema.prisma
npx prisma validate --schema prisma/schema.sqlite.prisma
npm run db:local:push
npm run db:seed
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
npm run agent:check
npm audit
npm run deploy:check
```

## Development agents

```txt
agents/README.md
agents/product-strategist.md
agents/ux-demo-designer.md
agents/frontend-builder.md
agents/backend-security.md
agents/qa-release.md
agents/growth-research.md
agents/manifest.json
scripts/agent-tools.mjs
docs/development-agents.md
```

## Agent commands verified

```powershell
npm run agent:check
npm run agent:list
npm run agent:brief -- qa-release
npm run agent:prompt -- frontend-builder "Implement one focused UI improvement."
npm run agent:workflow -- demo-polish-loop
```

Runtime note: freshly spawned helpers may refuse their initial assigned task, but follow-up `sessions_send` prompts work. Warm the helper first if needed, then send the generated prompt.

## Verified live API checks

```txt
GET /api/health -> 200
GET /api/ready -> database-ready 200
POST /api/auth/demo-session -> signed user session
POST /api/auth/demo-session -> admin session requires admin token
GET /api/me -> 401 without user id
GET /api/me -> 200
GET /api/tasks -> 401 without user id
GET /api/tasks -> 200
POST /api/tasks -> available
PATCH /api/tasks/:id -> 200
DELETE /api/tasks/:id -> available
GET /api/courses -> 401 without user id
GET /api/courses -> user-scoped list
POST /api/courses -> available
PATCH /api/courses/:id -> 200
DELETE /api/courses/:id -> available
GET /api/events -> 401 without user id
GET /api/events -> user-scoped list
POST /api/events -> available
PATCH /api/events/:id -> 200
DELETE /api/events/:id -> available
POST /api/tasks -> rejects another user's course
POST /api/events -> rejects another user's course
POST /api/demo/reset -> confirmation required
POST /api/demo/reset -> admin account blocked
POST /api/demo/reset -> restores deterministic API seed data
POST /api/tasks/parse -> 200
GET /api/privacy/export -> 200
GET /api/privacy/export -> 401 without user id
GET /api/privacy/export -> user-scoped export
DELETE /api/privacy/delete -> confirmation required
DELETE /api/privacy/delete -> admin account blocked
GET /api/admin/users -> 401 without admin token
GET /api/admin/users -> 200 with admin token
```

## Current dev URL

```txt
http://localhost:3000
```

Note: run smoke after the dev server is already started; otherwise live API fetches correctly fail with connection refused.

## Admin demo

```txt
Admin tab unlock: validated server-side against the admin token
API token: ADMIN_TOKEN env var
GET /api/admin/users
```

## Important note

The frontend admin code is only a demo gate.
Real protection is the server route with `ADMIN_TOKEN` now, then real login/admin roles before production.
