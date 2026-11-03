-- Additive role migration. auth_accounts.role remains a compatibility projection.
-- Deploy with the new backend; stop old writers before running the migration.
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @roleLock int;
 EXEC @roleLock=sys.sp_getapplock @Resource=N'ancu-account-roles-v50',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @roleLock<0 THROW 51000,'Cannot lock account role migration.',1;
 IF OBJECT_ID(N'dbo.auth_account_roles',N'U') IS NULL
 BEGIN
  CREATE TABLE dbo.auth_account_roles(
   account_id bigint NOT NULL,
   role varchar(20) NOT NULL,
   CONSTRAINT pk_auth_account_roles PRIMARY KEY(account_id,role),
   CONSTRAINT fk_auth_account_roles_account FOREIGN KEY(account_id) REFERENCES dbo.auth_accounts(id),
   CONSTRAINT ck_auth_account_roles_role CHECK(role IN ('ADMIN','OWNER','CUSTOMER')));
  INSERT dbo.auth_account_roles(account_id,role) SELECT id,role FROM dbo.auth_accounts;
  INSERT dbo.auth_account_roles(account_id,role) SELECT id,'CUSTOMER' FROM dbo.auth_accounts WHERE role='OWNER';
 END;
 -- Never regrant removed membership from the legacy role on replay.
 IF EXISTS(SELECT 1 FROM dbo.auth_accounts a WHERE NOT EXISTS(SELECT 1 FROM dbo.auth_account_roles r WHERE r.account_id=a.id))
  THROW 51000,'Account without canonical role; stop old writers and review migration.',1;
 COMMIT;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK;
 THROW;
END CATCH;
GO
