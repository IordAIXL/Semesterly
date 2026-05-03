# Development Agents

Semesterly now has a standing development-agent roster in `agents/`. These agents are for building the product, not student-facing AI personas.

## Roster

- `product-strategist` — MVP scope, roadmap, demo narrative, competitive positioning.
- `ux-demo-designer` — laptop demo polish, copy, navigation, visual clarity.
- `frontend-builder` — React/Next.js UI implementation and CSS.
- `backend-security` — API routes, Prisma ownership, admin protection, privacy controls.
- `qa-release` — validation, release verdicts, demo blockers.
- `growth-research` — student workflow research and positioning insights.

## Commands

```powershell
npm run agent:list
npm run agent:brief -- qa-release
npm run agent:prompt -- frontend-builder "Implement the selected dashboard polish item."
npm run agent:workflow -- demo-polish-loop
npm run agent:check
```

## Operating model

Use agents when the work benefits from a focused point of view. Do not ask every agent everything. Delegate one narrow outcome at a time.

If a freshly spawned helper refuses the first task, warm it with a tiny harmless follow-up and then send the generated prompt. Verified workaround: the same helper that refused the initial startup task successfully replied to a follow-up and completed a QA report.

Good examples:

```txt
Ask ux-demo-designer to review Today and Calendar for demo polish. Return top 5 fixes only.
```

```txt
Ask backend-security to inspect privacy export/delete and admin access. Return risks and tests to add.
```

```txt
Ask frontend-builder to implement the selected calendar polish items and keep validation green.
```

## Required validation

After meaningful code changes:

```powershell
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
```

If Prisma client generation fails locally because Windows locks the Prisma query engine DLL, use `npx next build` for frontend validation and report the lock plainly.

## Why this exists

Semesterly can grow fast, but the product needs discipline. These agents keep development split across product, UX, frontend, backend/security, QA, and growth instead of letting every build session become one unfocused pile of changes.
