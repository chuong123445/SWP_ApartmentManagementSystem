# Property review and inventory follow-up

Branch `fix/property-review-inventory`, based on `4a9ae5a`.

## Backend

PropertyDuplicatePolicy runs at dossier submission and Admin approval. A normalized certificate number matching another currently approved property or an exact canonical RIGHT_DOCUMENT content hash used by another approved property produces HTTP409. No private owner/property identifiers are disclosed. Same-property renewal is excluded. Supporting evidence reuse alone does not trigger the ownership guard.

Source-import snapshots participate in certificate checks. Admin decisions and new source imports use a transaction-owned SQL Server application lock before account/property locks. Two pending dossiers can coexist, but approval checks again after the first approval. Existing historical duplicates are retained for review. SQL concurrency is implemented and awaiting database validation.

Approved manual properties can append a unit through existing Owner API with imageIds. Private images are required, current-right/ownership checks remain and image binding joins the creation transaction. Source append stays on fresh Auth0 source selection. No migration added.

Private uploaded unit photos have first priority. Otherwise an existing legacy room cover precedes common building photos. This preserves existing data and does not generate missing photographs.

## UI

Private property and application cards show dossier status/history, reviewedAt and Admin reason. Unapproved rooms are absent from operational inventory/sidebar and room cards in the private asset catalog. Their dossier cards remain available for correction and resubmission.

Approved manual MULTI_UNIT cards have a room-add action. Operational room-add opens the eligible-property form, replacing the new-property redirect. Source cards retain Auth0 append. Private photos and unit prices are required, new rooms save as DRAFT and publication is available on detail. Deposit stays an optional external agreement.

## Verification

- 29 backend unit tests passed, including duplicate policy, legacy photo precedence and atomic image append. Compile/testCompile passed.
- Two SQL integration cases added for pending duplicate approval and duplicate evidence after approval. Both failed before execution at context initialization, localhost1433 Permission denied getsockopt on test DB ancu_contract_pdf_20261103. Query/lock/concurrency/rollback SQL acceptance remains pending.
- 151 frontend tests, TypeScript and Vite build passed with existing chunk warning.
- Playwright MCP current build with mocked APIs at1440/390 passed decision reason, hidden unapproved cards, append with image/price payload and DRAFT, operations/sidebar filtering, console/network and overflow. Screens viewed. Durable e2e/property-review-inventory.spec.js saved. Fixtures do not establish live SQL behavior.

No application DB changes, cleanup of historical duplicates, generated replacement photos, live provider calls or push. Three preexisting VNeID diagnostic files excluded.

## Manual acceptance

1. Open /account/properties and inspect status/history/review time/reason.
2. Inspect /app room list/sidebar. Unapproved property rooms stay outside operations, approved unpublished rooms remain manageable.
3. Add room to approved manual MULTI_UNIT with private photos and unique room code. Reload, inspect image/DRAFT and explicit publication. Reject foreign images/duplicate room codes without partial creation.
4. Submit two properties with same certificate or exact ownership file. Approve one and expect409 for the other. Repeat simultaneous Admin approvals. Verify same-property rights renewal remains allowed.
5. Check legacy covers, uploaded private image priority and common gallery separation.

Context7 provided Spring Framework7.0.5 as available7.x documentation for project Spring Boot4.1.1, exact version unavailable. SQL lock ownership/return values checked against Microsoft. [sp_getapplock](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-getapplock-transact-sql)
