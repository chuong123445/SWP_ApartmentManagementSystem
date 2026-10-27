param(
    [Parameter(Mandatory)][ValidateSet('prepare','cleanup')][string]$Mode,
    [Parameter(Mandatory)][Guid]$TestKey,
    [Parameter(Mandatory)][Guid]$ApplicantId,
    [Parameter(Mandatory)][Guid]$AdminId,
    [ValidatePattern('^[0-9]{12}$')][string]$DocumentNumber = '000000000000'
)
$ErrorActionPreference='Stop'
# Chỉ tạo/xóa dữ liệu kiểm thử mới có ID + email + tên khớp chính xác; không sửa fixture dùng chung.
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskSettings=@{}
foreach($taskFile in @('src/main/resources/application.properties','.env.local')){
    $taskPath=Join-Path $taskRoot $taskFile
    if(Test-Path -LiteralPath $taskPath){foreach($taskLine in [IO.File]::ReadAllLines($taskPath)){if(!$taskLine.TrimStart().StartsWith('#') -and $taskLine.Contains('=')){$taskPair=$taskLine.Split('=',2);$taskSettings[$taskPair[0].Trim()]=$taskPair[1]}}}
}
$taskBuilder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433';$taskBuilder['Initial Catalog']='proptech_db';$taskBuilder['User ID']=$taskSettings['spring.datasource.username'];$taskBuilder['Password']=$taskSettings['spring.datasource.password'];$taskBuilder['Encrypt']=$true;$taskBuilder['TrustServerCertificate']=$true
$taskConnection=New-Object System.Data.SqlClient.SqlConnection $taskBuilder.ConnectionString
try{
    $taskConnection.Open();$taskCommand=$taskConnection.CreateCommand();$taskCommand.CommandTimeout=30
    [void]$taskCommand.Parameters.AddWithValue('@applicant',$ApplicantId);[void]$taskCommand.Parameters.AddWithValue('@admin',$AdminId)
    [void]$taskCommand.Parameters.AddWithValue('@email',"rights-e2e-$TestKey@example.invalid");[void]$taskCommand.Parameters.AddWithValue('@adminEmail',"rights-admin-e2e-$TestKey@example.invalid")
    [void]$taskCommand.Parameters.AddWithValue('@name',"Rights E2E $TestKey");[void]$taskCommand.Parameters.AddWithValue('@subject',"auth0|rights-e2e-$TestKey");[void]$taskCommand.Parameters.AddWithValue('@document',$DocumentNumber)
    $taskGuard=@'
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' THROW 51000,'Local fixture database guard failed.',1;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM auth_accounts WHERE id=@applicant AND (email<>@email OR full_name<>@name OR role NOT IN('CUSTOMER','OWNER') OR status NOT IN('PENDING_VERIFICATION','ACTIVE')))
 OR EXISTS(SELECT 1 FROM auth_accounts WHERE id=@admin AND (email<>@adminEmail OR full_name<>@name OR role<>'ADMIN'))
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@applicant AND (name<>@name OR onboarding_application<>1))
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@admin)
 THROW 51000,'Exact test identity/property guard failed.',1;
'@
    if($Mode -eq 'prepare'){
        $taskCommand.CommandText=$taskGuard+@'
IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=@applicant AND email=@email AND full_name=@name AND role='CUSTOMER' AND status='PENDING_VERIFICATION')
 OR EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@applicant)
 OR EXISTS(SELECT 1 FROM auth_external_identities WHERE account_id=@applicant OR subject=@subject OR document_number=@document)
 OR EXISTS(SELECT 1 FROM auth_accounts WHERE id=@admin OR email=@adminEmail)
 THROW 51000,'Expected fresh pending test Customer and unused fixture identities.',1;
