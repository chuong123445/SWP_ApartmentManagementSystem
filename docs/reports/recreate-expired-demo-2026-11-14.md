# Recreate expired demo after bilateral handover — 14 November 2026

User requested removing the contract whose handover had been signed by both
parties and restoring the original expired/no-handover demonstration.
Readback identified local contract 27, ENDED, HH205.TEST/apartment16, exit
CONFIRMED with both signature timestamps. No invoices referenced it.

Removed contract27/draft24 and its exit case/three events, plus any scoped
handover/expiry/renewal/meter records. Old request66 is retained CANCELLED.
Created local sample **29**, request **68**, same room HH205.TEST and parties
Hữu Hà (2) / Nguyễn Văn Chương (3), 2026-08-12 through **2026-11-12** (D-2).
ACTIVE internally with no ended_at so the expired handover can be demonstrated
again; apartment16 is OCCUPIED/HIDDEN. No handover or renewal exists.
Sample artwork is explicitly illustrative; signed-content hash remains NULL.
Near-expiry contract26 and every other row outside scope were preserved.

Backend helpers `recreate-expired-demo-20261114.{ps1,sql}` are one-off local/date
guarded, require the exact confirmed/both-signed source and reject unexpected
financial or competing-selection dependencies. Backup outside Git:
`F:/2026/Fa26/DTD/tmp/recreate-expired-before-20261114-115951-162.xml`.
Backup roundtrip, serializable rollback validation, Apply, exact count deltas and
all-column preservation outside scope across25 tables PASS. Independent SQL
readback: exactly contracts26/29, zero invoices/handovers/exit cases/events/
evidence/renewals, no orphan drafts, correct parties/dates/statuses. No browser
or provider verification; no push; three unrelated diagnostic files preserved.
