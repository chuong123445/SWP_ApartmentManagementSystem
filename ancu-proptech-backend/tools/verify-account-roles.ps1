param([string]$Database=('ancu_roles_migration_'+(Get-Date -Format 'yyyyMMddHHmmss')))
$ErrorActionPreference='Stop'
if($Database -notmatch '^ancu_roles_migration_[0-9]+$'){throw 'Only isolated role-verification databases are allowed.'}
$taskBackend=Split-Path $PSScriptRoot -Parent;$taskConfig=@{}
foreach($line in Get-Content -LiteralPath ($taskBackend+'/src/main/resources/application.properties') -Encoding UTF8){if($line -match '^([^#=]+)=(.*)$'){$taskConfig[$matches[1].Trim()]=$matches[2]}}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433';$taskBuilder['Initial Catalog']='master';$taskBuilder['User ID']=$taskConfig['spring.datasource.username'];$taskBuilder['Password']=$taskConfig['spring.datasource.password'];$taskBuilder['TrustServerCertificate']=$true
if($env:SPRING_DATASOURCE_USERNAME){$taskBuilder['User ID']=$env:SPRING_DATASOURCE_USERNAME};if($env:SPRING_DATASOURCE_PASSWORD){$taskBuilder['Password']=$env:SPRING_DATASOURCE_PASSWORD}
$taskConnection=New-Object System.Data.SqlClient.SqlConnection($taskBuilder.ConnectionString)
function Sql([string]$Text){$cmd=$taskConnection.CreateCommand();try{$cmd.CommandTimeout=60;$cmd.CommandText=$Text;$cmd.ExecuteNonQuery()|Out-Null}finally{$cmd.Dispose()}}
function Scalar([string]$Text){$cmd=$taskConnection.CreateCommand();try{$cmd.CommandText=$Text;return $cmd.ExecuteScalar()}finally{$cmd.Dispose()}}
function Migrate {foreach($batch in [regex]::Split((Get-Content -Raw -Encoding UTF8 -LiteralPath ($taskBackend+'/src/main/resources/db/migration/V50__account_roles.sql')),'(?im)^GO\s*\r?$')){if($batch.Trim()){Sql $batch}}}
function Check($Expected,$Actual,[string]$Message){if($Expected -ne $Actual){throw $Message}}
try{
 $taskConnection.Open();Sql "IF DB_ID(N'$Database') IS NOT NULL THROW 51000,'Choose a fresh verification database.',1; CREATE DATABASE [$Database];";$taskConnection.ChangeDatabase($Database)
 Sql @'
 CREATE TABLE auth_accounts(id bigint PRIMARY KEY,role varchar(20) NOT NULL,status varchar(24),version bigint,password_hash varchar(100));
 CREATE TABLE rental_contracts(id bigint PRIMARY KEY,customer_id bigint,status varchar(24));
 INSERT auth_accounts VALUES(1,'CUSTOMER','ACTIVE',5,'synthetic1'),(2,'OWNER','LOCKED',7,'synthetic2'),(3,'ADMIN','ACTIVE',9,'synthetic3');
 INSERT rental_contracts VALUES(1,2,'ACTIVE'),(2,2,'ACTIVE');
'@
 $before=Scalar 'SELECT (SELECT * FROM auth_accounts ORDER BY id FOR JSON PATH)';$contracts=Scalar 'SELECT (SELECT * FROM rental_contracts ORDER BY id FOR JSON PATH)'
 Migrate;Migrate
 Check $before (Scalar 'SELECT (SELECT * FROM auth_accounts ORDER BY id FOR JSON PATH)') 'Account data was changed.'
 Check $contracts (Scalar 'SELECT (SELECT * FROM rental_contracts ORDER BY id FOR JSON PATH)') 'Contract data was changed.'
 Check 4 (Scalar 'SELECT COUNT(*) FROM auth_account_roles') 'Wrong initial membership count.'
 Check 2 (Scalar 'SELECT COUNT(*) FROM auth_account_roles WHERE account_id=2') 'Owner must retain Customer.'
 Check 1 (Scalar 'SELECT COUNT(*) FROM auth_account_roles WHERE account_id=3') 'Admin must stay separate.'
 Sql "DELETE FROM auth_account_roles WHERE account_id=2 AND role='OWNER'"
 Migrate
 Check 0 (Scalar "SELECT COUNT(*) FROM auth_account_roles WHERE account_id=2 AND role='OWNER'") 'Replay regranted a revoked role from legacy projection.'
 Check 1 (Scalar "SELECT COUNT(*) FROM sys.foreign_keys WHERE name='fk_auth_account_roles_account' AND is_disabled=0 AND is_not_trusted=0") 'Untrusted/missing role FK.'
 Sql 'SET XACT_ABORT OFF'
 foreach($invalid in @("INSERT auth_account_roles VALUES(1,'TENANT')","INSERT auth_account_roles VALUES(1,'CUSTOMER')","INSERT auth_account_roles VALUES(999,'CUSTOMER')")){
  $blocked=$false;try{Sql $invalid}catch{$blocked=$true};Check $true $blocked 'Invalid membership was accepted.'
 }
 # Simulate an old writer after migration: fail closed, do not invent a grant.
 Sql "INSERT auth_accounts VALUES(4,'OWNER','ACTIVE',0,'synthetic4')"
 $blocked=$false;try{Migrate}catch{$blocked=$true};Check $true $blocked 'Old writer without canonical membership should fail migration.'
 Check 0 (Scalar 'SELECT COUNT(*) FROM auth_account_roles WHERE account_id=4') 'Missing membership was silently granted.'
 Write-Output "PASS role backfill/replay/no-regrant/PK/FK/checks/account-contract preservation/old-writer guard; database=$Database"
}finally{$taskConnection.Dispose();$taskConfig.Clear();$taskBuilder=$null}