UPDATE auth_accounts SET status='ACTIVE',contact_verified=1,version=version+1 WHERE id=@applicant;
INSERT INTO auth_external_identities(account_id,issuer,subject,document_number,legal_name,date_of_birth,gender,address,source,verification_status,verified_at,version)
 VALUES(@applicant,'https://rights-e2e.invalid/',@subject,@document,@name,'1990-01-01',N'Nam',N'Địa chỉ kiểm thử','AUTH0_VNEID_SIMULATION','VERIFIED',SYSUTCDATETIME(),0);
INSERT INTO auth_accounts(id,email,full_name,password_hash,role,status,contact_verified,email_verified,phone_verified,version)
 SELECT @admin,@adminEmail,@name,password_hash,'ADMIN','ACTIVE',0,0,0,0 FROM auth_accounts WHERE id=@applicant;
COMMIT;
'@
        [void]$taskCommand.ExecuteNonQuery();Write-Output '{"prepared":true}'
    }else{
        $taskCommand.CommandText=$taskGuard+@'
IF EXISTS(SELECT 1 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@applicant OR r.customer_id=@applicant)
 OR EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@applicant OR c.customer_id=@applicant)
 OR EXISTS(SELECT 1 FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@applicant AND (a.room_number<>'R.E2E.1' OR a.availability<>'VACANT'))
 OR EXISTS(SELECT 1 FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE (p.owner_id=@applicant AND d.reviewer_id IS NOT NULL AND d.reviewer_id<>@admin) OR (d.reviewer_id=@admin AND p.owner_id<>@applicant))
 OR EXISTS(SELECT 1 FROM property_external_imports i JOIN rental_properties p ON p.id=i.property_id WHERE p.owner_id=@applicant)
 OR EXISTS(SELECT 1 FROM auth_owner_upgrades WHERE account_id=@applicant)
 OR EXISTS(SELECT 1 FROM account_identity_profiles WHERE account_id IN(@applicant,@admin))
 THROW 51000,'Fixture gained unrelated data; cleanup stopped.',1;
DELETE FROM property_right_notices WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@applicant);
DELETE FROM property_dossier_files WHERE dossier_id IN(SELECT d.id FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE p.owner_id=@applicant);
DELETE FROM property_evidence_content WHERE id IN(SELECT f.id FROM property_evidence_files f JOIN rental_properties p ON p.id=f.property_id WHERE p.owner_id=@applicant);
DELETE FROM property_evidence_files WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@applicant);
DELETE FROM property_dossiers WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@applicant);
DELETE FROM rental_apartment_amenities WHERE apartment_id IN(SELECT a.id FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@applicant);
DELETE FROM rental_apartments WHERE property_id IN(SELECT id FROM rental_properties WHERE owner_id=@applicant);
DELETE FROM rental_properties WHERE owner_id=@applicant AND name=@name;
DELETE FROM email_change_challenges WHERE account_id IN(@applicant,@admin);
DELETE FROM auth_refresh_tokens WHERE session_id IN(SELECT id FROM auth_sessions WHERE account_id IN(@applicant,@admin));
DELETE FROM auth_sessions WHERE account_id IN(@applicant,@admin);
DELETE FROM auth_external_identities WHERE account_id=@applicant AND subject=@subject;
DELETE FROM auth_accounts WHERE id=@applicant AND email=@email AND full_name=@name;
DELETE FROM auth_accounts WHERE id=@admin AND email=@adminEmail AND full_name=@name;
SELECT(SELECT COUNT(*) FROM auth_accounts WHERE id IN(@applicant,@admin)) AS accountsRemaining,(SELECT COUNT(*) FROM rental_properties WHERE owner_id=@applicant) AS propertiesRemaining;
COMMIT;
'@
        $taskTable=New-Object System.Data.DataTable;$taskAdapter=New-Object System.Data.SqlClient.SqlDataAdapter $taskCommand;[void]$taskAdapter.Fill($taskTable);$taskTable.Rows[0]|Select-Object accountsRemaining,propertiesRemaining|ConvertTo-Json -Compress
    }
}finally{$taskConnection.Dispose()}
