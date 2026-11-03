param([string]$Database='ancu_account_roles_20261103')
$ErrorActionPreference='Stop'
# Reuse a dedicated test DB; never create/reset a DB or touch proptech_db.
if($Database -notmatch '^ancu_account_roles_[0-9]+$'){throw 'Only existing dedicated account-role test databases are allowed.'}
$taskBackend=Split-Path $PSScriptRoot -Parent;$taskConfig=@{}
foreach($line in Get-Content -LiteralPath ($taskBackend+'/src/main/resources/application.properties') -Encoding UTF8){if($line -match '^([^#=]+)=(.*)$'){$taskConfig[$matches[1].Trim()]=$matches[2]}}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433';$taskBuilder['Initial Catalog']=$Database;$taskBuilder['User ID']=$taskConfig['spring.datasource.username'];$taskBuilder['Password']=$taskConfig['spring.datasource.password'];$taskBuilder['TrustServerCertificate']=$true
if($env:SPRING_DATASOURCE_USERNAME){$taskBuilder['User ID']=$env:SPRING_DATASOURCE_USERNAME};if($env:SPRING_DATASOURCE_PASSWORD){$taskBuilder['Password']=$env:SPRING_DATASOURCE_PASSWORD}
$taskConnection=New-Object System.Data.SqlClient.SqlConnection($taskBuilder.ConnectionString)
function Sql([string]$Text){$cmd=$taskConnection.CreateCommand();try{$cmd.CommandTimeout=60;$cmd.CommandText=$Text;$cmd.ExecuteNonQuery()|Out-Null}finally{$cmd.Dispose()}}
function Scalar([string]$Text){$cmd=$taskConnection.CreateCommand();try{$cmd.CommandText=$Text;return $cmd.ExecuteScalar()}finally{$cmd.Dispose()}}
function Migrate {foreach($name in @('V50__account_roles.sql','V52__role_catalog.sql')){foreach($batch in [regex]::Split((Get-Content -Raw -Encoding UTF8 -LiteralPath ($taskBackend+'/src/main/resources/db/migration/'+$name)),'(?im)^GO\s*\r?$')){if($batch.Trim()){Sql $batch}}}}
function Check($Expected,$Actual,[string]$Message){if($Expected -ne $Actual){throw $Message}}
function Memberships {
 if([int](Scalar "SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.auth_account_roles') AND name='role'") -eq 1){return Scalar 'SELECT (SELECT account_id,role AS code FROM auth_account_roles ORDER BY account_id,role FOR JSON PATH)'}
 return Scalar 'SELECT (SELECT a.account_id,r.code FROM auth_account_roles a JOIN auth_roles r ON r.id=a.role_id ORDER BY a.account_id,r.code FOR JSON PATH)'
}
try{
 $taskConnection.Open()
 $accounts=Scalar "SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT * FROM auth_accounts ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)),2)"
 $contracts=Scalar "SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT * FROM rental_contracts ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)),2)"
 $memberships=Memberships
 Migrate;Migrate
 Check $memberships (Memberships) 'Effective memberships changed during catalog upgrade/replay.'
 Check $accounts (Scalar "SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT * FROM auth_accounts ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)),2)") 'Account data changed.'
 Check $contracts (Scalar "SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',(SELECT * FROM rental_contracts ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)),2)") 'Contract data changed.'
 Check 3 (Scalar 'SELECT COUNT(*) FROM auth_roles') 'Unexpected role catalog.'
 Check 1 (Scalar "SELECT COUNT(*) FROM sys.key_constraints WHERE parent_object_id=OBJECT_ID('dbo.auth_roles') AND type='UQ'") 'Catalog code must have one UNIQUE constraint.'
 Check 0 (Scalar "SELECT COUNT(*) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.auth_account_roles') AND name='role'") 'Old membership string column remains.'
 Check 2 (Scalar "SELECT COUNT(*) FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID('dbo.auth_account_roles') AND name IN('fk_auth_account_roles_account','fk_auth_account_roles_role') AND is_disabled=0 AND is_not_trusted=0") 'Both trusted FKs are required.'
 # Exercise V50's fresh-table path without allocating another database. All
 # temporary renames/initial grants are rolled back; original grants are restored.
 try{
  Sql @'
 BEGIN TRANSACTION;
 IF OBJECT_ID('dbo.verify_saved_account_roles','U') IS NOT NULL THROW 51000,'Unexpected verification artifact; preserve and review.',1;
 EXEC sys.sp_rename N'dbo.auth_account_roles',N'verify_saved_account_roles',N'OBJECT';
 DECLARE @old sysname,@new sysname,@qualified nvarchar(776);
 DECLARE roleConstraintNames CURSOR LOCAL FAST_FORWARD FOR
  SELECT name FROM sys.objects WHERE parent_object_id=OBJECT_ID('dbo.verify_saved_account_roles') AND type IN('PK','F','C','UQ');
 OPEN roleConstraintNames;FETCH NEXT FROM roleConstraintNames INTO @old;
 WHILE @@FETCH_STATUS=0 BEGIN
  SET @new=N'verify_saved_'+@old;SET @qualified=N'dbo.'+QUOTENAME(@old);
  EXEC sys.sp_rename @qualified,@new,N'OBJECT';
  FETCH NEXT FROM roleConstraintNames INTO @old;
 END;CLOSE roleConstraintNames;DEALLOCATE roleConstraintNames;
'@
  Migrate
  Check 0 (Scalar "SELECT COUNT(*) FROM (SELECT id,role FROM auth_accounts UNION SELECT id,'CUSTOMER' FROM auth_accounts WHERE role='OWNER' EXCEPT SELECT a.account_id,r.code FROM auth_account_roles a JOIN auth_roles r ON r.id=a.role_id) missing") 'Fresh membership backfill lost a role.'
  Check 0 (Scalar "SELECT COUNT(*) FROM (SELECT a.account_id,r.code FROM auth_account_roles a JOIN auth_roles r ON r.id=a.role_id EXCEPT SELECT id,role FROM auth_accounts EXCEPT SELECT id,'CUSTOMER' FROM auth_accounts WHERE role='OWNER') extra") 'Fresh membership backfill added an unexpected role.'
 }finally{Sql 'IF @@TRANCOUNT>0 ROLLBACK'}
 Check $memberships (Memberships) 'Rolled-back initialization changed existing grants.'
 Sql 'SET XACT_ABORT OFF'
 foreach($invalid in @("INSERT auth_account_roles(account_id,role_id) SELECT TOP(1) account_id,role_id FROM auth_account_roles","INSERT auth_account_roles VALUES(9223372036854775807,1)","INSERT auth_roles VALUES(999,'TENANT',N'Undecided role')","INSERT auth_roles VALUES(999,'ADMIN',N'Duplicate code')")){
  $blocked=$false;try{Sql $invalid}catch{$blocked=$true};Check $true $blocked 'Invalid/duplicate membership or role catalog row accepted.'
 }
 if([long](Scalar 'SELECT COUNT_BIG(*) FROM auth_account_roles') -gt 0){
  $blocked=$false;try{Sql 'INSERT auth_account_roles(account_id,role_id) SELECT TOP(1) account_id,9223372036854775807 FROM auth_account_roles'}catch{$blocked=$true};Check $true $blocked 'Unknown role FK accepted.'
 }
 Write-Output "PASS catalog upgrade/replay/fresh-membership-init-rollback/exact membership preservation/account-contract preservation/2FK/PK/UNIQUE/CHECK; reused database=$Database"
}finally{$taskConnection.Dispose();$taskConfig.Clear();$taskBuilder=$null}
