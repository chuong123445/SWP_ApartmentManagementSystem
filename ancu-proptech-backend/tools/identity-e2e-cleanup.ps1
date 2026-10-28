param([Parameter(Mandatory)][Guid]$TestKey,[Parameter(Mandatory)][long]$AccountId)
$ErrorActionPreference='Stop'
# Only remove a newly registered, uniquely named identity-test account. Never demo users.
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSettings=@{}
foreach($taskFile in @('src/main/resources/application.properties','.env.local')) {
    foreach($taskLine in [IO.File]::ReadAllLines((Join-Path $taskRoot $taskFile))) {
        if(!$taskLine.TrimStart().StartsWith('#') -and $taskLine.Contains('=')) {$taskPair=$taskLine.Split('=',2);$taskSettings[$taskPair[0].Trim()]=$taskPair[1]}
    }
}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433';$taskBuilder['Initial Catalog']='proptech_db'
$taskBuilder['User ID']=$taskSettings['spring.datasource.username'];$taskBuilder['Password']=$taskSettings['spring.datasource.password']
$taskBuilder['Encrypt']=$true;$taskBuilder['TrustServerCertificate']=$true
$taskConnection=New-Object System.Data.SqlClient.SqlConnection $taskBuilder.ConnectionString
try {
    $taskConnection.Open();$taskCommand=$taskConnection.CreateCommand();$taskCommand.CommandTimeout=20
    [void]$taskCommand.Parameters.AddWithValue('@id',$AccountId)
    [void]$taskCommand.Parameters.AddWithValue('@email',"identity-e2e-$TestKey@example.invalid")
    [void]$taskCommand.Parameters.AddWithValue('@name',"Identity E2E $TestKey")
    $taskCommand.CommandText=@'
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' THROW 51000,'Only local test database allowed.',1;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM auth_accounts WHERE id=@id AND
 (email<>@email OR full_name<>@name OR role<>'CUSTOMER' OR status<>'PENDING_VERIFICATION' OR email_verified<>0 OR phone_verified<>0))
 THROW 51000,'Identity test account guard failed.',1;
IF EXISTS(SELECT 1 FROM rental_requests WHERE customer_id=@id)
 OR EXISTS(SELECT 1 FROM rental_contracts WHERE customer_id=@id)
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@id)
 THROW 51000,'Unrelated business data detected; cleanup stopped.',1;
DELETE FROM account_identity_documents WHERE account_id=@id;
DELETE FROM account_identity_profiles WHERE account_id=@id;
DELETE FROM email_change_challenges WHERE account_id=@id;
DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id=@id);
DELETE FROM auth_sessions WHERE account_id=@id;
DELETE FROM auth_accounts WHERE id=@id AND email=@email AND full_name=@name;
SELECT (SELECT COUNT(*) FROM auth_accounts WHERE id=@id) AS accountsRemaining,
 (SELECT COUNT(*) FROM account_identity_profiles WHERE account_id=@id) AS profilesRemaining,
 (SELECT COUNT(*) FROM account_identity_documents WHERE account_id=@id) AS documentsRemaining;
COMMIT;
'@
    $taskReader=$taskCommand.ExecuteReader();[void]$taskReader.Read()
    $taskResult=@{accountsRemaining=$taskReader.GetInt32(0);profilesRemaining=$taskReader.GetInt32(1);documentsRemaining=$taskReader.GetInt32(2)}
    while($taskReader.NextResult()){};$taskReader.Dispose();$taskResult|ConvertTo-Json -Compress
} finally {$taskConnection.Dispose()}
