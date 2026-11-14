# Remove latest Owner asset — 14 November 2026

User requested deleting the newly created asset of Nguyễn Văn Chương.
Readback identified latest owned property25, “An Cư 01 - Linh Trung”, APPROVED,
completed listing, containing apartment31/P.101 VACANT/DRAFT. It had no rental
requests/contracts or financial/maintenance/conversation/import dependencies.

Deleted exactly property25 and apartment31, their amenity links, two images,
one dossier and its evidence associations/review records, one private evidence
metadata/content, one document check, two assistance runs and completed wizard
state. Shared evidence, unexpected dependencies, another latest property or
changed reviewed counts block deletion. Blank draft24 and all other properties
are preserved. All four contracts and five invoices present at execution time
were compared unchanged, including newly created records after earlier tasks.

One-off local helper `tools/remove-property25-20261114.{ps1,sql}` uses exact
date/database/Owner/email/property-name/apartment/state guards, serializable
transaction and backup before mutation. Private XML/schema backup outside Git:
`F:/2026/Fa26/DTD/tmp/remove-property25-before-20261114-142445-424.xml`.

Checks: backup roundtrip PASS, mutation rollback validation PASS, Apply PASS;
exact row-count deltas and all-column preservation outside deletion scope across
36 tables including binary evidence/images. Independent readback confirms25
absent,31 absent, other properties still listed. No identity reseed, credentials,
schema, app feature, bank/provider action, browser verification or push. Three
unrelated VNeID diagnostic files preserved. Reload the asset management page.
