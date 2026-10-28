param(
    [Parameter(Mandatory)][ValidateSet('prepare','cleanup')][string]$Mode,
    [Parameter(Mandatory)][Guid]$TestKey,
    [Parameter(Mandatory)][Guid]$OwnerId,
    [Parameter(Mandatory)][Guid]$CustomerId,
    [Parameter(Mandatory)][Guid]$PropertyId,
    [switch]$AllowContractDrafts,
    [switch]$IncludeLegalProfiles
)
$ErrorActionPreference = 'Stop'
# Local-only fixtures created by the public register API; never reset demo data.
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
    [void]$taskCommand.Parameters.AddWithValue('@customer',$CustomerId)
    [void]$taskCommand.Parameters.AddWithValue('@property',$PropertyId)
    [void]$taskCommand.Parameters.AddWithValue('@allowDrafts',[bool]$AllowContractDrafts)
    [void]$taskCommand.Parameters.AddWithValue('@legalProfiles',[bool]$IncludeLegalProfiles)
    [void]$taskCommand.Parameters.AddWithValue('@ownerEmail',"rental-e2e-$TestKey-owner@example.invalid")
    [void]$taskCommand.Parameters.AddWithValue('@customerEmail',"rental-e2e-$TestKey-customer@example.invalid")
    [void]$taskCommand.Parameters.AddWithValue('@name',"Rental E2E $TestKey")
    $taskGuard = @'
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' THROW 51000, 'Fixture restricted to local proptech_db.', 1;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM auth_accounts WHERE id=@owner AND (email<>@ownerEmail OR role<>'OWNER' OR full_name<>@name))
 OR EXISTS(SELECT 1 FROM auth_accounts WHERE id=@customer AND (email<>@customerEmail OR role<>'CUSTOMER' OR full_name<>@name))
 THROW 51000, 'Account fixture guard failed.', 1;
IF EXISTS(SELECT 1 FROM rental_properties WHERE id=@property AND (owner_id<>@owner OR name<>@name))
 THROW 51000, 'Property fixture guard failed.', 1;
'@
    if ($Mode -eq 'prepare') {
        $taskCommand.CommandText = $taskGuard + @'

IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=@owner AND status='PENDING_VERIFICATION')
 OR NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=@customer AND status='PENDING_VERIFICATION')
 THROW 51000, 'Expected newly registered pending accounts.', 1;
IF EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@owner)
 OR EXISTS(SELECT 1 FROM rental_requests WHERE customer_id=@customer)
 THROW 51000, 'Fixture is not fresh.', 1;
UPDATE auth_accounts SET status='ACTIVE',email_verified=1,contact_verified=1,version=version+1
 WHERE id IN(@owner,@customer);
IF @allowDrafts=1 UPDATE auth_accounts SET phone='0912345678',address=N'Địa chỉ hồ sơ thử riêng',date_of_birth='1995-06-15'
 WHERE id IN(@owner,@customer);
INSERT INTO rental_properties(id,owner_id,name,address,city,district,approval_status,version)
 VALUES(@property,@owner,@name,@name,'E2E city','E2E district','APPROVED',0);
IF @legalProfiles=1
BEGIN
 INSERT INTO account_identity_profiles(account_id,legal_name,document_number,date_of_birth,issue_date,issue_place,permanent_address,current_address,verification_status,updated_at,version,local_fixture)
 SELECT id,full_name,CASE WHEN id=@owner THEN '999000000101' ELSE '999000000102' END,'1995-06-15','2022-05-01',N'Cơ quan căn cước mẫu',N'Địa chỉ giấy tờ mẫu',address,'NOT_VERIFIED',SYSUTCDATETIME(),0,1 FROM auth_accounts WHERE id IN(@owner,@customer);
 INSERT INTO property_dossiers(id,property_id,right_type,applicant_name,bank,account_number,account_holder_name,status,submitted_at,version,certificate_number,certificate_issue_date,certificate_issue_place,exploitation_right_description,local_fixture)
 VALUES(NEWID(),@property,'OWNERSHIP',@name,N'Ngân hàng mẫu','00000001',@name,'APPROVED',SYSUTCDATETIME(),0,'MAU-E2E-001','2020-01-15',N'Cơ quan giấy chứng nhận mẫu',N'Quyền cho thuê minh họa',1);
