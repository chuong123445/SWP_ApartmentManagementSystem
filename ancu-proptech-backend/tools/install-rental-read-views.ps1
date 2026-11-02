param(
    [Parameter(Mandatory)][ValidatePattern('^[A-Za-z0-9_]{1,128}$')][string]$Database,
    [string]$Server='localhost,1433',
    [switch]$Apply
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSettings=@{}
foreach($taskFile in @('src/main/resources/application.properties','.env.local')) {
    $taskPath=Join-Path $taskRoot $taskFile
    if(Test-Path -LiteralPath $taskPath){
        foreach($taskLine in [IO.File]::ReadAllLines($taskPath)){
            if($taskLine -match '^\s*([^#=]+)=(.*)$'){$taskSettings[$matches[1].Trim()]=$matches[2].Trim()}
        }
    }
}
$taskUser=$env:SPRING_DATASOURCE_USERNAME
$taskPassword=$env:SPRING_DATASOURCE_PASSWORD
if(!$taskUser){$taskUser=$taskSettings['SPRING_DATASOURCE_USERNAME'];if(!$taskUser){$taskUser=$taskSettings['spring.datasource.username']}}
if(!$taskPassword){$taskPassword=$taskSettings['SPRING_DATASOURCE_PASSWORD'];if(!$taskPassword){$taskPassword=$taskSettings['spring.datasource.password']}}
if(!$taskUser -or !$taskPassword){throw 'Supply SPRING_DATASOURCE_USERNAME/PASSWORD or local datasource settings. No credentials are printed.'}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']=$Server;$taskBuilder['Initial Catalog']=$Database
$taskBuilder['User ID']=$taskUser;$taskBuilder['Password']=$taskPassword
$taskBuilder['Encrypt']=$true;$taskBuilder['TrustServerCertificate']=$true
$taskConnection=New-Object System.Data.SqlClient.SqlConnection $taskBuilder.ConnectionString
$taskTransaction=$null
try {
    $taskConnection.Open()
    $taskCheck=$taskConnection.CreateCommand()
    $taskCheck.CommandText="SELECT CASE WHEN OBJECT_ID('dbo.contract_renewal_requests','U') IS NOT NULL AND OBJECT_ID('dbo.contract_handovers','U') IS NOT NULL AND OBJECT_ID('dbo.invoice_payments','U') IS NOT NULL AND COL_LENGTH('dbo.contract_drafts','snapshot_json') IS NOT NULL THEN 1 ELSE 0 END"
    if([int]$taskCheck.ExecuteScalar() -ne 1){throw 'Schema prerequisites missing: upgrade this database through V42 first. No data was initialized or reset.'}
    $taskFiles=@('V43__contract_activation_time.sql','V44__rental_read_views.sql')
    if(!$Apply){
        [pscustomobject]@{database=$Database;mode='PREVIEW';files=$taskFiles;message='No schema or data changed. Pass -Apply after reviewing these migrations.'} | ConvertTo-Json -Depth 3
        return
    }
    $taskTransaction=$taskConnection.BeginTransaction()
    foreach($taskFile in $taskFiles){
        $taskSql=[IO.File]::ReadAllText((Join-Path $taskRoot "src/main/resources/db/migration/$taskFile"))
        foreach($taskBatch in [regex]::Split($taskSql,'(?im)^\s*GO\s*\r?$')){
            if(!$taskBatch.Trim()){continue}
            $taskCommand=$taskConnection.CreateCommand();$taskCommand.Transaction=$taskTransaction
            $taskCommand.CommandTimeout=60;$taskCommand.CommandText=$taskBatch
            [void]$taskCommand.ExecuteNonQuery()
        }
    }
    $taskVerify=$taskConnection.CreateCommand();$taskVerify.Transaction=$taskTransaction
    $taskVerify.CommandText="SELECT COUNT(*) FROM sys.views WHERE schema_id=SCHEMA_ID('dbo') AND name IN('vw_customer_tenancy_history','vw_apartment_rental_overview','vw_invoice_payment_status','vw_owner_request_inbox','vw_account_tenancy_summary')"
    if([int]$taskVerify.ExecuteScalar() -ne 5){throw 'View verification failed; installation will be rolled back.'}
    $taskTransaction.Commit();$taskTransaction=$null
    [pscustomobject]@{database=$Database;mode='APPLIED';views=5;historicalActivationBackfill=$false;rowsDeleted=0} | ConvertTo-Json
} catch {
    if($taskTransaction){$taskTransaction.Rollback()}
    throw
} finally {
    $taskConnection.Dispose();$taskSettings.Clear();$taskPassword=$null
}
