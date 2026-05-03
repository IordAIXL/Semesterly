# Semesterly Agent Notes

This repo is a Next.js + Prisma demo app. Main UI work currently lives in:

- `src/components/SemesterlyApp.tsx`
- `src/app/globals.css`
- sample data: `src/lib/sample-users.ts`
- shared types: `src/lib/types.ts`

## Current product shape

Primary nav should be:

1. Today
2. Calendar
3. Courses
4. Profile
5. Admin only after unlock

There should be no Options nav/page. Anything previously in Options belongs in Courses or Profile.

## UI rules Dom has asked for

- Keep answers and UI simple.
- Dark mode should feel like Google dark mode.
- Dark/light theme must apply to the full screen, not only cards.
- The theme selector lives in Profile and must remain readable in dark mode.
- Calendar comes immediately after Today.
- Calendar supports Day / Week / Month / Semester and date navigation must actually move through time.
- Courses page has an `Add` dropdown for new courses, assignments, exams, and calendar items.
- Admin should stay hidden unless unlocked; API admin protection is separate and already token-protected.

## Token-efficient work style

Dom wants maximum progress per token. Default to:

- Small focused patches over long plans.
- One concise status update only when useful.
- No subagents unless parallel expertise will clearly save time/tokens.
- Final replies should list: changed files, validation results, blockers.
- Keep rationale short; put durable details in docs/files instead of chat.

## Validation commands

Run these after meaningful edits:

```powershell
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
```

`npm run build` may fail locally on Windows because Prisma cannot rename `node_modules/.prisma/client/query_engine-windows.dll.node` while another Node process locks it. If that happens, use `npx next build` for the frontend build and tell Dom the blocker plainly. Do not hide the Prisma DLL lock issue.

## Before final replies

- State exactly what changed.
- Include validation results.
- Mention blockers that limit agent performance or reliability, especially the Prisma DLL lock.
