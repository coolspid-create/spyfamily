# Family Scheduler Agent Contract

Purpose:
Family Scheduler is the app for shared household scheduling, routines, memories, and family coordination.

Single-folder setup:
- Shared project folder: `C:\Users\KPSA\Documents\Codex\FamilyScheduler`
- Both Antigravity and Codex operate in this folder.
- This means file ownership matters more than tool connectivity.

Agent ownership:
- Antigravity can explore UX flows, product copy, and quick variants inside the integrated app workflow.
- Codex implements, refactors, and verifies accepted behavior against existing app patterns.
- The former MVP diary is now part of the single app, not a separate workstream.

File ownership:
- Antigravity writes `docs/antigravity-out.md`.
- Codex writes `docs/codex-integration-log.md`.
- Both agents may read `docs/agent-handoff.md`.
- Source files under `app/src` should have only one active editing agent at a time.

Do not mix:
- Do not make both agents edit the same source file simultaneously.
- Do not make both agents write the same handoff file.
- Keep exploratory changes and production changes coordinated through handoff notes when both agents are active.
- Do not use production environment variables or database mutations for experiments.

Handoff protocol:
- Antigravity writes proposed behavior and changed files to `docs/antigravity-out.md`.
- Codex reads that handoff, implements selected work, and records the result in `docs/codex-integration-log.md`.
- Large or risky decisions should be listed as open decisions instead of silently implemented.
