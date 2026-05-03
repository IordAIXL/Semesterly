# Semesterly UX Plan

## UX principle

The app should answer one question fast:

> What should I do next, and why?

Everything else supports that.

## Primary screens

### 1. Daily Dashboard

Top area:

- Greeting: “Good morning, Dom”
- Date
- One-sentence day summary
- Stress/traffic indicator: Light / Normal / Heavy

Main cards:

- **Top priorities**
  - Ranked task list
  - Each item shows course, due time, estimated effort, reason
  - Actions: complete, snooze, start, edit

- **Today’s schedule**
  - Classes and events timeline
  - Current/next item highlighted

- **Due soon**
  - Next 7 days
  - Grouped by course

- **Quick add**
  - Assignment
  - Event
  - Course

### 2. Semester Setup

Goal: user gets value in under 10 minutes.

Steps:

1. Choose term dates
2. Add courses
3. Add meeting times
4. Add known major deadlines
5. Land on dashboard

Later: import calendar/syllabus.

### 3. Courses

Course card:

- Course code/name
- Color
- Meeting schedule
- Next class
- Open assignments
- Upcoming exams

Course detail:

- Assignments
- Events/exams
- Notes/resources later

### 4. Assignments

Views:

- List by due date
- Board by status
- Group by course

Fields:

- Title
- Course
- Due date/time
- Estimated effort
- Importance
- Status
- Notes

### 5. Week View

Calendar-like but student-specific:

- Classes form recurring structure
- Assignments appear as deadlines
- Events appear on timeline
- Priority tasks can be dragged/scheduled later

## Prioritization UI

Every recommendation needs an explanation. Students will not trust magic.

Example item:

```txt
1. Finish ECON problem set
Due tomorrow · 90 min · Not started
Reason: due soon + medium effort + course priority
```

Allow user override:

- Move up/down
- Snooze
- Mark low priority
- Set “focus today”

Overrides should improve future scoring later.

## Component list

- AppShell
- Sidebar/Nav
- DashboardHeader
- DaySummaryCard
- PriorityList
- PriorityItem
- ScheduleTimeline
- DueSoonList
- QuickAddButton
- CourseCard
- CourseForm
- AssignmentForm
- EventForm
- WeekCalendar
- EmptyState

## Visual direction

Clean, calm, academic but not corporate.

Avoid:

- Dense enterprise calendar UI
- Too many charts early
- AI sparkle overload

Use:

- Course colors
- Clear hierarchy
- Large touch targets
- Low-friction quick add
- Mobile-first dashboard
