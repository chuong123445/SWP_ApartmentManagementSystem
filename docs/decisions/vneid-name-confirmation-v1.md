# Display name and VNeID name confirmation

Implemented scope: existing-account VNeID self verification. `AuthAccount.fullName` remains the editable display name; `ExternalIdentity.legalName` remains immutable verified-source evidence. New VNeID registrations have no manually entered name to compare and retain their current behavior. Existing bindings are not refreshed or rewritten.

The self endpoint normalizes NFC, case and Unicode whitespace for comparison, retaining Vietnamese accents. A different name returns HTTP 202 with the two names, expiry and an opaque handle. It does not persist the identity, mark the account verified or activate it. Matching names retain HTTP 200 behavior. A matching name is not itself identity evidence: the existing token/issuer/claim and uniqueness checks still apply.

The confirm/cancel commands require an internal session plus CSRF and accept only `confirmationId`. Backend-owned validated evidence is bound to the same account ID, session ID, account version and exact display name. Confirmation locks and refreshes the account, rechecks status/provider/subject/CCCD conflicts and consumes the handle once before binding. On failure, restart verification; there is no automatic bind fallback. Cancel discards the pending evidence. A new attempt replaces an earlier preview in the same account/session.

Pending evidence is kept in a bounded process-local map for at most five minutes, capped by the validated external token's expiry. Only the handle hash and validated identity snapshot are retained; no raw Auth0 token is stored. This deliberately avoids a schema migration and data changes during parallel work. Restart or routing to another instance fails closed. A multi-instance deployment should use sticky routing or replace this store with a shared expiring store; a user may need to start again. There is no persistent audit of cancelled previews in this unit.

Registration/profile UI labels the editable value “Tên hiển thị”. Profile displays the existing self-only verified legal name separately as read-only. Changing the display name does not modify legal evidence. Property dossiers and newly created contract snapshots already resolve verified citizen data in their existing services; this unit does not rewrite old saved drafts, signed agreements or fixtures.

Frontend callback shows both names and explicit confirm/cancel controls, disables repeated actions, clears an invalid preview and checks account context. External and confirmation credentials stay out of browser storage and URLs. Existing provider simulation wording remains explicit.

No schema/provider/account reset, role promotion, automatic property approval or contract history rewrite is introduced. See `docs/api/vneid.openapi.json` and the validation report for actual checks and limits.
