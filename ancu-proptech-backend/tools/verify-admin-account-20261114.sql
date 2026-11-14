-- Explicit one-off local account verification requested by the user.
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'Local one-off date/database guard.',1;
UPDATE auth_accounts SET email_verified=1,contact_verified=1,version=version+1
 WHERE id=9 AND full_name=N'Admin An Cư' AND role='ADMIN' AND status='ACTIVE'
 AND email_verified=0 AND contact_verified=0;
IF @@ROWCOUNT<>1 THROW 51000,'Exact Admin account guard failed or already verified.',1;
SELECT id,full_name,status,email_verified,contact_verified,phone_verified,identity_verified FROM auth_accounts WHERE id=9;
