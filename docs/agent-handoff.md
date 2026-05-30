# Agent Handoff

This file explains how Antigravity and Codex should coordinate while sharing one folder:
`C:\Users\KPSA\Documents\Codex\FamilyScheduler`

Current operating model:
- Antigravity: UX exploration, product copy, screen variants, and handoff notes.
- Codex: integrated app implementation, refactor, verification, and release-safe fixes.
- Diary/memory is now part of the single app rather than a separate MVP target.

Write ownership:
- Antigravity writes `docs/antigravity-out.md`.
- Codex writes `docs/codex-integration-log.md`.
- Neither agent should overwrite the other agent's log.

Source file rule:
- Only one agent should actively edit a given source file at a time.
- If a file is being explored by Antigravity, Codex should wait for `docs/antigravity-out.md`.
- If Codex is implementing a change, Antigravity should avoid touching those same files until Codex finishes.

Suggested workflow:
1. Antigravity explores or describes the requested behavior.
2. Antigravity updates `docs/antigravity-out.md`.
3. Codex reads the handoff and implements only the accepted parts.
4. Codex updates `docs/codex-integration-log.md`.
5. User reviews the integrated app result.

High-risk areas requiring explicit approval:
- Auth
- Payment
- Supabase schema or data migrations
- Calendar sync behavior
- Android packaging
- App icons, store listing assets, and release files
