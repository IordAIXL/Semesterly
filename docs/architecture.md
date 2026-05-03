# Semesterly Architecture

## Recommended MVP stack

Use a boring, fast stack:

- **Frontend/backend:** Next.js App Router + TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite for local dev, Postgres for production
- **ORM:** Prisma
- **Auth:** defer for first local prototype; add Auth.js/NextAuth before beta
- **Deployment:** Vercel for app, Neon/Supabase Postgres for production DB
- **AI:** server-side priority explanation after deterministic scoring exists

Reason: this stack lets us move quickly while keeping a clean path to production.

## App shape

Semesterly should be a web app first. Mobile matters, but a responsive PWA is enough for MVP.

Main areas:

- `/` dashboard
- `/courses`
- `/assignments`
- `/calendar`
- `/settings`

## Core entities

### User

- id
- name
- email
- timezone
- school
- createdAt

### Term

- id
- userId
- name, e.g. “Spring 2027”
- startDate
- endDate
- isActive

### Course

- id
- userId
- termId
- code
- name
- color
- professor
- location
- importance

### CourseMeeting

- id
- courseId
- dayOfWeek
- startTime
- endTime
- location

### Task

- id
- userId
- courseId nullable
- title
- notes
- dueAt
- estimatedMinutes
- importance
- status
- priorityScore
- createdAt
- updatedAt

### Event

- id
- userId
- title
- startsAt
- endsAt
- category
- source

### PrioritySnapshot

- id
- userId
- date
- generatedAt
- summary

Useful later for tracking how recommendations change over time.

## Priority engine v1

Start deterministic. Do not start with black-box AI.

Suggested score:

```txt
priority = urgency + importance + effortPenalty + statusBoost + courseWeight
```

Inputs:

- Due soon = higher urgency
- Overdue = very high urgency
- High importance/grade weight = higher priority
- Not started = boost
- Large effort due soon = boost
- Completed = excluded

Example explanation:

> High priority because it is due tomorrow, estimated at 90 minutes, and has not been started.

AI should only summarize/explain after this scoring works.

## Integration sequence

1. Manual course/task/event entry
2. ICS import/export
3. Google Calendar read sync
4. Google Calendar two-way sync
5. Syllabus upload/parser
6. LMS integrations only if needed and practical
7. Wellness/habit integrations later

## Security/privacy

Students will store academic and personal schedule data. Treat it seriously.

MVP rules:

- Keep secrets server-side
- Do not expose calendar tokens to client
- Allow account/data deletion before beta
- Make integrations opt-in
- Avoid storing unnecessary raw third-party data

## Implementation milestones

### Milestone 1 — Local prototype

- Next app boots
- Static dashboard with mock data
- Course/task/event types defined
- Priority function working with tests or sample fixtures

### Milestone 2 — CRUD MVP

- Add/edit/delete courses
- Add/edit/delete assignments
- Add/edit/delete events
- Dashboard reads real local DB data

### Milestone 3 — Student workflow

- Term setup flow
- Weekly calendar view
- Priority explanations
- Responsive mobile layout

### Milestone 4 — First beta readiness

- Auth
- Postgres
- Basic import/export
- Error handling
- Deployment

### Milestone 5 — Differentiation

- Calendar integration
- AI day summary
- Syllabus parser
- Retention analytics
