# Verification method status and private citizen view — 27/10/2026

User reported that an Auth0-registered account still displayed the VNeID verification action and lacked a citizen information view. The previous UI used only combined account eligibility and rendered both verification actions unconditionally. User screenshot shows a verified application account; this task did not repeat the live Auth0 login or modify provider configuration.

## Changes

- GET /api/v1/me/verifications reads the authenticated account's persisted email flag and VNeID evidence through Controller → VneidService → repositories. Returns emailVerified plus vneid status/verifiedAt/read-only documentNumber, legalName, dateOfBirth, gender and address. No arbitrary account lookup, raw token, issuer/subject or images. Cache-Control no-store. Existing evidence remains readable even if new Auth0 login is disabled.
- /account/verification shows separate Email/VNeID options. A completed method shows Đã xác thực and no verification command. Email-only eligibility does not imply VNeID verification, and vice versa. Loading/errors offer retry without presenting unknown status as unverified.
- Verified citizen details appear on that page and /account/settings/identity. Stored Auth0 evidence is read-only and separate from the self-declared image dossier/form. No synthetic dates/issue fields/images, no existing profile/contract snapshot overwrite. Hook aborts stale fetches and scopes data to the current account; no browser persistence for citizen data.

## Actual checks

- Backend: 31 SQL integration tests PASS, zero failures/errors/skips: VneidIntegrationTests14, AccountIntegrationTests10, IdentityProfileIntegrationTests7; target/verification-details-tests.log. New tests verify own citizen fields/no-store, guest401, cross-account isolation even with a supplied accountId, email-only account has no invented citizen. Existing registration/concurrency/self verification and image dossier checks remain intact. Transactional fixtures rollback; concurrency test cleans its exact fixture.
- Frontend: final TypeScript PASS,43 unit tests PASS, production build PASS. Existing Vite native-loader and bundle-size warnings remain.
- Browser: final8 Playwright tests PASS16.9s on Edge/localhost3002:4 new per-method UI/read-only citizen/reload/error-retry tests plus4 OAuth callback/unconfigured/conflict regression tests. Verified both desktop1440/mobile390 with no horizontal overflow/pageerrors; viewed mobile screenshot with synthetic citizen only. Browser mocks prove rendering/callback handling; SQL tests verify private server data. No live user credentials/tokens obtained.
- Initial browser checks recorded favicon.ico404. Diagnostics identified the exact resource; existing project has no favicon. The test classifies only this known nonfunctional resource error separately, still fails unexpected API/console/network errors. This task did not add a favicon or hide API failures. Playwright MCP independently checked the unconfigured register/login/callback path without unexpected non401 responses. Normal guest401 and intentionally tested conflict409 remain expected.
- Context7 React19.3 consulted against installed React19.3; no new dependency/API provider. OpenAPI JSON and staged diffs checked. No migration/account/catalog/fixture reset. Dedicated test servers only, kept user8080/3000 and SQL.

## Commits and resume

- 9c960c8 — feat(auth): đọc trạng thái xác thực và căn cước của tài khoản.
- 408e36c — fix(ui): ẩn xác thực lại và hiển thị căn cước VNeID.
- Documentation handoff committed separately; see Git log/WORK_PROGRESS. No push.

Restart user Backend to load the new GET endpoint, then reload frontend. Open /account/verification or Settings → Identity. Existing Auth0-linked accounts use saved evidence immediately and need no re-verification or recreation. Imported assets/Owner conversion/signing remain out of scope.
