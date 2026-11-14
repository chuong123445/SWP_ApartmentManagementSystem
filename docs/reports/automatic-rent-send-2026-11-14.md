# Automatic rent invoices — 14 November 2026

User approved a seven-day send window, without preparing rent drafts or choosing
an automation mode. Backend commit `aa96397e` implements the policy; UI removes
the mode selector and rent-only draft action.

- Rent invoices automatically become SENT with one tenant notification within
  D-7 through the due date. Scheduler retains its 15-minute interval, separate
  transaction per contract, locking and active Owner/contract/exit guards.
- Manual rent creation now creates and sends atomically, with no persisted draft
  if rejected. Creation and direct send of historical RENT drafts reject D-8
  with `409 RENT_SEND_TOO_EARLY`; D-7 is allowed. Agreed due-date minimum,
  coverage, versions and ownership remain enforced. Owner can reconcile overdue
  periods manually; scheduler does not automatically collect historical arrears.
- Property settings always report/store SEND, including stale clients submitting
  MANUAL/DRAFT. V69 updates old settings/default and increments versions only
  when changing the old mode. Replay is idempotent. Existing rent drafts in the
  send window are sent by scheduler; SENT invoice history is not rewritten.
- Context exposes sendAvailableFrom/canSend using Vietnam date. UI explains
  automation, disables early send, offers one-step rent send and keeps utility
  draft/review workflow. Internet/rubbish remain on monthly utility invoices.

Verification:

- **47 backend checks PASS**: BillingIntegrationTests42,
  PropertySettingsIntegrationTests2, RentScheduleTests3, zero skips. Dedicated
  SQL database `ancu_auto_rent_20261114`, not the app database. Covers manual
  D8/D7, no row on early rejection, legacy draft direct-send gate, scheduler
  D8/D7/D0/overdue, all legacy settings modes, missing settings, exact-once
  notification/retry, due-day invariant, active exit guard, migration twice,
  property/tenant isolation, separate utility chains and existing billing flows.
- **162 frontend unit tests, TypeScript and build PASS**. Existing large-bundle
  warning remains. Node tests/build/Vite needed approved execution outside the
  sandbox because spawn was blocked there.
- **12 Playwright MCP scenarios PASS** at1440/390: Owner rent direct send
  (one request, no second send), early-send disabled/no writes, utility draft
  retained, Customer rent/utility breakdown, settings without mode selection,
  contract 1/3/6/12 cycles. No unexpected console/page/request/HTTP errors or
  horizontal overflow. React StrictMode intentional ERR_ABORTED payment-status
  cleanup is explicitly excluded. Mobile settings screenshot visually inspected.
- Initial backend attempt referenced an unavailable old test DB; created the
  dedicated test DB. Fixed SQL dynamic-EXEC expression in V69 after initializer
  rejected it; final clean run passed initialization and replay tests.
- Context7 scheduling/proxy documentation consulted (Spring Framework7.0.5,
  nearest returned version; project Spring Boot4.1.1). No new framework API used.
  Existing @Scheduled service-proxy boundary retained.

OpenAPI and separate-rent-utility ADR updated. No application DB writes, fixture
resets, live payment/provider actions, push or deployment. Dedicated Vite3196
stopped after checks. Three pre-existing untracked VNeID diagnostics untouched.
Restart backend to load code/V69 and reload frontend before using the change.
