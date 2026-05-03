# Security and Trust Plan

## Goal

Students should trust Semesterly with school and schedule data.

## MVP rules

- Private by default.
- Explain every priority.
- Give users control.
- Store only what is needed.
- Make delete/export obvious.

## Current demo

The prototype stores data in the browser only.

No server.
No accounts.
No external sync.
No hidden data sharing.

## Admin access

Dom needs an exclusive admin page to see all users and their inputted data.

Rules:

- Normal users can only see their own data.
- Admin can see all users, schools, classes, assignments, and events.
- Admin access must be enforced on the server, not only in the browser.
- Admin views should be logged.
- Admin exports should be restricted.

Current demo includes a local admin gate. This is for product demonstration only.

## Production plan

### Auth

Use secure account login before beta.

Options:

- Auth.js
- Google login
- school email login later

### Data storage

Use Postgres in production.

Store:

- courses
- assignments
- events
- preferences

Avoid storing:

- unnecessary raw calendar data
- health data before it is needed
- private notes unless user asks

### Integrations

All integrations must be opt-in.

Calendar tokens stay server-side.
Users can disconnect anytime.

### User controls

Build these before public beta:

- export data — started with `GET /api/privacy/export`
- delete account — started with guarded `DELETE /api/privacy/delete`
- clear imported data
- disconnect integrations
- edit priority rules

### AI trust

AI should not be a black box.

Every recommendation needs:

- reason
- inputs used
- easy override

Example:

> High priority because it is due tomorrow, takes 2 hours, and is not started.

## Trust copy for app

Short version:

> Your schedule is private. Your priorities are explained. You stay in control.
