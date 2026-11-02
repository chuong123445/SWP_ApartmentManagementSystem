# VNeID name confirmation unit

Branch: `feat/vneid-name-confirmation`, isolated worktree from cached `origin/main` at `ad0224b`. Other running worktrees and application servers are preserved. Scope and decisions: [vneid-name-confirmation-v1](../decisions/vneid-name-confirmation-v1.md).

## Backend checkpoint

Mismatch now returns a private HTTP 202 preview without binding or activation. Explicit confirm/cancel uses backend-held evidence and an opaque one-use account/session/version/name-bound handle with capped expiry. Confirm refreshes the locked account and rechecks identity uniqueness; the display name and existing legal/contract history stay unchanged. All new commands require internal authentication and CSRF. No database migration or live data mutation.

Commit `b953151`: backend/store, strict DTOs, API contract, decision and tests. Checks: 30 tests PASS (14 service/store, 5 standalone HTTP contract, 11 existing RSA/token-verifier). Scenarios include no activation before confirmation, normalization, exact account/session, version/name change, expiry, cancellation, consumed/forged handles, identity conflict, disabled provider and locked account. Standalone HTTP tests do not replace security-filter or SQL integration coverage.

## Frontend checkpoint

The real callback renders both names and explicit confirm/cancel actions. Matching-name HTTP 200 behavior remains supported. The confirmation ID stays in memory; expired/invalid previews are discarded. Registration/profile now label `fullName` as the display name. Profile loads existing private verification data and shows the legal name separately as read-only; editing the display name leaves that identity intact.

- TypeScript check PASS; production Vite build PASS with the native config loader and task-local `__dirname` preload (existing config assumes bundled loading). Existing large-chunk warning remains.
- All 87 frontend unit tests PASS using Node native TypeScript transformation and a task-local alias loader. Default `tsx`/test worker spawning is blocked by environment `EPERM`; no dependency was added to work around it.
- Six Playwright MCP cases PASS against the isolated frontend on port 3187: confirm/cancel/expired at 1440 and 390 pixels. Real SPA/Auth0 SDK callback, intercepted provider/API responses; no live provider/database binding. Assert one prepare, no automatic confirm, exact command body/CSRF/internal token, invalid-handle error, separate read-only legal name, editable display name and unchanged identity after profile save. No unexpected console errors, page exceptions, failed requests or horizontal overflow. Expected 409 in the expired case is explicitly allowed. Desktop/mobile confirmation screenshots were visually inspected.
- Existing SQL integration fixtures were aligned to the matching-name branch and three SQL/security integration scenarios were added and compiled. SQL/security-filter integration execution is NOT_RUN in this task; default datasource is the user's live database, which was not touched. Live Auth0 and concurrent multi-instance deployment checks are NOT_RUN.

No user server was restarted. Only the dedicated frontend test server is used and stopped at handoff. No schema/data/provider changes, fixtures, contract snapshots, or other worktrees were modified. Pending previews are process-local: restart or another instance requires starting verification again; this is an explicit deployment limitation.

## Publishing

Code commits: `b953151` (backend/API/security guards) and `53b6eff` (confirmation UI, display/legal-name separation and browser/integration scenarios). Both belong to this one feature unit and are based directly on cached main, without audit, fixture, billing-view or other feature commits.

Actual `git push -u origin feat/vneid-name-confirmation` failed: could not connect to GitHub port 443 through the configured proxy `127.0.0.1:9`. Initial fetch failed for the same reason; GitHub CLI is also absent. Network restrictions were not bypassed. The branch has NOT been pushed and no remote PR exists. Intended PR base is `main`; its title/body are prepared in the task handoff outside the repository. No merge or main update was attempted. The isolated worktree remains available for a later push/PR when GitHub connectivity is restored.
