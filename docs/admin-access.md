# Admin Access

Semesterly needs a restricted administrator view.

## Demo

The app has an Admin tab.

Demo unlock code:

```txt
DOM-DEMO
```

This is only a demo gate. It is not real security.

## Real protection

Production admin access must use server-side checks.

Current backend route:

```txt
GET /api/admin/users
```

It requires one of these:

```txt
Authorization: Bearer <ADMIN_TOKEN>
x-admin-token: <ADMIN_TOKEN>
```

If the token is missing or wrong, the server returns `401`.

## Rules

- Students see only their own data.
- Dom/admin can see all users.
- All admin views should be logged.
- Admin exports should be limited.
- No admin secrets in frontend code.
- `ADMIN_TOKEN` belongs in environment variables only.

## Next production step

Replace token auth with real accounts:

- user login
- admin role
- server-side route protection
- audit log dashboard
