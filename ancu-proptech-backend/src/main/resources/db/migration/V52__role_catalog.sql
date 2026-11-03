-- Normalize memberships without granting, revoking or changing account state.
-- V50 remains the initial backfill; this upgrade preserves its exact membership set.
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @catalogLock int;
 EXEC @catalogLock=sys.sp_getapplock @Resource=N'ancu-account-roles-v50',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
 IF @catalogLock<0 THROW 51000,'Cannot lock role catalog migration.',1;
 IF OBJECT_ID('dbo.auth_account_roles','U') IS NULL THROW 51000,'Apply V50 before role catalog migration.',1;
 IF OBJECT_ID('dbo.auth_roles','U') IS NULL
  CREATE TABLE dbo.auth_roles(
   id bigint NOT NULL CONSTRAINT pk_auth_roles PRIMARY KEY,
   code varchar(20) NOT NULL CONSTRAINT uq_auth_roles_code UNIQUE,
   name nvarchar(100) NOT NULL,
   CONSTRAINT ck_auth_roles_code CHECK(code IN('ADMIN','OWNER','CUSTOMER')));
 IF EXISTS(SELECT 1 FROM dbo.auth_roles r
  JOIN (VALUES(CAST(1 AS bigint),'ADMIN'),(2,'OWNER'),(3,'CUSTOMER')) v(id,code) ON r.id=v.id OR r.code=v.code
  WHERE r.id<>v.id OR r.code<>v.code)
  THROW 51000,'Existing role catalog differs from approved identifiers; review without remapping grants.',1;
 INSERT dbo.auth_roles(id,code,name)
 SELECT v.id,v.code,v.name FROM (VALUES(CAST(1 AS bigint),'ADMIN',N'Quản trị viên'),(2,'OWNER',N'Chủ cho thuê'),(3,'CUSTOMER',N'Người tìm thuê')) v(id,code,name)
 WHERE NOT EXISTS(SELECT 1 FROM dbo.auth_roles r WHERE r.id=v.id);
 IF COL_LENGTH('dbo.auth_account_roles','role') IS NOT NULL
 BEGIN
  IF COL_LENGTH('dbo.auth_account_roles','role_id') IS NULL
   ALTER TABLE dbo.auth_account_roles ADD role_id bigint NULL;
  EXEC(N'UPDATE a SET role_id=r.id FROM dbo.auth_account_roles a JOIN dbo.auth_roles r ON r.code=a.role WHERE a.role_id IS NULL;
   IF EXISTS(SELECT 1 FROM dbo.auth_account_roles a LEFT JOIN dbo.auth_roles r ON r.code=a.role WHERE r.id IS NULL OR a.role_id IS NULL OR a.role_id<>r.id)
    THROW 51000,''Unknown or inconsistent membership; preserve data for review.'',1;
   ALTER TABLE dbo.auth_account_roles ALTER COLUMN role_id bigint NOT NULL;');
  DECLARE @oldRoleColumn int=COLUMNPROPERTY(OBJECT_ID('dbo.auth_account_roles'),'role','ColumnId'),@constraint sysname,@ddl nvarchar(max);
  DECLARE oldRoleChecks CURSOR LOCAL FAST_FORWARD FOR
   SELECT c.name FROM sys.check_constraints c WHERE c.parent_object_id=OBJECT_ID('dbo.auth_account_roles')
    AND (c.parent_column_id=@oldRoleColumn OR EXISTS(SELECT 1 FROM sys.sql_expression_dependencies d
     WHERE d.referencing_id=c.object_id AND d.referenced_id=c.parent_object_id AND d.referenced_minor_id=@oldRoleColumn));
  OPEN oldRoleChecks;FETCH NEXT FROM oldRoleChecks INTO @constraint;
  WHILE @@FETCH_STATUS=0 BEGIN
   SET @ddl=N'ALTER TABLE dbo.auth_account_roles DROP CONSTRAINT '+QUOTENAME(@constraint);EXEC sp_executesql @ddl;
   FETCH NEXT FROM oldRoleChecks INTO @constraint;
  END;CLOSE oldRoleChecks;DEALLOCATE oldRoleChecks;
  SET @constraint=NULL;
  SELECT @constraint=name FROM sys.key_constraints WHERE parent_object_id=OBJECT_ID('dbo.auth_account_roles') AND type='PK';
  IF @constraint IS NOT NULL BEGIN SET @ddl=N'ALTER TABLE dbo.auth_account_roles DROP CONSTRAINT '+QUOTENAME(@constraint);EXEC sp_executesql @ddl;END;
  EXEC(N'ALTER TABLE dbo.auth_account_roles DROP COLUMN role;
   ALTER TABLE dbo.auth_account_roles ADD CONSTRAINT pk_auth_account_roles PRIMARY KEY(account_id,role_id);');
 END;
 IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID('dbo.auth_account_roles') AND name='fk_auth_account_roles_role')
  EXEC(N'ALTER TABLE dbo.auth_account_roles WITH CHECK ADD CONSTRAINT fk_auth_account_roles_role FOREIGN KEY(role_id) REFERENCES dbo.auth_roles(id)');
 ALTER TABLE dbo.auth_account_roles WITH CHECK CHECK CONSTRAINT fk_auth_account_roles_account;
 ALTER TABLE dbo.auth_account_roles WITH CHECK CHECK CONSTRAINT fk_auth_account_roles_role;
 COMMIT;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK;
 THROW;
END CATCH;
GO
