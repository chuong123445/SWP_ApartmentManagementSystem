# Owner invoice payment history — 03 November 2026

## Finding and behavior

The Owner invoice screen loaded monthly `rental_invoices` only. The Tenant screen also loaded tenant-received separate SePay receipts. A read-only aggregate of the local database found four monthly SENT/UNPAID invoices, one tenant-received PAID receipt, one tenant-received UNPAID receipt and two owner-only UNPAID test receipts. The paid record had not disappeared; it belonged to the source missing from the Owner screen.

Owner billing now shows monthly invoices and a separate “Phiếu thanh toán gửi người thuê” section. ALL is the default; DRAFT, UNPAID and PAID filters apply on the server before pagination/count. Each source has its own pagination, empty state and error handling. Received receipt detail displays recorded payment status, time and reference through GET requests. Older receipts remain reachable beyond the former top-20 test history. Owner-only test receipts stay outside this list.

Issuance and payment remain distinct: a paid monthly invoice remains SENT with paymentStatus PAID derived from recorded paidAt. Separate receipts are not converted to monthly debt or added to monthly revenue. Filtering history does not replace the baseline workspace invoice data consumed by dashboards/reports. Filter/page state belongs to the shared workspace; changing property resets pages. History refreshes every 10 seconds while visible and on focus; stale responses are ignored after scope/filter changes or leaving the page.

## API and authorization

- `GET /api/v1/owner/invoices?filter=ALL|DRAFT|UNPAID|PAID` retains the existing default contract and optional propertyId.
- `GET /api/v1/owner/invoices/additional?page=0&size=20&propertyId=…&paymentStatus=ALL|UNPAID|PAID` returns a paginated received-receipt history.
- `GET /api/v1/owner/invoices/additional/{id}` returns a received receipt for its exact eligible Owner.

Both new endpoints are read-only/no-store. Queries require the payment Owner, actual contract Owner and contract Customer recipient to match. Owner-only tests, inconsistent recipients and foreign Owners are excluded; Tenant/guest access is denied. No new schema, payment write, QR creation, provider call, data rewrite or fixture reset is required. The old test-settings history endpoint is unchanged. This branch is based on main 15da508 and does not incorporate the separate pending tenancy/view/summary PR31.

## Validation

- Backend: **37 passed**, zero failures/errors/skips: BillingIntegrationTests (12), SepayIntegrationTests (20), SepayBankClientTests (5). Executed offline on an isolated existing SQL Server verification clone with seeding/mail/AI/lifecycle scheduler disabled; no application database payment mutations. Added checks cover pre-pagination payment filters, SENT/PAID separation, 21 paid received receipts, second page, totals, property/Owner isolation, inconsistent recipient exclusion, detail access and invalid paging.
- Frontend: **99 unit tests passed**; TypeScript check and native Vite production build passed. Build retains the existing chunk-size warning (>500 kB).
- Playwright MCP: **12 browser scenarios passed** at 1440 px and 390 px: ALL/PAID/DRAFT, independent receipt pagination, each-source failure, focus refresh UNPAID→PAID, property switch and persisted filter after switching management tabs. Mocked private APIs; no unexpected network requests, payment writes, page errors, unexpected console errors or document horizontal overflow. Inspected mobile list/detail screenshots. Browser initially had a closed target; reopened it. An early test used the wrong existing mobile menu label, corrected before the passing run. The first temporary Vite process stopped; the full final run used a dedicated replacement server.
- Context7 checked Spring Data JPA paging/count queries against the Spring Boot 4.1.1 project and React effect cleanup/stale-fetch handling against the installed React 19 project. OpenAPI JSON and local references validated; Git diff whitespace checked.

The browser checks verify the new UI with controlled API fixtures; they do not claim the user's currently running IDE server already serves this branch. After merging, restart/rebuild the backend and reload the frontend to load the new read endpoints/UI. No merge to main was performed by this task.
