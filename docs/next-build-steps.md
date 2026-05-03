# Next Build Steps

## Highest value next work

1. Add email verification, password reset, and password-change settings.
2. Provision hosted Postgres and run `npm run db:migrate`.
3. Add optional stricter CSRF token flow if same-origin Origin/Referer checks are not enough for launch.
4. Add calendar import/sync.
5. Add syllabus upload/import.
6. Add notifications.
7. Add observability/error monitoring.
8. Add push notifications and native wrapper only after hosted beta feedback.

## Frontend-to-DB plan

Current frontend now gets a signed demo session, loads selected students from `/api/me`, persists task/course/event/focus-block mutations through API routes when available, and can reset the API demo workspace through `/api/demo/reset`.

Done:

- load selected student from `/api/me`
- create tasks via `POST /api/tasks`
- update task status/snooze via `PATCH /api/tasks/:id`
- create courses via `POST /api/courses`
- create events/focus blocks via `POST /api/events`
- delete tasks via `DELETE /api/tasks/:id`
- patch/delete courses and events through API routes
- reset API demo workspace with explicit confirmation
- use signed session tokens after demo session issuance
- fall back to local demo state if the API is unavailable

Next:

- reduce demo session issuance to explicit demo-only entry points
- add reconnect/retry UX from local fallback back to cookie-auth API mode

## Auth plan

Done:

- First-party email/password registration
- PBKDF2 password hashing
- Login with signed HttpOnly session cookie
- Logout/session routes
- Cookie-backed `/api/me` and API mutations through existing `requireUser` seam

Next hardening:

- Email verification
- Password reset/change flow
- Optional stricter CSRF token flow beyond current same-origin Origin/Referer checks
- Optional OAuth/provider login later if growth requires it

Required roles:

- `USER`
- `ADMIN`

Rules:

- users only access their own rows
- admin can access all rows
- admin views are audited

## Deployment plan

Good options:

- Vercel + Neon Postgres
- Vercel + Supabase Postgres
- Railway all-in-one

Need env vars:

```txt
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
ADMIN_TOKEN="long-random-token"
SESSION_SECRET="at-least-32-random-characters"
DEMO_AUTH_ENABLED="false"
```

Primary schema is Postgres. Local/offline demos use `prisma/schema.sqlite.prisma` and `db:local:*` scripts.

## Product polish

Done now:

- Mobile web layout has safe-area bottom navigation, compact top controls, stacked cards/forms, touch-sized actions, a horizontal course picker, and stacked calendar views.
- PWA install shell has manifest metadata, icons, standalone viewport settings, service worker registration, and an offline fallback page.

Next:

- Make Smart Capture feel magical.
- Add onboarding: choose school, term, classes.
- Add reminder settings.
- Add empty states.
- Add import flow.
- Add student trust copy near every sensitive action.
