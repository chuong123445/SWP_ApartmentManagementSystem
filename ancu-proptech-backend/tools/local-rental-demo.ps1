param([switch]$Apply)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSettings=@{}
foreach($taskFile in @('src/main/resources/application.properties','.env.local')) {
    foreach($taskLine in [IO.File]::ReadAllLines((Join-Path $taskRoot $taskFile))) {
        if($taskLine -match '^([^#=]+)=(.*)$') {$taskSettings[$matches[1].Trim()]=$matches[2]}
    }
}
function Resolve-TaskSetting([string]$Value) {
    if($Value -match '^\$\{([^:}]+):([^}]*)\}$') {
        $taskName=$matches[1];$taskFallback=$matches[2]
        $taskEnvironment=[Environment]::GetEnvironmentVariable($taskName)
        if($taskEnvironment){return $taskEnvironment}
        if($taskSettings.ContainsKey($taskName)){return $taskSettings[$taskName]}
        return $taskFallback
    }
    return $Value
}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433'
$taskBuilder['Initial Catalog']='proptech_db'
$taskBuilder['User ID']=Resolve-TaskSetting $taskSettings['spring.datasource.username']
$taskBuilder['Password']=Resolve-TaskSetting $taskSettings['spring.datasource.password']
$taskBuilder['Encrypt']=$true
$taskBuilder['TrustServerCertificate']=$true
$taskBuilder['Connect Timeout']=5
$taskConnection=New-Object System.Data.SqlClient.SqlConnection $taskBuilder.ConnectionString
$taskTransaction=$null
$taskTables=@('rental_apartments','rental_contracts','rental_requests','contract_drafts',
    'rental_invoices','invoice_payments','invoice_events','invoice_notifications','cash_entries',
    'sepay_events','sepay_test_payments','billing_meter_readings','contract_renewal_requests',
    'contract_expiry_notices','contract_exit_evidence','contract_exit_events','contract_exit_cases',
    'contract_handovers','selection_cancellation_events','selection_cancellations','escrow_deposits','owner_withdrawals') | Sort-Object
$taskBackup=New-Object System.Data.DataSet 'LocalRentalDemoBackup'
try {
    $taskConnection.Open()
    $taskTransaction=$taskConnection.BeginTransaction([System.Data.IsolationLevel]::Serializable)
    # Lock and capture all affected tables before mutation, including binary signatures and evidence.
    foreach($taskTable in $taskTables) {
        $taskCommand=$taskConnection.CreateCommand()
        $taskCommand.Transaction=$taskTransaction
        $taskCommand.CommandTimeout=30
        $taskCommand.CommandText="SELECT * FROM dbo.[$taskTable] WITH(TABLOCKX,HOLDLOCK)"
        $taskAdapter=New-Object System.Data.SqlClient.SqlDataAdapter $taskCommand
        [void]$taskAdapter.Fill($taskBackup,$taskTable)
        $taskAdapter.Dispose();$taskCommand.Dispose()
    }
    # Detect fresh inventory/requests since the inspected local audit instead of deleting new work.
    $taskCommand=$taskConnection.CreateCommand();$taskCommand.Transaction=$taskTransaction
    $taskCommand.CommandText=@'
IF EXISTS(SELECT 1 FROM dbo.rental_apartments WHERE id>23)
 OR EXISTS(SELECT 1 FROM dbo.rental_requests WHERE id>52)
 THROW 51000,'New inventory or requests since audit. Audit again.',1;
'@
    [void]$taskCommand.ExecuteNonQuery();$taskCommand.Dispose()
    $taskOutputRoot=Join-Path (Split-Path (Split-Path $taskRoot -Parent) -Parent) 'tmp'
    [void][IO.Directory]::CreateDirectory($taskOutputRoot)
    if($Apply) {
        $taskBackupPath=Join-Path $taskOutputRoot ('local-rental-demo-backup-'+[DateTime]::Now.ToString('yyyyMMdd-HHmmss-fff')+'.xml')
        $taskBackup.WriteXml($taskBackupPath,[System.Data.XmlWriteMode]::WriteSchema)
        $taskReopened=New-Object System.Data.DataSet
        [void]$taskReopened.ReadXml($taskBackupPath,[System.Data.XmlReadMode]::ReadSchema)
        foreach($taskTable in $taskTables) {
            if($taskReopened.Tables[$taskTable].Rows.Count -ne $taskBackup.Tables[$taskTable].Rows.Count) {
                throw "Backup row count mismatch in $taskTable"
            }
        }
        if($taskReopened.GetXml() -cne $taskBackup.GetXml()){throw "Backup content mismatch"}
        Write-Output "Backup saved and reopened: $taskBackupPath"
    }
    $taskCommand=$taskConnection.CreateCommand();$taskCommand.Transaction=$taskTransaction
    $taskCommand.CommandTimeout=60
    $taskCommand.CommandText=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'local-rental-demo.sql'))
    $taskAdapter=New-Object System.Data.SqlClient.SqlDataAdapter $taskCommand
    $taskResult=New-Object System.Data.DataSet
    [void]$taskAdapter.Fill($taskResult)
    $taskAdapter.Dispose();$taskCommand.Dispose()
    $taskResultPath=Join-Path $taskOutputRoot 'local-rental-demo-result.xml'
    $taskResult.WriteXml($taskResultPath,[System.Data.XmlWriteMode]::WriteSchema)
    if($Apply){$taskTransaction.Commit();Write-Output 'APPLIED'}
    else{$taskTransaction.Rollback();Write-Output 'VALIDATED AND ROLLED BACK. Use -Apply to persist.'}
    $taskTransaction=$null
    $taskResult.Tables[0] | Format-Table -AutoSize
    Write-Output "Result saved: $taskResultPath"
} catch {
    if($taskTransaction){try{$taskTransaction.Rollback()}catch{}}
    throw
} finally {$taskConnection.Dispose()}
