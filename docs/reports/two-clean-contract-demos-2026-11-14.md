# Reset all contracts for two clean demos — 14 November 2026

User explicitly requested removing all contracts and related invoices, then
creating one near expiry and one expired with no handover for demonstration.

Reviewed local database had contracts 4/21/23 and zero invoices. Removed their
drafts, renewal/expiry/meter/exit/handover records, including contract 4's completed
exit history. Old rental requests 39/60/62 remain CANCELLED with history.
No unrelated account, conversation, cancellation, cash or provider-test records
were changed. Existing fixture apartments are reused; no new catalog rows.

New local sample contracts, Owner Nguyễn Văn Chương (3) / Customer Hữu Hà (2):

| Contract | Room | Period | Demo |
| --- | --- | --- | --- |
| 26 | HH205.RENEW (apartment 30) | 2026-08-21 to 2026-11-21 | D-7; no renewal request |
| 27 | HH205.TEST (apartment 16) | 2026-08-12 to 2026-11-12 | Expired D-2; no handover |

Both contracts are ACTIVE internally, with no ended_at; the expired date is
intentional, allowing Owner to start the normal expired-contract handover flow.
Both apartments remain HIDDEN/OCCUPIED; old HH205.D10 apartment 17 is now VACANT.
Snapshot asset IDs/titles/room numbers match the reused apartments. Reused local
sample signature artwork is explicitly marked sample with NULL signed-content
hash; it does not attest a new real agreement.

Backend tools `reset-demo-contracts-20261114.{ps1,sql}` guard database/date,
exact reviewed contracts/parties/requests/private fixtures, unexpected financial
dependencies, and require a serializable transaction. One-off, not rerunnable
after Apply. Backup outside Git:
`F:/2026/Fa26/DTD/tmp/reset-contracts-before-20261114-112939-332.xml`.

Validation: backup XML/schema re-open comparison PASS; mutation rollback PASS;
Apply PASS after exact count deltas and all-column preservation outside scope
across 25 tables. Independent SQL read confirms exactly two contracts, zero
invoices/renewals/handovers/exit cases/events/evidence, correct D7/D-2 dates and
parties, no orphan drafts, sample artwork present and NULL new signature hashes.
No browser/provider verification or production changes. Three pre-existing
untracked VNeID diagnostic files preserved. No push.
