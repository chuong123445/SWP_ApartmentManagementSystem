# Owner rent allocation and cash reporting

Confirmed 14 November 2026: Overview answers what was received and what needs
action; Reports explains rent belonging to each month versus cash collected.

- Overview uses one cash series by Vietnam paid date, including invoice payments
  and exact-party additional receipts. Current arrears/overdue/follow-up remain.
- Reports allocates only the rent frozen on SENT invoices across their calendar
  coverage months, regardless of paid status. Utility fees/additional receipts
  are excluded from rent allocation. This is not net profit, an accounting
  certification, or a forecast of unbilled contract rent.
- Multi-month invoices cross year boundaries. Divide the saved rent component
  by coverage-month count at four decimal places; put the remainder in the final
  coverage month so the allocation sum exactly equals saved invoice rent.
  Legacy missing coverage uses its invoice period. Calendar-month billing does
  not introduce a new partial-day proration rule.
- API adds decimal-string `allocatedRentAmount` at summary/month/property.
  Existing invoice-period cohorts, cash amounts, current debt and inventory keep
  their semantics. Owner/property isolation is unchanged; no private snapshot,
  bank or signature data is added to financial projections.
- Reports charts, monthly/property tables and CSV separate allocation from cash.
  Full invoice value by start month remains available for reconciliation, with
  explicit labels; it is not presented as the month's earned rent.

Example: 14 months September2025–October2026 at8.5M, collected119M in November2026.
Allocation2025=34M, allocation2026=85M (8.5M January–October, zero November/December).
Cash November2026=119M. Invoice cohorts2026=68M; the51M initial invoice belongs
to2025 but supplies January/February2026 allocation. These measures intentionally
differ and must not be added together.