END;
COMMIT;
'@
        [void]$taskCommand.ExecuteNonQuery()
        Write-Output '{"prepared":true}'
    } else {
        $taskCommand.CommandText = $taskGuard + @'

IF EXISTS(SELECT 1 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id
 WHERE (a.property_id=@property AND r.customer_id<>@customer) OR (r.customer_id=@customer AND a.property_id<>@property))
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@owner AND id<>@property)
 OR EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id WHERE (a.property_id=@property OR c.customer_id IN(@owner,@customer))
  AND (@allowDrafts=0 OR a.property_id<>@property OR c.customer_id<>@customer OR c.status<>'DRAFT' OR c.local_fixture<>0
   OR c.electricity_baseline IS NOT NULL OR c.water_baseline IS NOT NULL
   OR EXISTS(SELECT 1 FROM rental_invoices i WHERE i.contract_id=c.id)
   OR NOT EXISTS(SELECT 1 FROM contract_drafts d JOIN rental_requests r ON r.id=d.rental_request_id WHERE d.contract_id=c.id AND r.apartment_id=c.apartment_id AND r.customer_id=@customer AND r.status='ACCEPTED')))
 THROW 51000, 'Fixture gained unrelated business data; cleanup stopped.', 1;
IF @allowDrafts=1
BEGIN
 DELETE d FROM contract_drafts d JOIN rental_contracts c ON c.id=d.contract_id JOIN rental_apartments a ON a.id=c.apartment_id WHERE a.property_id=@property AND c.customer_id=@customer AND c.status='DRAFT';
 DELETE c FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id WHERE a.property_id=@property AND c.customer_id=@customer AND c.status='DRAFT';
END;
DELETE FROM rental_requests WHERE customer_id=@customer AND apartment_id IN(SELECT id FROM rental_apartments WHERE property_id=@property);
IF @legalProfiles=1
BEGIN
 IF EXISTS(SELECT 1 FROM property_dossiers WHERE property_id=@property AND (local_fixture<>1 OR reviewer_id IS NOT NULL))
  OR EXISTS(SELECT 1 FROM account_identity_profiles WHERE account_id IN(@owner,@customer) AND local_fixture<>1)
  THROW 51000,'Legal test fixture guard failed.',1;
 DELETE FROM property_dossiers WHERE property_id=@property AND local_fixture=1;
 DELETE FROM account_identity_documents WHERE account_id IN(@owner,@customer);
 DELETE FROM account_identity_profiles WHERE account_id IN(@owner,@customer) AND local_fixture=1;
END;
DELETE FROM rental_apartment_amenities WHERE apartment_id IN(SELECT id FROM rental_apartments WHERE property_id=@property);
DELETE FROM rental_apartments WHERE property_id=@property;
DELETE FROM rental_properties WHERE id=@property AND owner_id=@owner;
DELETE FROM email_change_challenges WHERE account_id IN(@owner,@customer);
DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id IN(@owner,@customer));
DELETE FROM auth_sessions WHERE account_id IN(@owner,@customer);
DELETE FROM auth_accounts WHERE id IN(@owner,@customer);
SELECT (SELECT COUNT(*) FROM auth_accounts WHERE id IN(@owner,@customer)) AS accountsRemaining,
 (SELECT COUNT(*) FROM rental_properties WHERE id=@property) AS propertiesRemaining;
COMMIT;
'@
        $taskTable = New-Object System.Data.DataTable
        $taskAdapter = New-Object System.Data.SqlClient.SqlDataAdapter $taskCommand
        [void]$taskAdapter.Fill($taskTable)
        $taskTable.Rows[0] | Select-Object accountsRemaining,propertiesRemaining | ConvertTo-Json -Compress
    }
} finally { $taskConnection.Dispose() }
