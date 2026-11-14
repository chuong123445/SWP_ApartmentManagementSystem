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
 $snapshot=New-Object System.Data.DataSet 'VerifyAdminBefore'
 $tables=@('auth_accounts')
 $keys=@{selection_cancellations='request_id';contract_exit_cases='contract_id'}
 foreach($table in $tables){
  $key=if($keys.ContainsKey($table)){$keys[$table]}else{'id'}
  $command=$connection.CreateCommand();$command.Transaction=$transaction;$command.CommandText="SELECT * FROM dbo.[$table] WITH(TABLOCKX,HOLDLOCK) ORDER BY [$key]";$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($command);[void]$adapter.Fill($snapshot,$table)
 }
 if($Apply -or $Validate){
  $backup=Join-Path (Split-Path (Split-Path $taskRoot -Parent) -Parent) ('tmp/verify-admin-before-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'.xml')
  $snapshot.WriteXml($backup,[System.Data.XmlWriteMode]::WriteSchema)
  $reopened=New-Object System.Data.DataSet;[void]$reopened.ReadXml($backup,[System.Data.XmlReadMode]::ReadSchema)
  if($reopened.GetXml() -ne $snapshot.GetXml()){throw 'Backup roundtrip failed.'}
 }
 $command=$connection.CreateCommand();$command.Transaction=$transaction;$command.CommandTimeout=30
 $command.CommandText=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'verify-admin-account-20261114.sql'))
 if(-not($Apply -or $Validate)){throw 'Specify -Validate (rollback) or -Apply.'}
 $result=New-Object System.Data.DataTable;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($command);[void]$adapter.Fill($result)
 # Compare every column of all rows outside the exact mutation set.
 $filters=@{auth_accounts='id<>9'}
 $deltas=@{}
 $keys=@{selection_cancellations='request_id';contract_exit_cases='contract_id'}
 foreach($table in $tables){
  $key=if($keys.ContainsKey($table)){$keys[$table]}else{'id'}
  $prior=$snapshot.Tables[$table];$maxId=if($prior.Rows.Count){[long]($prior.Rows|Measure-Object -Property $key -Maximum).Maximum}else{0}
  $filter=if($filters.ContainsKey($table)){$filters[$table]}else{'1=1'}
  $before=$prior.Clone();foreach($row in $prior.Select($filter,$key)){$before.ImportRow($row)}
  $read=$connection.CreateCommand();$read.Transaction=$transaction;$read.CommandText="SELECT * FROM dbo.[$table] WHERE [$key]<=@maxId AND $filter ORDER BY [$key]";[void]$read.Parameters.AddWithValue('@maxId',$maxId)
  $after=New-Object System.Data.DataTable $table;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($read);[void]$adapter.Fill($after)
  $a=New-Object System.Data.DataSet;$b=New-Object System.Data.DataSet;$a.Tables.Add($before);$b.Tables.Add($after)
  if($a.GetXml() -ne $b.GetXml()){throw ('Unrelated rows changed: '+$table)}
  $read.CommandText="SELECT COUNT(*) FROM dbo.[$table]";$read.Parameters.Clear();$count=[int]$read.ExecuteScalar()
  $delta=if($deltas.ContainsKey($table)){$deltas[$table]}else{0}
  if($count -ne $prior.Rows.Count+$delta){throw ('Unexpected row count: '+$table)}
 }
 $read=$connection.CreateCommand();$read.Transaction=$transaction;$read.CommandText='SELECT * FROM auth_accounts WHERE id=9'
 $changed=New-Object System.Data.DataTable;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($read);[void]$adapter.Fill($changed)
 $old=$snapshot.Tables['auth_accounts'].Select('id=9')[0];$current=$changed.Rows[0]
 foreach($col in $changed.Columns){$name=$col.ColumnName;if($name -in @('email_verified','contact_verified')){if(-not [bool]$current[$name]){throw 'Verification not recorded'}}elseif($name -eq 'version'){if([long]$current[$name] -ne [long]$old[$name]+1){throw 'Unexpected account version'}}elseif(-not [object]::Equals($old[$name],$current[$name])){throw ('Unrelated Admin field changed: '+$name)}}
 if($Apply){$transaction.Commit();$mode='APPLIED'}else{$transaction.Rollback();$mode=if($Validate){'VALIDATED_ROLLBACK'}else{'PREVIEW'}}
 $transaction=$null
 Write-Output $mode
 foreach($row in $result.Rows){$obj=[ordered]@{};foreach($col in $result.Columns){$v=$row[$col.ColumnName];if($v -is [DBNull]){$v=$null};if($v -is [DateTime]){$v=$v.ToString('yyyy-MM-dd')};$obj[$col.ColumnName]=$v};[pscustomobject]$obj|ConvertTo-Json}
 Write-Output 'PASS: exact row-count deltas; all rows outside scoped mutation set preserved for all accounts; Admin changes limited to verification flags/version.'
 if($Apply){Write-Output ('Backup: '+$backup)}
}finally{if($transaction){$transaction.Rollback()};$connection.Dispose()}
