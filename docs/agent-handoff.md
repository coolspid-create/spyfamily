# Agent Handoff

This file explains how Antigravity and Codex should coordinate while sharing one folder:
`C:\Users\KPSA\Documents\Codex\FamilyScheduler`

Current operating model:
- Antigravity: MVP, prototype, UX exploration, product copy.
- Codex: production integration, refactor, verification, release-safe fixes.

Write ownership:
- Antigravity writes `docs/antigravity-out.md`.
- Codex writes `docs/codex-integration-log.md`.
- Neither agent should overwrite the other agent's log.

Source file rule:
- Only one agent should actively edit a given source file at a time.
- If a file is being explored by Antigravity, Codex should wait for `docs/antigravity-out.md`.
- If Codex is integrating a production change, Antigravity should avoid touching those same files until Codex finishes.
- Codex must not edit MVP/prototype files unless the user explicitly gives Codex an exception.
- Antigravity must not edit main app/production files unless the user explicitly gives Antigravity an exception.

Suggested workflow:
1. Antigravity prototypes or describes the MVP behavior.
2. Antigravity updates `docs/antigravity-out.md`.
3. Codex reads the handoff and implements only the accepted parts.
4. Codex updates `docs/codex-integration-log.md`.
5. User reviews the production result.

High-risk areas requiring explicit approval:
- Auth
- Payment
- Supabase schema or data migrations
- Calendar sync behavior
- Android packaging
- App icons, store listing assets, and release files
