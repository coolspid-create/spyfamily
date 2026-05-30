# Family Scheduler Agent Rules

This single folder is shared by both Antigravity and Codex:
`C:\Users\KPSA\Documents\Codex\FamilyScheduler`

Because both agents use the same worktree, only one agent should actively edit feature files at a time. If both agents are open, use handoff files instead of having both modify the same files.

Read first:
- `docs/agent-contract.md`
- `docs/agent-handoff.md`
- `AGENTS.local.md` if the current agent is Codex
- `.agents/rules/00-antigravity-mvp-workroom.md` if the current agent is Antigravity

Project layout:
- App root: `app`
- Dev command: run `npm run dev` from `app`
- Build command: run `npm run build` from `app`
- Lint command: run `npm run lint` from `app`

Shared ground rules:
- Prefer existing React, Vite, Zustand, Supabase, and UI patterns already in this app.
- The former MVP diary is now part of the single integrated app. Treat diary work as production app work.
- Do not let Antigravity and Codex edit the same source file at the same time.
- Use handoff files for coordination when both agents touch the same feature area.
- Do not change auth, payment, Supabase schema, calendar sync, Android packaging, or release assets unless explicitly requested.
- Before finishing, report changed files, verification commands, and remaining risks.
