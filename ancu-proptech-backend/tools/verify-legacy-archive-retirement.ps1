param([string]$Database='ancu_account_roles_20261103')
$ErrorActionPreference='Stop'
# All fixtures and migration effects are rolled back. Reuse an existing test DB only.
if($Database -notmatch '^ancu_account_roles_[0-9]+$'){throw 'Only existing dedicated account-role test databases are allowed.'}
$taskBackend=Split-Path $PSScriptRoot -Parent
$taskConfig=@{}
foreach($line in Get-Content -LiteralPath ($taskBackend+'/src/main/resources/application.properties') -Encoding UTF8){if($line -match '^([^#=]+)=(.*)$'){$taskConfig[$matches[1].Trim()]=$matches[2]}}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433';$taskBuilder['Initial Catalog']=$Database
$taskBuilder['User ID']=$taskConfig['spring.datasource.username'];$taskBuilder['Password']=$taskConfig['spring.datasource.password'];$taskBuilder['TrustServerCertificate']=$true
if($env:SPRING_DATASOURCE_USERNAME){$taskBuilder['User ID']=$env:SPRING_DATASOURCE_USERNAME}
if($env:SPRING_DATASOURCE_PASSWORD){$taskBuilder['Password']=$env:SPRING_DATASOURCE_PASSWORD}
$taskConnection=New-Object System.Data.SqlClient.SqlConnection($taskBuilder.ConnectionString)
function Sql([string]$Text){$cmd=$taskConnection.CreateCommand();try{$cmd.CommandTimeout=60;$cmd.CommandText=$Text;$cmd.ExecuteNonQuery()|Out-Null}finally{$cmd.Dispose()}}
function Scalar([string]$Text){$cmd=$taskConnection.CreateCommand();try{$cmd.CommandTimeout=60;$cmd.CommandText=$Text;return $cmd.ExecuteScalar()}finally{$cmd.Dispose()}}
function Check($Expected,$Actual,[string]$Message){if($Expected -ne $Actual){throw $Message}}
$taskMigration=Get-Content -Raw -Encoding UTF8 -LiteralPath ($taskBackend+'/src/main/resources/db/migration/V49__retire_three_legacy_archives.sql')
function Migrate {foreach($batch in [regex]::Split($taskMigration,'(?im)^GO\s*\r?$')){if($batch.Trim()){Sql $batch}}}
$taskTargets="'legacy_invoices_archive','legacy_room_amenities_archive','legacy_rooms_archive'"
function Fixture {
 Sql @'
 BEGIN TRANSACTION;
 CREATE TABLE dbo.legacy_rooms_archive(id int PRIMARY KEY);
 CREATE TABLE dbo.legacy_room_amenities_archive(room_id int NOT NULL REFERENCES dbo.legacy_rooms_archive(id),amenity nvarchar(100));
 CREATE TABLE dbo.legacy_invoices_archive(id int PRIMARY KEY,room_id int REFERENCES dbo.legacy_rooms_archive(id));
 INSERT dbo.legacy_rooms_archive VALUES(1);
 INSERT dbo.legacy_room_amenities_archive VALUES(1,N'Tủ lạnh');
 INSERT dbo.legacy_invoices_archive VALUES(1,1);
'@
}
function Rollback {Sql 'IF @@TRANCOUNT>0 ROLLBACK; SET XACT_ABORT OFF;'}
function Fingerprint {
 # Snapshot every application table's data and column/constraint metadata.
 return Scalar @'
 DECLARE @t nvarchar(517),@sql nvarchar(max),@data nvarchar(max)=N'';
 DECLARE tables CURSOR LOCAL FAST_FORWARD FOR
 SELECT QUOTENAME(SCHEMA_NAME(schema_id))+'.'+QUOTENAME(name) FROM sys.tables WHERE is_ms_shipped=0 ORDER BY schema_id,name;
 OPEN tables; FETCH NEXT FROM tables INTO @t;
 WHILE @@FETCH_STATUS=0 BEGIN
  SET @sql=N'SELECT @result=CONVERT(nvarchar(max),(SELECT * FROM '+@t+N' FOR JSON PATH,INCLUDE_NULL_VALUES))';
  DECLARE @result nvarchar(max);EXEC sp_executesql @sql,N'@result nvarchar(max) OUTPUT',@result OUTPUT;
  SET @data+=@t+CONVERT(varchar(64),HASHBYTES('SHA2_256',@result),2);
  FETCH NEXT FROM tables INTO @t;
 END;CLOSE tables;DEALLOCATE tables;
 SET @data+=(SELECT object_id,name,type,parent_object_id FROM sys.objects WHERE is_ms_shipped=0 ORDER BY object_id FOR JSON PATH);
 SET @data+=(SELECT object_id,name,column_id,user_type_id,max_length,is_nullable FROM sys.columns WHERE object_id IN(SELECT object_id FROM sys.tables WHERE is_ms_shipped=0) ORDER BY object_id,column_id FOR JSON PATH);
 SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',@data),2);
'@
}
try {
 $taskConnection.Open()
 $order=$taskConfig['spring.sql.init.schema-locations'].Split(',')
 $retirement=[array]::IndexOf($order,'classpath:db/migration/V49__retire_three_legacy_archives.sql')
 if($retirement -lt 0){throw 'V49 is missing from startup.'}
 foreach($prior in @('V3__unify_apartments.sql','V4__import_legacy_rooms.sql','V5__tenant_billing.sql','V19__numeric_identity_ids.sql')){
  $position=[array]::IndexOf($order,'classpath:db/migration/'+$prior)
  if($position -lt 0 -or $position -ge $retirement){throw "V49 must follow $prior"}
 }
 if($retirement -ge [array]::IndexOf($order,'classpath:db/migration/V50__account_roles.sql')){throw 'V49 must precede V50.'}
 Check 0 (Scalar "SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN($taskTargets,'verify_archive_external','verify_archive_view')") 'Test fixture names already exist; preserve them and stop.'
 $before=Fingerprint
 # Absent tables: ordinary startup and replay leave every existing table unchanged.
 Migrate;Migrate
 Check $before (Fingerprint) 'Absent-table migration changed application data/schema.'
 # Nonempty archives with child FKs: delete exactly three and replay; rollback fixtures.
 try {
  Fixture
  Migrate;Migrate
  Check 0 (Scalar "SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN($taskTargets)") 'Archives were not retired.'
  Check $before (Fingerprint) 'Migration changed a non-target table.'
 } finally {Rollback}
 Check $before (Fingerprint) 'Successful-path rollback did not restore original database.'
 # Exercise the real startup rename batches from V3/V5 before V49.
 Check 0 (Scalar "SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN('rooms','room_amenities','invoices','tenants')") 'Old table names exist; preserve them and stop.'
 try {
  Fixture
  Sql "EXEC sys.sp_rename 'dbo.legacy_rooms_archive','rooms'; EXEC sys.sp_rename 'dbo.legacy_room_amenities_archive','room_amenities'; EXEC sys.sp_rename 'dbo.legacy_invoices_archive','invoices';"
  foreach($name in @('V3__unify_apartments.sql','V5__tenant_billing.sql')){
   $source=Get-Content -Raw -Encoding UTF8 -LiteralPath ($taskBackend+'/src/main/resources/db/migration/'+$name)
   foreach($batch in [regex]::Split($source,'(?im)^GO\s*\r?$')){
    if($batch -match "sp_rename 'dbo\.(rooms|room_amenities|invoices)'"){Sql $batch}
   }
  }
  Check 3 (Scalar "SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN($taskTargets)") 'Old startup scripts did not produce all three archives.'
  Migrate;Migrate
  Check $before (Fingerprint) 'Old-name startup path changed a non-target table.'
 } finally {Rollback}
 # A partial deployment with only one archive is supported too.
 try {
  Sql 'BEGIN TRANSACTION; CREATE TABLE dbo.legacy_invoices_archive(id int); INSERT dbo.legacy_invoices_archive VALUES(1);'
  Migrate
  Check $before (Fingerprint) 'Single-archive migration changed non-target tables.'
 } finally {Rollback}
 # External FK and SQL dependencies must block the drop atomically.
 foreach($kind in @('FK','VIEW')) {
  try {
   Fixture
   if($kind -eq 'FK'){Sql 'CREATE TABLE dbo.verify_archive_external(room_id int REFERENCES dbo.legacy_rooms_archive(id));'}
   else{Sql 'CREATE VIEW dbo.verify_archive_view AS SELECT id FROM dbo.legacy_rooms_archive;'}
   $blocked=$false
   try {Migrate} catch {if($_.Exception.ToString() -notmatch 'external (table|SQL object) references'){throw};$blocked=$true}
   Check $true $blocked "External $kind dependency was not rejected."
   # Migration's CATCH rolls back the whole fixture transaction before rethrow.
   Check $before (Fingerprint) "Dependency failure $kind did not roll back atomically."
  } finally {Rollback}
 }
 Check $before (Fingerprint) 'Final database differs from initial state.'
 Write-Output "PASS startup-order/absent/replay/nonempty-three/V3-V5-old-name-path/partial/external-FK/external-view/atomic-rollback/all-other-table fingerprints; reused database=$Database"
} finally {$taskConnection.Dispose();$taskConfig.Clear();$taskBuilder=$null}
