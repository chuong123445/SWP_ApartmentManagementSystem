# Overview cash and monthly rent allocation — 14 November 2026

Backend `39840aeb`: read-only `allocatedRentAmount` at summary/month/property,
computed from SENT invoice saved rent/coverage. Four-decimal monthly split with
final-month remainder, legacy period fallback, cross-year allocation. Query
projects scalar coverage only; existing billed/paid/debt/cash and isolation stay.
No migration, invoice modification, provider action or application DB writes.

UI: Overview cash-only chart with overdue/debt and operational follow-up cards.
Reports shows allocation versus actual cash, allocated-year card, monthly and
property reconciliation tables, and matching CSV. Explains that allocation is
invoice-backed and excludes utilities/additional charges while cash includes
them. Old invoice-cohort detail remains labelled separately. Reports direct URL
now survives reload/year/property scope via the existing navigation hook.

Validation:

- **7 OwnerFinancialSummaryIntegrationTests PASS**, dedicated SQL test database
  `ancu_auto_rent_20261114`. Includes 6+6+2 invoices/119M paid later:34M allocated
  to2025,85M to2026,8.5M January–October,zero November/December allocation,119M
  November cash; utility/extra-receipt exclusion, unpaid allocation, draft/
  cancelled exclusion, rounding conservation, empty property, existing
  owner/tenant/property isolation, Vietnam payment dates and historical cohorts.
- **163 frontend tests, TypeScript, build PASS**. CSV test confirms allocated
  values are separate exact decimal strings; prior precision/formula protection
  tests retained. Existing bundle-size warning remains.
- **8 Playwright MCP scenarios PASS** at1440/390: Overview cash-only, Reports
  allocation/cash/table, year/property query, scoped CSV filename/download,
  empty and503→retry. No unexpected console/request errors or page overflow.
  Four chart flows rechecked for visual capture after Recharts entrance
  animation. Desktop cash and mobile report images visually inspected.
- First backend compile found a missing new property-record argument, corrected
  before passing the complete targeted suite. Tests/browser API fixtures do not
  assert live application DB UI or provider integration.
- Context7 Recharts3.10.1 docs used for responsive chart composition. No new
  dependencies. Own Vite3196 stopped after verification. Three existing VNeID
  diagnostic files preserved. No push, production deployment or fixture reset.

See ADR `docs/decisions/owner-rent-allocation-v1.md` and OpenAPI
`docs/api/owner-financial.openapi.json`. Restart backend and reload frontend.
