# Semesterly Development Agents

This folder defines the standing agent team for building Semesterly. These are not product personas for students; they are development agents Dom/Axil can delegate to during future build sessions.

## How to use

```powershell
npm run agent:list
npm run agent:brief -- qa-release
npm run agent:prompt -- frontend-builder "Implement the selected dashboard polish item."
npm run agent:workflow -- demo-polish-loop
npm run agent:check
```

1. Pick the agent that matches the work.
2. Generate a prompt with `npm run agent:prompt -- <agent-id> "task"`.
3. Send that prompt to a warmed subagent or use it directly in the current session.
4. Ask for either an audit report or a patch-ready implementation plan.
5. Run validation after any code changes.

Runtime note: if a freshly spawned subagent refuses the initial assigned task, send it a short harmless warm-up/follow-up message, then send the generated agent prompt with `sessions_send`. This workaround has been verified.

Recommended validation after meaningful implementation:

```powershell
npm run typecheck
npx next build
npm run smoke
npm run agent:audit
```

## Agent roster

| Agent | Owns | Best prompt shape |
| --- | --- | --- |
| `product-strategist` | MVP scope, demo narrative, roadmap, competitive angle | "Review the next demo and propose the top 5 changes." |
| `ux-demo-designer` | Laptop UI, flow, copy, onboarding, demo polish | "Find the UI/copy fixes that make the demo feel real." |
| `frontend-builder` | Next.js/React implementation, CSS, state, local persistence | "Implement this component/change and keep validation green." |
| `backend-security` | APIs, Prisma, isolation, privacy, admin protection, smoke tests | "Review backend/security gaps and patch the highest-risk item." |
| `qa-release` | Test plan, smoke coverage, build health, release notes | "Verify readiness and produce a ship/block list." |
| `growth-research` | Student workflows, positioning, market/comparison notes | "Turn competitor/student pain points into product improvements." |

## Current standing priorities

1. Daily dashboard must remain the center of the product.
2. Calendar and Courses should feel real enough for a laptop demo.
3. Trust/security must be visible, not hidden in docs.
4. Admin stays hidden until unlocked; API protection remains server-side.
5. Keep copy simple: what to do now, why it matters, what happens next.

## Delegation rules

- One agent, one outcome.
- Agents should not silently rewrite broad areas of the app.
- Reports should end with: `Ship`, `Fix next`, and `Blocked by`.
- Implementation agents must mention exact files changed and validation results.
- If Prisma DLL locks on Windows, use `npx next build` for frontend validation and state the blocker plainly.
