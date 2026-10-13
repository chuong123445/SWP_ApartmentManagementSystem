-- Explicit one-off local test reset requested 13 October 2026. Never a startup migration.
SET XACT_ABORT ON;
IF DB_NAME() <> 'proptech_db' THROW 51000, 'This script is restricted to proptech_db.', 1;
BEGIN TRANSACTION;
DECLARE @id uniqueidentifier;
SELECT @id=id FROM dbo.auth_accounts WITH (UPDLOCK,HOLDLOCK)
WHERE email='customer@ancu.local' AND role='CUSTOMER' AND status IN ('ACTIVE','PENDING_VERIFICATION');
IF @id IS NULL THROW 51000, 'Expected local Customer was not found or is locked/inactive.', 1;
UPDATE dbo.auth_accounts SET email_verified=0, phone_verified=0, contact_verified=0,
    status='PENDING_VERIFICATION', version=version+1 WHERE id=@id;
UPDATE dbo.auth_sessions SET revoked_at=SYSUTCDATETIME() WHERE account_id=@id AND revoked_at IS NULL;
UPDATE dbo.email_change_challenges SET invalidated_at=SYSUTCDATETIME()
WHERE account_id=@id AND used_at IS NULL AND invalidated_at IS NULL;
SELECT email,status,email_verified,phone_verified,contact_verified,version FROM dbo.auth_accounts WHERE id=@id;
COMMIT;
