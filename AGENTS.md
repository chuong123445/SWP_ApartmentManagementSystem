# Coding workflow

Follow the parent workspace AGENTS.md, CODING_PLAN.md and WORK_PROGRESS.md.

## Commit after each unit — confirmed 12 October 2026

- Commit after completing a small feature, fixing a bug, completing a refactor with appropriate checks passing, or finishing an independently rollbackable step.
- Run appropriate checks and inspect the staged diff. Stage only files in the unit, preserve other work, exclude secrets/build artifacts, and do not push without authorization.
- Use `feat(scope): việc thực hiện`, `fix(scope): việc thực hiện`, `refactor(scope): việc thực hiện` (documentation: `docs(scope): ...`). Scope is the module, feature, main folder or affected component, e.g. auth, user, profile, payment, ui, api, order.
- Record actual checks and commit hashes in the workspace WORK_PROGRESS.md after each checkpoint.
