# Demo Script

## Open

Go to:

```txt
http://localhost:3000
```

## 1. Use the 60-second demo path

Start on Today and use the demo path card:

1. Today Plan
2. Week Calendar
3. Trust Controls

This gives the shortest clean story: Semesterly ranks the day, turns work into time, then proves the trust model.

## 2. Pick a student

Use the student picker in the top right.

Show that each student has different:

- school
- courses
- assignments
- events
- priorities

The confirmation banner should make the change obvious.

## 3. Explain Today

Today answers:

- what is next
- what is due soon
- what is risky
- what to focus on first

Use **Schedule focus block** on the Today Plan card. It finds an open slot, marks the task in progress, and jumps to the Day calendar.

## 4. Show priority logic

Open the priority queue.

Each task has a reason.

This builds trust because the app explains the ranking.

## 5. Add data

Use Quick add or Smart capture.

Example:

```txt
BIOL lab report due Wed 120 min
```

Show that the dashboard updates and the action banner confirms the capture.

## 6. Show Courses risk

Open Courses.

Show:

- course risk overview cards
- highest-risk course strip
- open workload minutes
- next deadline per course
- course drilldown with calendar, assignments, exams, and advisor-style recommendations

## 7. Show Profile, Insights, and Trust

Open Profile.

Show:

- setup readiness
- academic snapshot
- insights
- export/delete controls
- delete requires typing `DELETE`

## 8. Show Admin

Open Admin.

Demo code:

```txt
DOM-DEMO
```

Show all users, schools, classes, assignments, and events.

Say clearly:

> This is restricted. Normal users should never see this page.

## 9. Show trust story

Security foundation:

- private by default
- user-isolated API
- admin-only route
- export route
- guarded delete route
- audit log model

## What is real now

- frontend demo
- sample data
- priority engine
- local persistence
- Prisma schema
- SQLite seed
- backend API routes
- admin API protection
- privacy export/delete routes
- user-scoped course/event/task smoke coverage
- pinned dependency versions and zero-audit dependency state

## What comes next

- real login
- real hosted database
- connect frontend forms to DB routes
- calendar sync
- syllabus import
- notifications
- mobile polish
