# Rental decisions audit — 13 October 2026

The basic Owner decision flow works, but the handoff overstates completeness. This audit does not change rental decision implementation or select a FIFO policy.

Source reviewed: `C:/Users/chuong nguyen/.gemini/antigravity-cli/brain/f3d43d91-7280-4e8a-942f-c6b7195d68f0/session-summary-rental-decisions.md`. Repo HEAD at audit start: `479f3ca`; inspected working tree, not just commit history. The concurrent apartment-image change is recorded separately in WORK_PROGRESS.

## Findings

1. **P1 — E2E changes existing local business data.** `e2e/rental-decision.spec.ts` loops through every eligible apartment and cancels all PENDING requests belonging to LOCAL_TENANT_1, including records unrelated to this test. Its ACCEPT step permanently changes a catalog apartment to CONTRACT_IN_PROGRESS; finally only closes the browser context. Repeated runs consume available apartments and can cancel manually created requests. Do not rerun this workflow on the shared local catalog. Provision an isolated account/property/apartment/request and delete only those exact fixtures with guards, or use SQL rollback integration plus a UI-only transport test.

2. **P2 — Owner inventory remains stale after ACCEPT.** RentalRequestsPage calls its own `reload()` after a decision; useRentalWorkspace keeps apartment inventory mounted and refreshes it only through inventoryRevision. No successful decision invokes reloadInventory. Returning to the apartment tab still shows Căn hộ trống until a full reload. Reproduced in Playwright with a simulated remote ACCEPT response and simulated updated Apartment API: request becomes ACCEPTED, card remains VACANT; reload updates it to Đang làm hợp đồng. This UI probe did not perform real decisions or modify existing records. Connect a successful decision to shared inventory refresh/invalidation while preserving mounted workspace state.

3. **P2 — API accepts numeric decision enum and unknown fields despite OpenAPI contract.** In isolated SQL rollback fixtures, `{decision:0,version:0,customerId:"spoof"}` returned200 and selected ACCEPT. Current DTO has no strict enum-string parser/unknown-field rejection. No identity override was observed: service still obtains principal/ownership from JWT and uses the stored Customer. Nevertheless, numeric or unsupported input should return400 to match the documented enum/strict contract and avoid accidental acceptance. Missing version returned400 in the current Jackson runtime; no missing-version bypass was observed.

4. **P2 — Optional reason is silently discarded.** DTO/API client accept reason, but decide() never reads it and RentalRequest has no persistence/response field for it. Either implement and expose a bounded rejection reason according to an agreed rule, or explicitly remove/document the unsupported input. No fixed business rule for a mandatory reason is inferred here.

## What works and what the handoff should say

- Controller → Service → Repository structure, domain packages, JWT Owner ownership and Customer verification policy fit the architecture.
- ACCEPT changes request and apartment in one transaction; REJECT changes only the request and does not release an already selected apartment. No automatic rejection of other requests or provider/signature shortcut was added.
- SQL verification: two concurrent ACCEPT calls for distinct pending requests on one isolated apartment returned `[200,409]`; only one selection can succeed in this exercised case. Cancellation/mixed submission-versus-acceptance races were not additionally exercised by this audit.
- Existing18 DiscoveryRentalIntegrationTests passed again. They cover normal transitions, permission/version rejection and pending-first ordering, but their pass count alone is not proof of every race or browser state update.
- Pending-first, then createdAt/id ordering is implemented server-side. It orders the inbox; it does not enforce strict FIFO selection. D04 in the plan still needs reconciliation/confirmation before declaring full T13 complete; the handoff does not resolve that policy gate.
- Customer UI sees the new state on navigation/manual refresh; useRentalRequests has no polling/WebSocket/focus refresh. “Instant synchronization” describes committed server data, not a live update of an already open Customer page.
- Tạo hợp đồng is a placeholder alert, confirmed in the UI probe. No contract creation/signature/activation is implemented by this feature. This agrees with the stated slice, but is not T15 completion.
- The handoff says Spring Boot3.4; pom.xml and runtime are Spring Boot4.1.1 with Java21. Correct this documentation detail.

## Evidence and scope

- Existing suite:18/18 SQL Server tests, `ancu-proptech-backend/target/rental-review-existing-tests.log`.
- Diagnostic probes:2 completed; observations `AUDIT_MISSING_VERSION_HTTP=400`, `AUDIT_NUMERIC_ENUM_UNKNOWN_FIELD_HTTP=200`, `AUDIT_CONCURRENT_ACCEPT_HTTP=[200,409]`, in ignored `target/rental-review-probes.log`. Concurrent fixtures were committed only for the race and removed in guarded cleanup; ordinary probes rolled back. Diagnostic PASS means the observation ran, not that the numeric-input behavior is correct.
- UI-only simulated remote decision:1 Playwright probe passed, demonstrating stale inventory and placeholder contract action; no real decision was sent. Temporary audit source files were removed after execution.
- Frontend32 unit tests/lint/build passed during the overlapping image task. They verify client request construction and transport errors; they do not resolve the findings above.
- The old E2E acceptance/cancellation workflow was deliberately not rerun because of finding1. Existing screenshots/test claims were not treated as proof of current behavior.

Recommended next step: fix fixture isolation, strict request DTO handling and shared inventory invalidation before accepting this feature as complete; clarify reason/live-refresh scope and the pending business policy separately.
