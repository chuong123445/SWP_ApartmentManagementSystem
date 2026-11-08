-- One row per canonical account-role membership. Private database lookup only.
-- Missing identity never changes roles or removes an account from the result.
CREATE OR ALTER VIEW dbo.vw_account_roles
AS
SELECT
    account.id AS account_id,
    account.full_name,
    CASE WHEN external_identity.account_id IS NOT NULL
         THEN external_identity.document_number
         ELSE identity_profile.document_number END AS document_number,
    role.id AS role_id,
    role.code AS role_code,
    role.name AS role_name,
    CASE WHEN external_identity.account_id IS NOT NULL THEN external_identity.source
         WHEN identity_profile.account_id IS NOT NULL THEN 'SELF_DECLARED'
         ELSE NULL END AS identity_source,
    CASE WHEN external_identity.account_id IS NOT NULL THEN external_identity.verification_status
         WHEN identity_profile.account_id IS NOT NULL THEN identity_profile.verification_status
         ELSE 'UNVERIFIED' END AS identity_verification_status,
    CASE WHEN external_identity.source = 'LOCAL_DEMO' THEN CAST(1 AS bit)
         WHEN external_identity.account_id IS NOT NULL THEN CAST(0 AS bit)
         ELSE identity_profile.local_fixture END AS identity_is_local_fixture
FROM dbo.auth_account_roles AS membership
JOIN dbo.auth_accounts AS account ON account.id = membership.account_id
JOIN dbo.auth_roles AS role ON role.id = membership.role_id
LEFT JOIN dbo.auth_external_identities AS external_identity
    ON external_identity.account_id = account.id AND external_identity.verification_status = 'VERIFIED'
LEFT JOIN dbo.account_identity_profiles AS identity_profile ON identity_profile.account_id = account.id;
GO
