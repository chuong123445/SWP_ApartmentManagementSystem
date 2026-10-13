param(
    [Parameter(Mandatory)][ValidateSet('prepare','prepare-admin','prepare-legacy','cleanup')][string]$Mode,
    [Parameter(Mandatory)][Guid]$TestKey,
    [Parameter(Mandatory)][Guid]$OwnerId,
    [Guid]$AdminId = [Guid]::Empty
)
$ErrorActionPreference = 'Stop'
# Only newly registered, uniquely named test accounts in the local development DB.
# No OTP override endpoint; prepare is test provisioning, not evidence of Gmail delivery.
$taskBackendRoot = Split-Path $PSScriptRoot -Parent
$taskSettings = @{}
foreach ($taskConfig in @('src/main/resources/application.properties','.env.local')) {
    $taskPath = Join-Path $taskBackendRoot $taskConfig
    if (!(Test-Path -LiteralPath $taskPath)) { continue }
    foreach ($taskLine in [IO.File]::ReadAllLines($taskPath)) {
        if ($taskLine.TrimStart().StartsWith('#') -or !$taskLine.Contains('=')) { continue }
        $taskPair = $taskLine.Split('=',2)
        $taskSettings[$taskPair[0].Trim()] = $taskPair[1]
    }
}
$taskBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source'] = 'localhost,1433'
$taskBuilder['Initial Catalog'] = 'proptech_db'
$taskBuilder['User ID'] = $taskSettings['spring.datasource.username']
$taskBuilder['Password'] = $taskSettings['spring.datasource.password']
$taskBuilder['Encrypt'] = $true
$taskBuilder['TrustServerCertificate'] = $true
$taskConnection = New-Object System.Data.SqlClient.SqlConnection $taskBuilder.ConnectionString
try {
    $taskConnection.Open()
    $taskCommand = $taskConnection.CreateCommand()
    $taskCommand.CommandTimeout = 20
    [void]$taskCommand.Parameters.AddWithValue('@owner',$OwnerId)
    [void]$taskCommand.Parameters.AddWithValue('@admin',$AdminId)
    [void]$taskCommand.Parameters.AddWithValue('@adminEmail',"property-admin-e2e-$TestKey@example.invalid")
    [void]$taskCommand.Parameters.AddWithValue('@email',"property-e2e-$TestKey@example.invalid")
    [void]$taskCommand.Parameters.AddWithValue('@name',"Property E2E $TestKey")
    [void]$taskCommand.Parameters.AddWithValue('@single',"Property E2E $TestKey single")
    [void]$taskCommand.Parameters.AddWithValue('@multi',"Property E2E $TestKey multi")
    $taskGuard = @'
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' THROW 51000, 'Fixture restricted to local proptech_db.', 1;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM auth_accounts WHERE id=@owner AND (email<>@email OR role<>'OWNER' OR full_name<>@name))
 THROW 51000, 'Account fixture guard failed.', 1;
IF EXISTS(SELECT 1 FROM auth_accounts WHERE id=@admin AND (email<>@adminEmail OR role<>'ADMIN' OR full_name<>@name))
 THROW 51000, 'Admin fixture guard failed.', 1;
IF EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@owner AND name NOT IN(@single,@multi))
 THROW 51000, 'Property fixture guard failed.', 1;
'@
    if ($Mode -eq 'prepare') {
        $taskCommand.CommandText = $taskGuard + @'

IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=@owner AND email=@email AND status='PENDING_VERIFICATION')
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@owner)
 THROW 51000, 'Expected fresh pending Owner with no properties.', 1;
UPDATE auth_accounts SET status='ACTIVE',email_verified=1,contact_verified=1,version=version+1 WHERE id=@owner;
COMMIT;
'@
        [void]$taskCommand.ExecuteNonQuery()
        Write-Output '{"prepared":true}'
    } elseif ($Mode -eq 'prepare-legacy') {
        $taskCommand.CommandText = $taskGuard + @'

IF NOT EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@owner AND name=@multi AND rental_mode='MULTI_UNIT' AND approval_status='DRAFT')
 OR EXISTS(SELECT 1 FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE p.owner_id=@owner AND p.name=@multi)
 THROW 51000, 'Expected exact fresh multi property without dossier.', 1;
