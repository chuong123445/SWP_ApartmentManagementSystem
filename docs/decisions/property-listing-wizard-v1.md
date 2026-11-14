# Property listing wizard v1

## Status

Implementation in progress on `feat/property-listing-wizard`.

## Private drafts

A verified applicant starts an idempotent draft with a UUID requestKey and a fixed right type. The server creates a DRAFT Property and private wizard state without granting a role. Evidence uploads reuse the existing private property evidence APIs. Draft saves require a version. Completion locks the property, validates typed property and dossier commands, creates selected apartments and binds images in a single transaction. Repeating completion returns the completed draft. Submission through the legacy dossier command rejects incomplete wizard drafts.

Draft JSON is private input state. Typed completion validation and existing property-rights rules govern persistence. Responses use no-store. Draft creation is limited to 20 unfinished drafts per account. A completed draft clears its input JSON while submitted evidence and dossier history remain available through existing APIs.

## Images

V62 adds nullable apartment_id to property_images. Existing images remain common property images. Unit images belong to their property and apartment. Download requires uploader access while private. Public unit images additionally require that exact apartment to be published and its property approved with an active owner. Unit galleries show room images followed by common images. Common-gallery replacement only touches common images.

## AI extraction

The private ai-extract command reuses precheck file ownership, source hashes, audit, limits and provider configuration. Its dedicated prompt extracts visible facts without requiring declared form fields. Optional page provenance is validated in the report parser. Users explicitly apply suggestions. AI output does not change approval or account status.

## Commands

- POST /api/v1/me/listing-drafts accepts requestKey and rightType.
- GET /api/v1/me/listing-drafts returns the current applicant's unfinished drafts.
- GET /api/v1/me/listing-drafts/{id} resumes a private draft.
- PUT /api/v1/me/listing-drafts/{id} accepts version and JSON payload.
- POST /api/v1/me/listing-drafts/{id}/complete accepts version, typed property, typed dossier and submit flag.
- POST /api/v1/me/rental-properties/{id}/ai-extract accepts the precheck request shape and explicit consent.

## Checkpoint validation

10 unit tests passed for draft access/version/retry/completion and dossier payment compatibility. Backend compile passed. DossierAiClientTests attempted through its local HTTP fixture failed during setup because the environment denies loopback connections. SQL migration, transaction rollback and concurrency acceptance require a test database run. Live provider acceptance is pending.
