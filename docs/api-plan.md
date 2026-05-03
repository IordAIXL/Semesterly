# API Plan

## Current demo API

### Health

```txt
GET /api/health
```

Returns app/database health for deployment checks.

### Current user

```txt
GET /api/me
x-user-id: <user id>
```

Returns only that user's data:

- profile
- courses
- assignments
- events

This models user isolation.

### Admin users

```txt
GET /api/admin/users
x-admin-token: <ADMIN_TOKEN>
```

Returns all users and their inputted data.

Admin access is restricted server-side.

## Privacy routes

Export route returns the signed-in user's data bundle.

Delete route requires:

```txt
x-confirm-delete: DELETE-MY-DATA
```

It blocks admin account deletion.

## Security rules

- User routes return only the signed-in user's data.
- Admin routes require admin auth.
- Admin access should create audit logs.
- No client-side-only security for production.
- Secrets stay in environment variables.

## Current CRUD routes

```txt
GET /api/tasks
POST /api/tasks
PATCH /api/tasks/:id
DELETE /api/tasks/:id
GET /api/courses
POST /api/courses
GET /api/events
POST /api/events
POST /api/tasks/parse
GET /api/health
GET /api/privacy/export
DELETE /api/privacy/delete
```

All user routes require:

```txt
x-user-id: <user id>
```

## Next API work

- connect frontend forms to DB routes
- real auth session checks
- admin role checks
- connect frontend forms to DB routes