UPDATE rental_properties SET approval_status='PENDING_APPROVAL',version=version+1 WHERE owner_id=@owner AND name=@multi;
COMMIT;
'@
        [void]$taskCommand.ExecuteNonQuery()
        Write-Output '{"prepared":true}'
    } elseif ($Mode -eq 'prepare-admin') {
        $taskCommand.CommandText = $taskGuard + @'

IF @admin='00000000-0000-0000-0000-000000000000' OR EXISTS(SELECT 1 FROM auth_accounts WHERE id=@admin OR email=@adminEmail)
 OR NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=@owner AND email=@email AND full_name=@name AND status='ACTIVE')
 THROW 51000, 'Expected unique Admin fixture and exact test Owner.', 1;
INSERT INTO auth_accounts(id,email,full_name,password_hash,role,status,contact_verified,email_verified,phone_verified,version)
 SELECT @admin,@adminEmail,@name,password_hash,'ADMIN','ACTIVE',0,0,0,0 FROM auth_accounts WHERE id=@owner AND email=@email;
COMMIT;
'@
        [void]$taskCommand.ExecuteNonQuery()
        Write-Output '{"prepared":true}'
    } else {
        $taskCommand.CommandText = $taskGuard + @'

IF EXISTS(SELECT 1 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@owner OR r.customer_id=@owner)
 OR EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@owner OR c.customer_id=@owner)
 OR EXISTS(SELECT 1 FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@owner AND (a.availability<>'VACANT' OR a.room_number NOT IN('E2E.1','E2E.2','E2E.3')))
 OR EXISTS(SELECT 1 FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE (p.owner_id=@owner AND d.reviewer_id IS NOT NULL AND d.reviewer_id<>@admin) OR (d.reviewer_id=@admin AND p.owner_id<>@owner))
 OR EXISTS(SELECT 1 FROM property_evidence_files f JOIN rental_properties p ON p.id=f.property_id WHERE p.owner_id=@owner AND f.uploader_id<>@owner)
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@admin)
 THROW 51000, 'Fixture gained unrelated data; cleanup stopped.', 1;
DELETE FROM property_dossier_files WHERE dossier_id IN(SELECT d.id FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE p.owner_id=@owner);
DELETE FROM property_dossiers WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@owner);
DELETE FROM property_evidence_content WHERE id IN(SELECT f.id FROM property_evidence_files f JOIN rental_properties p ON p.id=f.property_id WHERE p.owner_id=@owner);
DELETE FROM property_evidence_files WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@owner);
DELETE FROM rental_apartment_amenities WHERE apartment_id IN(SELECT a.id FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@owner);
DELETE FROM rental_apartments WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@owner AND name IN(@single,@multi));
DELETE FROM rental_properties WHERE owner_id=@owner AND name IN(@single,@multi);
DELETE FROM email_change_challenges WHERE account_id IN(@owner,@admin);
DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id IN(@owner,@admin));
DELETE FROM auth_sessions WHERE account_id IN(@owner,@admin);
DELETE FROM auth_accounts WHERE id=@owner AND email=@email AND full_name=@name;
DELETE FROM auth_accounts WHERE id=@admin AND email=@adminEmail AND full_name=@name;
SELECT (SELECT COUNT(*) FROM auth_accounts WHERE id IN(@owner,@admin)) AS accountsRemaining,
 (SELECT COUNT(*) FROM rental_properties WHERE owner_id=@owner) AS propertiesRemaining;
COMMIT;
'@
        $taskTable = New-Object System.Data.DataTable
        $taskAdapter = New-Object System.Data.SqlClient.SqlDataAdapter $taskCommand
        [void]$taskAdapter.Fill($taskTable)
        $taskTable.Rows[0] | Select-Object accountsRemaining,propertiesRemaining | ConvertTo-Json -Compress
    }
} finally { $taskConnection.Dispose() }
