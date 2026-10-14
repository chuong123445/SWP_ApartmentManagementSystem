# Resident invoice navigation — 14 October 2026

User requested checking and adding resident invoice access. Baseline repository HEAD: `3c1c9be`, clean working tree.

## Finding and change

`/my/invoices`, `/my/invoices/:id`, invoice breakdown and exact-party SENT authorization already exist. The shared AccountMenu hid the invoice entry behind a successful nonempty tenancy response. An unavailable/empty response therefore removed the entry even though invoice history has its own API.

AccountMenu now always exposes **Hóa đơn của tôi** for CUSTOMER accounts. CustomerLayout still derives the **Cư dân (Tenant)** label from an ACTIVE contract. Existing account verification/role gates remain in force. The list handles loading/error/empty/retry, and detail shows rent, start/end readings, quantities, prices and total. No backend endpoint, authorization, calculation, contract state, fixture or payment change was needed. The legacy ResidentPortalPage prototype remains outside the authenticated Customer navigation.

## Actual validation

- Installed versions: React 19.3.0, React Router 8.4.0, Playwright 1.64.0. Existing component/router APIs reused; no new library API lookup. Context7 is not exposed in this session.
- Final `npm run lint`: PASS.
- `npm test`: 36/36 PASS. Initial sandbox execution was blocked by Node child-process `spawn EPERM`; permitted rerun passed.
- `npm run build`: PASS; existing Vite native-config and large-bundle warnings remain. Initial sandbox build was blocked by child-process permissions; permitted rerun passed.
- `npx playwright test e2e/resident-invoices.spec.ts`: 3/3 PASS, 22.1s. After navigation's separate run removed the first screenshots, rerun with `--output=test-results/resident-invoices`: 3/3 PASS, 18.1s, retained mobile evidence.
- `npx playwright test e2e/navigation.spec.ts`: 2/2 PASS, 6.9s. Both canonical pending Customer and active Tenant have the invoice menu entry. Home, profile/back, Escape/outside dismissal, mobile dropdown bounds and logout still work.
- Real local API reads: both existing tenants' invoice lists and detail/reload; lists contain SENT invoices for their exact account; cross-tenant detail returns 404 and private content is absent in the UI. Desktop1440/mobile390 have no horizontal document overflow or page errors.
- Transport-only simulations: unavailable/empty tenancy response retains navigation; empty invoices show the existing message; invoice API 503 shows error; retry restores real data. Guest history redirects to login. These simulations do not modify SQL data.
- Visually inspected `test-results/visual/resident-invoice-1-mobile.png` and `navigation-local_customer.png` (ignored artifacts). Invoice figures render within the mobile viewport; Customer dropdown includes the new entry.

The old billing E2E creates/sends invoices against shared fixtures, so it was not run for this navigation fix. Its old hidden-entry assertion and navigation assertions were updated to the new behavior; no claim that its unrelated address expectations or write workflow ran. No backend test suite was rerun because backend source/schema did not change; actual API privacy was checked through the browser suite.

No dedicated servers were started. Existing user frontend3000/backend8080 and SQL Server were preserved. No fixture/account/credential reset, push, RDS/diagram modification or real Gmail delivery claim. Login/refresh/logout create or revoke only normal test authentication sessions. Resume: reload the frontend, open the account icon → **Hóa đơn của tôi** → select an invoice.
