# Family Scheduler Agent Contract

Purpose:
Family Scheduler is the app for shared household scheduling, routines, memories, and family coordination.

Single-folder setup:
- Shared project folder: `C:\Users\KPSA\Documents\Codex\FamilyScheduler`
- Both Antigravity and Codex operate in this folder.
- This means file ownership matters more than tool connectivity.

Agent ownership:
- Antigravity explores MVP flows, product copy, quick UX variants, and prototype behavior.
- Codex integrates accepted behavior into the main app and verifies it against existing patterns.

File ownership:
- Antigravity writes `docs/antigravity-out.md`.
- Codex writes `docs/codex-integration-log.md`.
- Both agents may read `docs/agent-handoff.md`.
- Source files under `app/src` should have only one active editing agent at a time.

Do not mix:
- Do not make both agents edit the same source file simultaneously.
- Do not make both agents write the same handoff file.
- Codex must not edit MVP/prototype files unless the user explicitly gives an exception.
- Antigravity must not edit main app/production files unless the user explicitly gives an exception.
- Do not copy MVP code into production without adapting it to production architecture.
- Do not use production environment variables or database mutations for experiments.

Handoff protocol:
- Antigravity writes the proposed behavior and changed files to `docs/antigravity-out.md`.
- Codex reads that handoff, integrates selected work, and records the result in `docs/codex-integration-log.md`.
- Large or risky decisions should be listed as open decisions instead of silently implemented.
