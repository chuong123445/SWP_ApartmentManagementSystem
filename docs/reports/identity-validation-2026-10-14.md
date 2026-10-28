# Identity collection validation, 14 October 2026

Implemented the user's selected scope: **store identity dossiers now, integrate eKYC later**. The account settings hub links to a dedicated identity page. Both private images and structured legal identity/address fields persist and can be edited/reloaded. Uploaded data remains NOT_VERIFIED. Email verification and account status remain separate. No provider, Admin identity review, verification success command or contract snapshot backfill is claimed.

| Check | Actual result |
|---|---|
| SQL-backed integration selection | 37/37 passed: 6 IdentityProfileIntegrationTests + 22 DiscoveryRentalIntegrationTests + 9 PropertyDossierIntegrationTests; failures/errors/skips 0, Maven BUILD SUCCESS, `target/identity-tests.log` |
| Private identity behavior | Pending self-service, both-image requirement, PNG/JPEG validation, empty/fake/oversized rejection, atomic create, retain omitted images, strict metadata/version, stale writes, self-only images and no contact/profile side effects |
| Frontend unit suite | 36/36 passed, `identity-unit.log` |
| TypeScript | `npm run lint` passed on final source |
| Production frontend | `npm run build` passed; existing Vite config warning and large bundle warning remain |
| Playwright Edge | 2/2 passed (8.4 s), real backend/SQL, fresh pending Customer, synthetic images, invalid-file feedback, first save, authenticated bytes, read/reload/edit, stale update409, Customer/guest live catalog comparison |
| Responsive/visual | Viewed `test-results/visual/identity-mobile.png` at390 and desktop1440; no horizontal overflow or page errors |
| OpenAPI | JSON parses, all 3 internal schema references resolve; schema routes match implemented paths |
| Cleanup/read-only audit | 0 identity-test accounts/profiles/documents/manifests remain; apartments13 unchanged; canonical Customer still PENDING_VERIFICATION, email/phone/contact false, version1 |

The first browser attempt failed because the test issued another full navigation before auth restoration finished, and counted three links per apartment as three separate cards. It did not expose a collection/API failure. The test now follows the account menu after restoration and counts apartment-card elements. Cleanup succeeded on both attempts. No SMTP send or third-party eKYC request occurred. Vite first failed in the restricted sandbox; running the same dev/build/browser commands with permitted process execution succeeded. Context7 Spring MVC multipart documentation was consulted and checked against the installed Boot4.1.1 / Framework7 stack.

Code commits: `06cf82c` private API/storage/security/tests/OpenAPI/ADR; `ef8281d` settings page, private image display, real browser workflow and exact-account cleanup helper. This report and the [catalog investigation](catalog-visibility-2026-10-14.md) are a separate documentation checkpoint. Existing contract wizard work was preserved; its author completed commits through `cc72521` during this session. No deployment or push.

Resume: restart the backend from the IDE to load V11/routes, reload frontend, then **Cài đặt tài khoản → Xác thực danh tính**. No manual schema reset, fixture recreation or email verification reset is required. eKYC and consuming the new identity fields in contract authoring remain separate follow-ups.
