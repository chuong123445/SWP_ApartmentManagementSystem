# Auth0 VNeID auth slice — 27/10/2026

## Delivered scope

Backend registration/login of a new CUSTOMER and self verification/linking of an existing internal account. VERIFIED evidence is stored separately from self-declared image dossiers in V13 auth_external_identities; no SIMULATED_VERIFIED enum, automatic email verification, role promotion, unlocking or Property approval. Unique case-sensitive issuer/subject and unique CCCD prevent duplicate identity ownership. Existing email OTP and non-Customer phone eligibility remain; policy additionally accepts persisted Auth0 evidence. Internal JWT sid/session, refresh rotation and revocation remain authoritative. Null password hashes identify external-only accounts; password-required settings commands return an explicit error.

React uses Auth0 React 2.29.0 with installed React19.3.0, runtime configuration from the Backend, register/login/verify buttons, callback self-account guard and token exchange. Tokens remain in memory; SDK transaction state may use session storage but access JWTs do not. Unconfigured integration remains visibly disabled. Action setup requires custom API audience, azp, namespaced email/source/connection and citizen claims. No asset list is added to login tokens.

User supplied Auth0 domain and SPA Client ID screenshot plus connection, but explicitly chose **disabled default** because the custom API has not been created. No tenant settings or Auth0 user were modified by this task. Live Auth0 login/inbox/provider results were not observed. Asset consent/Management API access/import, Customer→Owner conversion and automatic approval of imported Property remain separate work, not delivered here.

## Validation evidence

Backend, latest successful results across targeted runs: **85 tests**, zero failures/errors/skips:

| Suite | Count | Evidence |
|---|---:|---|
| AuthIntegrationTests | 8 | target/vneid-tests.log + surefire report |
| AccountIntegrationTests | 10 | target/vneid-tests.log + surefire report |
| RegistrationIntegrationTests | 9 | target/vneid-tests.log + surefire report |
| VneidIntegrationTests | 11 | target/vneid-final-tests.log |
| VneidTokenVerifierTests | 11 | target/vneid-final-tests.log |
| DiscoveryRentalIntegrationTests | 22 | target/vneid-policy-regression.log |
| IdentityProfileIntegrationTests | 7 | target/vneid-policy-regression.log |
| OwnerPropertyIntegrationTests | 7 | target/vneid-policy-regression.log |

RSA tests use real signatures and a controlled JWKS HTTP response: valid token, signature tamper, issuer/audience/client/source/connection mismatch, expired/missing expiry, disabled feature and non-HTTPS configuration. These prove local verifier behavior, not live tenant integration. SQL tests exercise registration/repeated login, self activation without role/contact mutation, duplicate email/cross-account binding, locked accounts, strict JSON, CSRF, internal/external token separation and two concurrent registrations creating one account/binding. Transactional tests rollback. The nontransactional race test cleans only its own exact random account/session/identity.

Initial checks exposed Resource Server's default CSRF bypass for Bearer requests, ignored extra JSON fields and a callback race where Router appState arrives after SDK state. Explicit CSRF filter matcher, strict DTO and waiting for callback intent fixed these issues. One race-test cleanup used the wrong existing table name; corrected to auth_refresh_tokens. Its exact synthetic email fixture was subsequently removed by a temporary guarded cleanup test, which passed. Temporary source and compiled class were removed; no fixture reset was used.

Frontend: final TypeScript check PASS; **42 unit tests PASS**; production build PASS (existing Vite native-config and large-bundle warnings). Installing SDK also supplied already-declared missing PDF dependencies; npm reported one high vulnerability, no broad audit fix performed. A preexisting contract PDF test fixture lacked required type fields and had an unsupported signingMethod; corrected independently, five contract tests PASS.

Browser: final **6 Playwright tests PASS, 15.7s**, Edge headless, base URL 3002, Backend8082. Two real local Owner regression tests cover login, reload, management tabs/settings and logout/revoked JWT. Four VNeID tests cover disabled desktop1440/mobile390 UI, callback unavailable state, actual SDK OAuth callback with explicitly mocked provider/backend responses, single exchange/token-storage checks, mobile pending self verification and expected409 duplicate-email handling. No unexpected console/network errors; expected guest401 and conflict409 recorded separately. No pageerrors or mobile horizontal overflow. Viewed register-mobile and self-verification-mobile screenshots. Browser mocks do not establish that Auth0 tenant login works.

Playwright MCP returned “requires approval, but approval policy is never”; used project Playwright CLI instead. Context7 consulted Spring Security7.1.1 and Auth0 React docs, checked against installed project dependencies. Sandbox npm DNS and Maven cache access required permitted execution. Windows Java loopback error prevented first test-server start; short workspace Unix-socket temp directory/IPv4 settings allowed startup. Dedicated test servers were stopped after checks; user processes and SQL Server preserved.

## Commits and resume

- af386ae — fix(contracts): đồng bộ fixture xuất PDF với kiểu hợp đồng.
- da3e1bc — feat(auth): xác thực tài khoản qua Auth0 VNeID.
- b9c3eb3 — test(auth): kiểm tra đăng ký VNeID đồng thời và dọn fixture.
- 4e0964d — feat(ui): tích hợp đăng ký và xác thực VNeID qua Auth0.
- Setup/decision/report documentation committed separately after review; see Git log and root WORK_PROGRESS for its hash. No push.

Next: create a custom API (e.g. https://api.ancu.local), confirm SPA type/connection/callback origins, Deploy docs/setup/vneid-post-login.js with its three configuration secrets, then configure Backend .env.local per docs/setup/auth0-vneid.md and enable deliberately. Restart IDE Backend to load V13/config and reload frontend. Do not use Management API identifier as login audience. Live registration/self linking must be checked with dedicated test identities before declaring provider integration complete. Do not recreate/reset owner02 or existing local fixtures. Asset import follows as a separate authorized slice.
