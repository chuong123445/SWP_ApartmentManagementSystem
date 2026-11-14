# Additional near-expiry sample — 14 November 2026

User requested one additional contract between Hữu Hà and Nguyễn Văn Chương.
Created local sample contract **23**, apartment **30 / HH205.RENEW**, rental
request **62**, ACTIVE from 2026-08-21 through **2026-11-21** (D-7).
No renewal request exists on the new sample, allowing Customer to demonstrate
the request action. Existing contracts 4 and 21 were preserved. Readback shows
the previously existing renewal 5 on contract 21 is now REJECTED; this operation
did not modify it.

Source is local fixture 21; copied sample signature artwork is explicitly
labelled sample and signed-content hash is NULL, not a new real agreement.
New apartment is HIDDEN/OCCUPIED; no public catalog change.

Checks: rollback validation PASS; Apply PASS; all columns of all pre-existing
rows across six affected/account tables identical; independent SQL readback
confirms exact parties, D-7, ACTIVE, no renewal and no orphan drafts. An initial
marker collision correctly refused mutation; the extra sample uses its own
unique marker. Backup outside Git, XML/schema roundtrip verified:
`F:/2026/Fa26/DTD/tmp/renewal-demo-before-20261114-112144-324.xml`.
Helpers: backend `tools/add-renewal-demo-20261114.{ps1,sql}`, date-guarded and
idempotent by unique marker. No browser/provider verification or push.
