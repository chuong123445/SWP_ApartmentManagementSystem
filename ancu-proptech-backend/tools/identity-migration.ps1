param([ValidateSet('Prepare','Verify','Apply')][string]$Mode='Prepare')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$manifestPath=Join-Path $root 'target/identity-migration-manifest.json'
$settings=@{}
foreach($file in @('src/main/resources/application.properties','.env.local')){foreach($line in Get-Content (Join-Path $root $file) -ErrorAction SilentlyContinue){if($line -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}}
$builder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$builder['Data Source']='localhost,1433';$builder['Initial Catalog']='master';$builder['User ID']=$settings['spring.datasource.username'];$builder['Password']=$settings['spring.datasource.password'];$builder['Encrypt']=$true;$builder['TrustServerCertificate']=$true
$connection=New-Object System.Data.SqlClient.SqlConnection $builder.ConnectionString
function Run([string]$sql){$cmd=$connection.CreateCommand();$cmd.CommandTimeout=180;$cmd.CommandText=$sql;[void]$cmd.ExecuteNonQuery()}
function Rows([string]$sql){$cmd=$connection.CreateCommand();$cmd.CommandTimeout=180;$cmd.CommandText=$sql;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter $cmd;$table=New-Object System.Data.DataTable;[void]$adapter.Fill($table);return ,$table}
function Migrate([string]$database){Run "USE [$database]; EXEC sys.sp_set_session_context @key=N'identity_migration_approved',@value=1;";foreach($file in @('V18__property_images_prices_identity.sql','V19__numeric_identity_ids.sql')){$sql=Get-Content -Raw (Join-Path $root "src/main/resources/db/migration/$file");foreach($batch in [regex]::Split($sql,'(?im)^GO\s*\r?$')){if($batch.Trim()){Run $batch}}}}
function Audit([string]$database){
 Run "USE [$database]"
 $counts=Rows "SELECT t.name,SUM(p.rows) row_count FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN(0,1) WHERE t.is_ms_shipped=0 GROUP BY t.name ORDER BY t.name"
 $digest=Rows "SELECT 'passwords' item,COUNT(*) n,CHECKSUM_AGG(BINARY_CHECKSUM(password_hash)) digest FROM auth_accounts UNION ALL SELECT 'snapshots',COUNT(*),CHECKSUM_AGG(BINARY_CHECKSUM(CONVERT(varchar(64),HASHBYTES('SHA2_256',snapshot_json),2))) FROM contract_drafts UNION ALL SELECT 'identity_images',COUNT(*),CHECKSUM_AGG(BINARY_CHECKSUM(CONVERT(varchar(64),HASHBYTES('SHA2_256',front_content),2),CONVERT(varchar(64),HASHBYTES('SHA2_256',back_content),2))) FROM account_identity_documents UNION ALL SELECT 'evidence',COUNT(*),CHECKSUM_AGG(BINARY_CHECKSUM(CONVERT(varchar(64),HASHBYTES('SHA2_256',content),2))) FROM property_evidence_content"
 return @{counts=@($counts|ForEach-Object {@{table=$_.name;rows=[long]$_.row_count}});digests=@($digest|ForEach-Object {@{item=$_.item;n=[long]$_.n;digest="$($_.digest)"}})}
}
function Check($before,$after){foreach($item in $before.counts){$actual=@($after.counts|Where-Object table -eq $item.table);if($actual.Count -ne 1 -or $actual[0].rows -ne $item.rows){throw "Row preservation failed: $($item.table)"}};foreach($item in $before.digests){$actual=@($after.digests|Where-Object item -eq $item.item);if($actual.Count -ne 1 -or $actual[0].n -ne $item.n -or $actual[0].digest -ne $item.digest){throw ('Private content fingerprints changed: '+$item.item)}}}
try{
 $connection.Open()
 if($Mode -eq 'Prepare'){
  if(Test-Path $manifestPath){throw 'Manifest exists; use Verify. Never overwrite a backup manifest.'}
  $before=Audit 'proptech_db';Run 'USE [master]'
  $paths=Rows "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000)) backup_path,CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(4000)) data_path,CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS nvarchar(4000)) log_path"
  $stamp=Get-Date -Format yyyyMMddHHmmss;$clone="ancu_identity_verify_$stamp";$backup=Join-Path $paths.Rows[0].backup_path "ancu_before_identity_$stamp.bak"
  $backupSql=$backup.Replace("'","''");Run "BACKUP DATABASE [proptech_db] TO DISK=N'$backupSql' WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=N'$backupSql' WITH CHECKSUM;"
  $files=Rows "SELECT name,type FROM proptech_db.sys.database_files";$moves=@();foreach($file in $files){$folder=if($file.type -eq 1){$paths.Rows[0].log_path}else{$paths.Rows[0].data_path};$suffix=if($file.type -eq 1){'ldf'}else{'mdf'};$dest=Join-Path $folder "$clone-$($file.name).$suffix";$moves+="MOVE N'$($file.name.Replace("'","''"))' TO N'$($dest.Replace("'","''"))'"}
  Run "RESTORE DATABASE [$clone] FROM DISK=N'$backupSql' WITH $($moves -join ','),CHECKSUM;"
  @{database='proptech_db';clone=$clone;backup=$backup;before=$before;applied=$false}|ConvertTo-Json -Depth 12|Set-Content -Encoding utf8 $manifestPath
  Migrate $clone;$after=Audit $clone;Check $before $after
  'Backup verified; clone migration PASS; row counts and private-content fingerprints preserved.'
  "VERIFY_DATABASE=$clone"
 }else{
  if(!(Test-Path $manifestPath)){throw 'Run Prepare first.'};$manifest=Get-Content -Raw $manifestPath|ConvertFrom-Json
  if($manifest.database -ne 'proptech_db' -or $manifest.clone -notmatch '^ancu_identity_verify_\d{14}$'){throw 'Manifest scope guard failed.'}
  if($Mode -eq 'Verify'){Migrate $manifest.clone;Check $manifest.before (Audit $manifest.clone);"VERIFY_DATABASE=$($manifest.clone)";'Idempotent migration and preservation PASS.'}
  else{
   if(Get-NetTCPConnection -State Listen -LocalPort 8080,8082 -ErrorAction SilentlyContinue){throw 'Stop local backend before live migration.'}
   # Lấy backup mới ngay trong maintenance window: không dùng backup từ phiên kiểm thử trước.
   $liveBefore=Audit 'proptech_db';Run 'USE [master]'
   $backupFolder=(Rows "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000)) folder").Rows[0].folder
   $freshBackup=Join-Path $backupFolder ('ancu_before_identity_live_'+(Get-Date -Format yyyyMMddHHmmss)+'.bak')
   $escapedBackup=$freshBackup.Replace("'","''");Run "BACKUP DATABASE [proptech_db] TO DISK=N'$escapedBackup' WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=N'$escapedBackup' WITH CHECKSUM;"
   $manifest|Add-Member -Force -NotePropertyName liveBackup -NotePropertyValue $freshBackup
   $manifest|Add-Member -Force -NotePropertyName liveBefore -NotePropertyValue $liveBefore
   $manifest|ConvertTo-Json -Depth 12|Set-Content -Encoding utf8 $manifestPath
   Migrate 'proptech_db';Check $liveBefore (Audit 'proptech_db')
   $manifest.applied=$true;$manifest|ConvertTo-Json -Depth 12|Set-Content -Encoding utf8 $manifestPath
   'Live identity migration PASS; rows and private fingerprints preserved. Sign in again.'
  }
 }
}finally{$connection.Dispose()}
