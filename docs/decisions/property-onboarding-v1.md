# Owner property onboarding and private review — 13 October 2026

User authorization: Owner email verification → management → add a single rentable home or multi-unit property → private drafts → property dossier/Admin review → explicit apartment publication. The user explicitly chose to implement both dossier submission and Admin review in this session.

## Model and transitions

`Property` is the Owner's asset/right to exploit, not necessarily an entire building. `SINGLE_UNIT` has exactly one rentable Apartment; `MULTI_UNIT` supports independently rented Apartments. Existing properties retain nullable mode without reclassification/reset. V8 is additive.

POST `/api/v1/owner/properties` creates a Property DRAFT and 1–50 Apartment DRAFT/VACANT rows atomically. Ownership is server-derived. Readings stay null unless supplied. Single-unit properties cannot gain a second Apartment, including through the existing apartment API. Each apartment has its own price/availability/request/contract/invoices. Limits are technical defaults, not a new rental business rule.

Owner sends the dossier against current propertyVersion; Property and dossier become PENDING_APPROVAL in one transaction. Only a fresh pending dossier can be decided by an ACTIVE ADMIN, using required integer version. APPROVE sets this property APPROVED; REQUEST_ADDITIONAL_INFORMATION sets NEEDS_INFORMATION; REJECT sets REJECTED. Non-approval requires a reason. Decisions record reviewer/time/reason. Property row lock serializes submissions/review, and a dossier cannot be decided twice. Rejected/needs-information properties can submit a new immutable dossier snapshot while preserving previous submissions and decisions. No re-review/revocation of an already approved property is implemented.

The dossier contains applicant name captured from the authenticated account, right type OWNERSHIP/AUTHORIZATION, receiving bank/account/holder, mandatory ownership/exploitation-right documents, and optional supporting/identity evidence. Admin manually compares these with property address and supporting evidence; no automatic legal identity or bank-account verification is claimed. OTP proves contact access only.

Approval does not publish apartments. Owner changes each apartment publication with version through POST `/api/v1/owner/apartments/{id}/publication`. PUBLISHED requires its own property APPROVED; HIDDEN hides the listing. Commands preserve availability, contracts and requests. Property approval is terminal in this slice; publication reads approved state and locks the apartment. Revocation/edit-after-approval needs a separate defined workflow.

## Private evidence

V9 stores metadata separately from bytes in SQL Server (`property_evidence_files`, `property_evidence_content`, `property_dossiers`, `property_dossier_files`). Files belong to an exact Property and authenticated uploader, with purpose RIGHT_DOCUMENT/SUPPORTING/OWNER_IDENTITY. A dossier can reference only files from that property and correct purpose, with no duplicates and at most 20 files. Upload is allowed only in DRAFT/NEEDS_INFORMATION/REJECTED, capped at 200 uploads/property.

The initial file adapter accepts genuine PNG/JPEG scans/photos, 5 MB per uploaded/canonical image and 20 million pixels. It checks image content and dimensions and decodes/re-encodes raster content without submitted metadata. Filenames are sanitized and generated extension follows detected format. No filesystem/public URL or original binary path is exposed. Images are served only as authenticated attachments with no-store/nosniff: owning verified Owner, or ACTIVE Admin when the file is referenced in a submitted dossier. Customers/other Owners/guests cannot obtain bytes or dossier/receiving-account DTOs. Public Apartment DTOs contain none of this evidence.

PDF/office/SVG files, external malware scanner, cloud storage, file deletion/retention/backup policy, dossier drafts, changing an approved dossier, and bulk publication are not implemented. Removing a file from the form removes its reference, not stored bytes. JPEG/PNG handling is not claimed as external antivirus scanning or authenticity proof.

## UI and access

Owner registration retains existing real email challenge workflow and restricted pending login. Successful email verification revokes sessions and requires re-login; a pending Owner then goes to /app, while an already active account's contact change returns to account settings. No new OTP bypass exists. Empty inventory invites “Thêm tài sản cho thuê”; the form adjusts single/multiple units. “Tài sản đang chọn” uses server UUIDs and persists shared data while filtering inventory/tenant/contract displays, invoice creation choices, and server-paginated rental inbox/invoices. Prototype finance/maintenance/reports remain outside the connected-data filter scope.

Owner “Tài sản cho thuê” exposes current approval state and dossier/history. Admin has `/admin/property-dossiers` with pending/status pagination, private detail/download, request-more/reject/approve, and no demo role switch. Admin login and `/app` route to that screen; shared profile/settings/logout remain available. This explicitly replaces the prior Admin reuse of Owner screens for the authorized review flow only.

Admin is server-provisioned staff, not public registration. Existing ADMIN accounts work. Optional local-only provisioning accepts LOCAL_ADMIN_EMAIL/LOCAL_ADMIN_PASSWORD/LOCAL_ADMIN_NAME in ignored .env.local, creates only a missing Admin, never promotes an Owner/Customer or resets existing credentials/status/history. It sets no contact-verification proof. Production has no local initializer. Disable test provisioning with app.admin.local-provisioning=false.

## Validation and remaining scope

Baseline commits: 65a97aa (property/API filters), f5bb658 (Owner UI and isolated E2E). SQL rollback tests cover input/cardinality/ownership/privacy, pending/review/resubmission/version/publication gates and filter-before-pagination. Playwright uses fresh uniquely named Owner/Admin accounts, guarded local test provisioning and cleanup; SMTP503 and OTP confirmation transport are simulated only to check frontend routing. These simulations/provisioning are not Gmail OTP evidence. Existing server OTP tests use a test mail adapter to confirm actual server consumption/activation/revocation; live Gmail inbox/application OTP remains unverified.

RDS/template/diagrams/UC IDs remain unchanged. Affected legacy RDS sections: Owner & Property Verification, UI/screens/navigation, and account verification versus legal identity. This ADR/API are implementation supplements, not a silent RDS rewrite. Full T09/T10/T11/T22 include other storage/revocation/edit/delete/Admin management work and are not all DONE from this slice.
