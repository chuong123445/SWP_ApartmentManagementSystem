# Remove incomplete listing dossiers — 14 November 2026

After clarifying that the screenshot showed listing dossiers rather than lease
contracts, the user explicitly confirmed deleting all incomplete dossiers.

Removed11 incomplete wizard states and their empty DRAFT properties belonging
to Nguyễn Văn Chương/account3, property IDs11/13/14/15/16/17/19/20/21/22/23.
Removed12 private evidence metadata/content records,4 document-scan checks and
23 AI assistance records tied only to those deleted drafts. Submitted dossier
file references or any apartment/financial/import/other property dependency
would block the operation. All targets had zero such dependencies.

Preserved the one completed listing, all remaining properties/evidence, accounts,
both signed leases26/29, and all four invoices present at operation time,
including an additional invoice created after the earlier billing task.

Backend one-off helper `tools/remove-listing-drafts-20261114.{ps1,sql}` uses exact
database/date/party/ID/count guards and a serializable transaction, with dynamic
dependency checks. No identity reseed, provider calls, schema or application
feature change. Private backup outside Git:
`F:/2026/Fa26/DTD/tmp/remove-listing-drafts-before-20261114-132209-931.xml`.

Backup XML/schema roundtrip PASS. Rollback validation and Apply PASS, exact row
deltas and all-column preservation outside deletion scope across31 tables,
including evidence binary bytes. Initial validation rolled back because the
comparison wrapper assumed numeric IDs for UUID AI records; corrected to full
remaining-row comparison (no inserts) before successful validation/Apply.
Independent SQL readback: zero incomplete listings, one completed preserved,
both signed contracts still ACTIVE. No browser/UI verification claimed for this
database-only cleanup. Three unrelated diagnostics untouched; no push.

Reload the listing wizard/application page to clear its old in-memory draft list.
