# Family Scheduler Agent Rules

This single folder is shared by both Antigravity and Codex:
`C:\Users\KPSA\Documents\Codex\FamilyScheduler`

Because both agents use the same worktree, only one agent should actively edit production files at a time. If both agents are open, use handoff files instead of having both modify the same feature files.

Read first:
- `docs/agent-contract.md`
- `docs/agent-handoff.md`
- `AGENTS.local.md` if the current agent is Codex
- `.agents/rules/00-antigravity-mvp-workroom.md` if the current agent is Antigravity

Project layout:
- App root: `app`
- Main dev command: run `npm run dev:main` from `app`
- MVP dev command: run `npm run dev:mvp` from `app` when using the existing MVP config
- Build command: run `npm run build` from `app`
- Lint command: run `npm run lint` from `app`

Shared ground rules:
- Prefer existing React, Vite, Zustand, Supabase, and UI patterns already in this app.
- Keep prototype/MVP work clearly labeled and easy to remove or integrate.
- Do not let Antigravity and Codex edit the same source file at the same time.
- Codex must not edit MVP/prototype files unless the user explicitly gives an exception.
- Antigravity must not edit main app/production files unless the user explicitly gives an exception.
- Do not change auth, payment, Supabase schema, calendar sync, Android packaging, or release assets unless explicitly requested.
- Before finishing, report changed files, verification commands, and remaining risks.
