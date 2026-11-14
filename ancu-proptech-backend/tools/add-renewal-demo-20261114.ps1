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
 $snapshot=New-Object System.Data.DataSet 'RenewalDemoBefore'
 $tables=@('rental_apartments','rental_requests','rental_contracts','contract_drafts','auth_accounts','contract_renewal_requests')
 foreach($table in $tables){
  $command=$connection.CreateCommand();$command.Transaction=$transaction;$command.CommandText="SELECT * FROM dbo.[$table] WITH(TABLOCKX,HOLDLOCK) ORDER BY id";$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($command);[void]$adapter.Fill($snapshot,$table)
 }
 if($Apply){
  $backup=Join-Path (Split-Path (Split-Path $taskRoot -Parent) -Parent) ('tmp/renewal-demo-before-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'.xml')
  $snapshot.WriteXml($backup,[System.Data.XmlWriteMode]::WriteSchema)
  $reopened=New-Object System.Data.DataSet;[void]$reopened.ReadXml($backup,[System.Data.XmlReadMode]::ReadSchema)
  if($reopened.GetXml() -ne $snapshot.GetXml()){throw 'Backup roundtrip failed.'}
 }
 $command=$connection.CreateCommand();$command.Transaction=$transaction;$command.CommandTimeout=30
 $command.CommandText=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'add-renewal-demo-20261114.sql'))
 [void]$command.Parameters.Add('@Apply',[System.Data.SqlDbType]::Bit);$command.Parameters['@Apply'].Value=($Apply -or $Validate)
 $result=New-Object System.Data.DataTable;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($command);[void]$adapter.Fill($result)
 # Every column of every pre-existing row must remain identical, including signed bytes.
 foreach($table in $tables){
  $prior=$snapshot.Tables[$table];if($prior.Rows.Count -eq 0){continue}
  $maxId=($prior.Rows|Measure-Object -Property id -Maximum).Maximum
  $read=$connection.CreateCommand();$read.Transaction=$transaction;$read.CommandText="SELECT * FROM dbo.[$table] WHERE id<=@maxId ORDER BY id";[void]$read.Parameters.AddWithValue('@maxId',[long]$maxId)
  $after=New-Object System.Data.DataTable $table;$adapter=New-Object System.Data.SqlClient.SqlDataAdapter($read);[void]$adapter.Fill($after)
  $a=New-Object System.Data.DataSet;$b=New-Object System.Data.DataSet;$a.Tables.Add($prior.Copy());$b.Tables.Add($after)
  if($a.GetXml() -ne $b.GetXml()){throw ('Pre-existing rows changed: '+$table)}
 }
 if($Apply){$transaction.Commit();$mode='APPLIED'}else{$transaction.Rollback();$mode=if($Validate){'VALIDATED_ROLLBACK'}else{'PREVIEW'}}
 $transaction=$null
 Write-Output $mode
 foreach($row in $result.Rows){$obj=[ordered]@{};foreach($col in $result.Columns){$v=$row[$col.ColumnName];if($v -is [DBNull]){$v=$null};if($v -is [DateTime]){$v=$v.ToString('yyyy-MM-dd')};$obj[$col.ColumnName]=$v};[pscustomobject]$obj|ConvertTo-Json}
 Write-Output 'PASS: all pre-existing rows preserved.'
 if($Apply){Write-Output ('Backup: '+$backup)}
}finally{if($transaction){$transaction.Rollback()};$connection.Dispose()}
