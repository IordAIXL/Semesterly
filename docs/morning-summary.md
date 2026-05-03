# Morning Summary

## What changed overnight

Semesterly moved from prototype shell to a much more complete MVP direction.

## Main app

- Daily dashboard
- Student picker with 20 sample students
- Priority queue
- Priority explanations
- Next up
- Due soon
- Risk watch
- Suggested focus plan
- Semesterly coach nudges
- Smart capture
- Multi-line task capture
- Focus timer mock
- Courses page
- Assignments page
- Week page
- Insights page
- Trust Center
- Admin page

## Admin / data access

Admin tab exists.

Demo code:

```txt
DOM-DEMO
```

Admin can view:

- all users
- schools
- majors
- classes
- assignments
- events

Normal users should not see this.

Backend protection started:

- `GET /api/admin/users` requires `ADMIN_TOKEN`
- admin route returns `401` without token
- admin audit log model exists

## Privacy / trust

Added:

- Trust Center page
- export data demo button
- clear/delete demo controls
- `GET /api/privacy/export`
- guarded `DELETE /api/privacy/delete`
- security/trust plan

## Backend/API

Added DB-backed routes:

- `GET /api/me`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/events`
- `POST /api/events`
- `POST /api/tasks/parse`
- `GET /api/admin/users`

## Database

- Prisma schema expanded
- roles added: `USER`, `ADMIN`
- user year/major added
- admin audit log model added
- SQLite database seeded
- 20 sample students added
- Dom admin record added

## Verification

Passing:

```bash
npm run typecheck
npm run build
npm run smoke
```

Live dev server:

```txt
http://localhost:3000
```

## Not production-ready yet

Still needed:

- real auth
- real admin roles
- hosted database
- connect frontend forms to DB routes
- deployment
- real notification/calendar integrations
- stronger delete/export UI confirmations

## Best demo path

1. Open `http://localhost:3000`
2. Use the 60-second demo path card: Today Plan -> Week Calendar -> Trust Controls
3. Switch students and point out the confirmation banner
4. Use Today Plan to schedule a focus block into an open calendar slot
5. Add a task with Smart capture
6. Open Courses and show course risk overview + highest-risk drilldown
7. Open Profile for Insights and Trust controls
8. Type `DELETE` to show guarded destructive action UX without deleting unless intended
9. Open Admin with `DOM-DEMO`
10. Explain server-side admin route protection and user-scoped smoke checks
