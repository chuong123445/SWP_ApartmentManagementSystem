# Paid expired-contract rent demo — 14 November 2026

User confirmed 14 full months, six-month collection cycle, three paid invoices
(6 + 6 + 2). Applied only to local sample contract29 / HH205.TEST, Hữu Hà (2)
and Nguyễn Văn Chương (3). Near-expiry contract26 is unchanged.

Contract29 now runs **2025-09-01 through 2026-10-31**, 14 complete calendar
months, rent8,500,000 VND/month, cycle6, agreed payment day5. ACTIVE internally
with past end date and no handover/exit, for the expired handover demo.
Baseline/activation date aligned to the new start. Draft content version +1 and
sample disclosure updated; signature artwork/snapshot/clauses/hash retained
(hash NULL, illustrative artwork does not attest a new real agreement).

| Invoice | Coverage | Months | Amount | Payment |
| --- | --- | --- | --- | --- |
| 16 | 2025-09-01 → 2026-02-28 | 6 | 51,000,000 VND | PAID |
| 17 | 2026-03-01 → 2026-08-31 | 6 | 51,000,000 VND | PAID |
| 18 | 2026-09-01 → 2026-10-31 | 2 | 17,000,000 VND | PAID |

Total119,000,000 VND. No gaps, overlaps or partial days; final cycle charges only
the two remaining months. RENT invoices exclude electricity/water/internet/rubbish.
Each is SENT with paid_at, equal payment amount, tenant notification and two
audit events. Payment bank/account/code and audit reasons explicitly mark
LOCAL_DEMO; collection_owner_id NULL. No bank transfer, SePay webhook/event,
cash entry or settlement credit was created. These are demo paid records only.

Backend helpers `tools/paid-expired-rent-demo-20261114.{ps1,sql}` guard exact local
database/date/old sample/empty invoices and no handover. Backup before Apply:
`F:/2026/Fa26/DTD/tmp/paid-expired-rent-before-20261114-123126-192.xml`.
Private backup outside Git, XML/schema roundtrip PASS. Revised rollback
validation PASS; Apply PASS with exact row deltas, all-column preservation
outside scope across25 tables, exact allowed contract/draft changes and original
artwork bytes. Independent post-commit SQL readback PASS: 3 paid invoices,
14 months/119M, new dates/cycle6, no exit/handover/provider/settlement records.

The earlier monthly-invoice proposal was validated and rolled back only; no
monthly invoices were applied. Rollbacks consumed identity values without
reseeding. No production logic change, UI/provider verification or push. Three
pre-existing VNeID diagnostics remain untouched. Reload Owner/Customer invoices.
