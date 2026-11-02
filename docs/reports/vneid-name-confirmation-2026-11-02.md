# VNeID name confirmation unit

Branch: `feat/vneid-name-confirmation`, isolated worktree from cached `origin/main` at `ad0224b`. Other running worktrees and application servers are preserved. Scope and decisions: [vneid-name-confirmation-v1](../decisions/vneid-name-confirmation-v1.md).

## Backend checkpoint

Mismatch now returns a private HTTP 202 preview without binding or activation. Explicit confirm/cancel uses backend-held evidence and an opaque one-use account/session/version/name-bound handle with capped expiry. Confirm refreshes the locked account and rechecks identity uniqueness; the display name and existing legal/contract history stay unchanged. All new commands require internal authentication and CSRF. No database migration or live data mutation.

Checks: 14 service/store tests and 11 existing RSA/token-verifier tests passed initially. Additional standalone HTTP contract tests, frontend/browser results and final commit hashes will be recorded after execution. Standalone HTTP tests do not replace security-filter or SQL integration coverage. No live Auth0 flow is claimed.

## Publishing

Initial fetch failed: the configured GitHub proxy could not connect. GitHub CLI is not installed. Push/PR status will be recorded after the local implementation is complete; no remote PR or successful publication is claimed in advance.
