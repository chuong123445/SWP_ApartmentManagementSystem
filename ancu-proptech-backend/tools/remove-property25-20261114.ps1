param([switch]$Apply,[switch]$Validate)
$ErrorActionPreference='Stop'
if($Apply -and $Validate){throw 'Use Apply or Validate, not both.'}
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSettings=@{}
foreach($file in @('src/main/resources/application.properties','.env.local')){
 $path=Join-Path $taskRoot $file
 if(Test-Path -LiteralPath $path){foreach($line in [IO.File]::ReadAllLines($path)){if($line -match '^([^#=]+)=(.*)$'){$taskSettings[$matches[1].Trim()]=$matches[2]}}}
}
function Resolve-TaskSetting([string]$value){if($value -match '^\$\{([^:}]+):([^}]*)\}$'){if([Environment]::GetEnvironmentVariable($matches[1])){return [Environment]::GetEnvironmentVariable($matches[1])};if($taskSettings.ContainsKey($matches[1])){return $taskSettings[$matches[1]]};return $matches[2]};return $value}
$builder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$builder['Data Source']='localhost,1433';$builder['Initial Catalog']='proptech_db';$builder['User ID']=Resolve-TaskSetting $taskSettings['spring.datasource.username'];$builder['Password']=Resolve-TaskSetting $taskSettings['spring.datasource.password'];$builder['TrustServerCertificate']=$true;$builder['Connect Timeout']=8
$connection=New-Object System.Data.SqlClient.SqlConnection($builder.ConnectionString)
$transaction=$null
try{
 $connection.Open();$transaction=$connection.BeginTransaction([System.Data.IsolationLevel]::Serializable)
 $snapshot=New-Object System.Data.DataSet 'RemoveProperty25Before'
 $tables=@('rental_apartments','rental_requests','rental_contracts','contract_drafts','auth_accounts','contract_renewal_requests','contract_expiry_notices','rental_invoices','invoice_payments','sepay_events','settlement_entries','cash_entries','billing_meter_readings','escrow_deposits','sepay_test_payments','contract_handovers','contract_exit_cases','contract_exit_events','contract_exit_evidence','selection_cancellations','selection_cancellation_events','rental_conversations','rental_messages','invoice_events','invoice_notifications','rental_properties','property_listing_drafts','property_evidence_files','property_evidence_content','property_document_checks','ai_assistance_runs','property_dossiers','property_dossier_files','property_dossier_ai_reviews','property_images','rental_apartment_amenities')
 $keys=@{selection_cancellations='request_id';contract_exit_cases='contract_id';property_listing_drafts='property_id';property_document_checks='file_id';property_dossier_files='file_id';rental_apartment_amenities='apartment_id'}
 foreach($table in $tables){
  $key=if($keys.ContainsKey($table)){$keys[$table]}else{'id'}
  $command=$connection.CreateCommand();$command.Transaction=$transaction;$command.CommandText="SELECT * FROM dbo.[$table] WITH(TABLOCKX,HOLDLOCK) ORDER BY [$key]";$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($command);[void]$adapter.Fill($snapshot,$table)
 }
 if($Apply -or $Validate){
  $backup=Join-Path (Split-Path (Split-Path $taskRoot -Parent) -Parent) ('tmp/remove-property25-before-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'.xml')
  $snapshot.WriteXml($backup,[System.Data.XmlWriteMode]::WriteSchema)
  $reopened=New-Object System.Data.DataSet;[void]$reopened.ReadXml($backup,[System.Data.XmlReadMode]::ReadSchema)
  if($reopened.GetXml() -ne $snapshot.GetXml()){throw 'Backup roundtrip failed.'}
 }
 $command=$connection.CreateCommand();$command.Transaction=$transaction;$command.CommandTimeout=30
 $command.CommandText=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'remove-property25-20261114.sql'))
 if(-not($Apply -or $Validate)){throw 'Specify -Validate (rollback) or -Apply.'}
 $result=New-Object System.Data.DataTable;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($command);[void]$adapter.Fill($result)
 # Compare every column of all rows outside the exact mutation set.
 $fileIds=@($snapshot.Tables['property_evidence_files'].Select('property_id=25')|ForEach-Object{[long]$_.id}) -join ','
 $dossierIds=@($snapshot.Tables['property_dossiers'].Select('property_id=25')|ForEach-Object{[long]$_.id}) -join ','
 $affected=@{rental_properties='id=25';rental_apartments='id=31';rental_apartment_amenities='apartment_id=31';property_dossiers='property_id=25';property_dossier_files="dossier_id IN ($dossierIds)";property_dossier_ai_reviews="dossier_id IN ($dossierIds)";property_images='property_id=25';property_listing_drafts='property_id=25';property_evidence_files='property_id=25';property_evidence_content="id IN ($fileIds)";property_document_checks='property_id=25';ai_assistance_runs='property_id=25'}
 $filters=@{};$deltas=@{}
 foreach($table in $affected.Keys){$remove=$affected[$table];$filters[$table]=if($remove -eq 'property_id=25'){'property_id IS NULL OR property_id<>25'}else{"NOT ($remove)"};$deltas[$table]=-$snapshot.Tables[$table].Select($remove).Count}
 $keys=@{selection_cancellations='request_id';contract_exit_cases='contract_id';property_listing_drafts='property_id';property_document_checks='file_id';property_dossier_files='file_id';rental_apartment_amenities='apartment_id'}
 foreach($table in $tables){
  $key=if($keys.ContainsKey($table)){$keys[$table]}else{'id'}
  $prior=$snapshot.Tables[$table]
  $filter=if($filters.ContainsKey($table)){$filters[$table]}else{'1=1'}
  $before=$prior.Clone();foreach($row in $prior.Select($filter,$key)){$before.ImportRow($row)}
  $read=$connection.CreateCommand();$read.Transaction=$transaction;$read.CommandText="SELECT * FROM dbo.[$table] WHERE $filter ORDER BY [$key]"
  $after=New-Object System.Data.DataTable $table;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($read);[void]$adapter.Fill($after)
  $a=New-Object System.Data.DataSet;$b=New-Object System.Data.DataSet;$a.Tables.Add($before);$b.Tables.Add($after)
  if($a.GetXml() -ne $b.GetXml()){throw ('Unrelated rows changed: '+$table)}
  $read.CommandText="SELECT COUNT(*) FROM dbo.[$table]";$read.Parameters.Clear();$count=[int]$read.ExecuteScalar()
  $delta=if($deltas.ContainsKey($table)){$deltas[$table]}else{0}
  if($count -ne $prior.Rows.Count+$delta){throw ('Unexpected row count: '+$table)}
 }
 if($Apply){$transaction.Commit();$mode='APPLIED'}else{$transaction.Rollback();$mode=if($Validate){'VALIDATED_ROLLBACK'}else{'PREVIEW'}}
 $transaction=$null
 Write-Output $mode
 foreach($row in $result.Rows){$obj=[ordered]@{};foreach($col in $result.Columns){$v=$row[$col.ColumnName];if($v -is [DBNull]){$v=$null};if($v -is [DateTime]){$v=$v.ToString('yyyy-MM-dd')};$obj[$col.ColumnName]=$v};[pscustomobject]$obj|ConvertTo-Json}
 Write-Output 'PASS: exact row-count deltas; all rows outside scoped mutation set preserved across 36 tables.'
 if($Apply){Write-Output ('Backup: '+$backup)}
}finally{if($transaction){$transaction.Rollback()};$connection.Dispose()}
