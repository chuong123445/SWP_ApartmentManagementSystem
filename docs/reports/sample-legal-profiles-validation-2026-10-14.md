# Sample legal profiles — validation and applied data, 14 October 2026

Completed the explicit local-data request, excluding **customer@ancu.local** and **Toà VC01**. Added four self-only identity profiles with eight clearly marked sample front/back PNGs, and filled missing contact/profile fields for those accounts. Existing display-name/birth/address values were preserved; identity has its own separate living/document addresses. Passwords, emails, roles, account/contact verification were not changed. All sample identity remains NOT_VERIFIED.

Added four structured sample dossiers/certificate images for An Cư Lê Văn Sỹ, An Cư Thủ Đức, An Cư local - Hải Châu and An Cư local - Xuân Hòa, covering **10 apartments**. Their already-approved property/publication states were preserved. Certificate numbers use MAU-GCN-2026-*; issue dates/places and ownership/right descriptions are illustrative. Sample dossier markers and watermarked images explicitly distinguish them from real Admin-reviewed evidence; no reviewer or review time was fabricated. Receiving-account mandatory fields are non-transactional placeholders.

V12 persists certificate metadata/sample markers. Existing Owner submission can provide the complete optional certificate group and exploitation-right description; private Owner/Admin screens show it. Contract authoring derives legal identity and approved-dossier metadata server-side, restricts reads to exact parties and omits document images. New fields affect stale-source validation. Saved drafts/contracts remain frozen; legacy JSON with missing additive fields remains readable. **The pre-existing saved draft was not rewritten** and can still display missing fields from its original snapshot. New drafts use the enriched profiles.

| Validation | Actual result |
|---|---|
| SQL-backed integration selection | 63/63 passed: 15 contract, 10 property dossier, 7 identity, 22 rental, 9 billing; 0 failures/errors/skips, Maven BUILD SUCCESS, target/sample-legal-tests-final.log |
| New coverage | Optional complete certificate group/future dates/client-flag rejection; scoped identity metadata without images; stale-source rejection; frozen/legacy snapshots; sample marker retained until both images replaced, without verifying identity |
| Frontend | 36/36 unit tests, final TypeScript and production build passed; existing large-bundle warning remains |
| Final Playwright Edge suite | 5/5 passed, 1.2 min: real scoped contract wizard and racing creates/edits; identity save/edit/reload; guest catalog; property submission/Admin review/resubmission/publication with new certificate fields; read-only actual sample identity/dossier views |
| Visual/responsive | Inspected sample identity, sample property dossier and contract review screenshots; mobile390 has no horizontal overflow, browser checks have no page errors |
| Local fixture helper | Preview4accounts/4properties; first apply4identity/4dossiers; rerun0/0; serializable preservation hashes PASS |
| Excluded data | customer@ancu.local retains no identity profile; VC01 has0dossiers/0files, property and apartment hashes unchanged |
| Final SQL audit | 5 accounts,4sample identities/4image pairs,4complete sample dossiers covering10apartments;13apartments/3contracts/1existingdraft/3invoices;0testaccounts/0recovery manifests |
| OpenAPI | Identity/property/contract JSON and internal references3/47/49 valid |

Pre-change local backups are ignored backend target/sample-legal-before-20261014T045303382.json and subsequent idempotency checkpoints. Preservation checks compare excluded account/VC01/all apartments/contracts/stored drafts/invoices and credentials/verification hashes. The third contract and one stored draft already existed at task start; they were preserved, not deleted to match older handoffs. Fixture scripts are explicit local-only tools, never startup seeds.

Initial browser run had3passes/1identity-test failure: reloading after a save returned to login; the test did not explicitly wait for the second PUT response. The test now explicitly waits for its PUT response and re-enabled save button; rerun2passed15.2s and the final combined5-workflow run passed. No unrun checks are marked PASS. Context7 Bean Validation/MVC docs were checked against Boot4.1.1/Framework7. No eKYC/SMTP/signing/provider was exercised or claimed.

Code commits: c4db918 API/schema/private snapshot integration; 3b83d68 explicit guarded local fixture helper. UI commit c39e9a9; the documentation commit is recorded in WORK_PROGRESS. Dedicated test8082PID13144 and Vite3002PID7832 were command-line verified/stopped;0listeners remain. User8080/SQL Server were preserved. No push. Restart the user's backend to load V12/new DTOs, reload frontend, then view account identity or Owner property dossiers. New contract drafts consume the added fields; existing saved snapshots retain their original contents.
