param([Parameter(Mandatory)][ValidateSet('prepare','cleanup')][string]$Mode,[Parameter(Mandatory)][Guid]$TestKey,[Parameter(Mandatory)][long]$AccountId,[ValidatePattern('^[0-9]{12}$')][string]$DocumentNumber='000000000000')
$ErrorActionPreference='Stop';$root=Split-Path $PSScriptRoot -Parent
$manifest=Get-Content -Raw (Join-Path $root 'target/identity-migration-manifest.json')|ConvertFrom-Json
if($manifest.clone -notmatch '^ancu_identity_verify_\d{14}$'){throw 'Only dedicated cloned database allowed.'}
$settings=@{};foreach($file in @('src/main/resources/application.properties','.env.local')){foreach($line in Get-Content (Join-Path $root $file) -ErrorAction SilentlyContinue){if($line -match '^([^#=]+)=(.*)$'){$settings[$matches[1]]=$matches[2]}}}
$builder=New-Object System.Data.SqlClient.SqlConnectionStringBuilder;$builder['Data Source']='localhost,1433';$builder['Initial Catalog']=$manifest.clone;$builder['User ID']=$settings['spring.datasource.username'];$builder['Password']=$settings['spring.datasource.password'];$builder['Encrypt']=$true;$builder['TrustServerCertificate']=$true
$connection=New-Object System.Data.SqlClient.SqlConnection $builder.ConnectionString
try{$connection.Open();$command=$connection.CreateCommand();$command.CommandTimeout=30
 [void]$command.Parameters.AddWithValue('@account',$AccountId);[void]$command.Parameters.AddWithValue('@name',"Creation E2E $TestKey");[void]$command.Parameters.AddWithValue('@email',"creation-$TestKey@example.invalid");[void]$command.Parameters.AddWithValue('@subject',"auth0|creation-$TestKey");[void]$command.Parameters.AddWithValue('@document',$DocumentNumber)
 $guard=@'
SET XACT_ABORT ON; BEGIN TRANSACTION;
IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=@account AND email=@email AND full_name=@name AND role IN('CUSTOMER','OWNER')) THROW 51000,'Exact fresh account guard failed.',1;
IF EXISTS(SELECT 1 FROM rental_properties WHERE owner_id=@account AND name<>@name) THROW 51000,'Foreign property guard failed.',1;
'@
 if($Mode -eq 'prepare'){$command.CommandText=$guard+@'
UPDATE auth_accounts SET role='OWNER',status='ACTIVE',identity_verified=1,version=version+1 WHERE id=@account;
INSERT auth_external_identities(account_id,issuer,subject,document_number,legal_name,date_of_birth,gender,address,source,verification_status,verified_at,version)
VALUES(@account,'https://creation-fixture.invalid/',@subject,@document,@name,'1990-01-01',N'Nam',N'Địa chỉ kiểm thử','AUTH0_VNEID_SIMULATION','VERIFIED',SYSUTCDATETIME(),0);
COMMIT TRANSACTION;
'@;[void]$command.ExecuteNonQuery();'{"prepared":true}'}
 else{$command.CommandText=$guard+@'
IF EXISTS(SELECT 1 FROM property_dossiers d JOIN rental_properties p ON p.id=d.property_id WHERE p.owner_id=@account)
 OR EXISTS(SELECT 1 FROM rental_requests r JOIN rental_apartments a ON a.id=r.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@account)
 OR EXISTS(SELECT 1 FROM rental_contracts WHERE customer_id=@account) THROW 51000,'Fixture has unexpected dossier/request/contract; preserve for review.',1;
DELETE FROM property_images WHERE uploader_id=@account;
DELETE m FROM rental_apartment_amenities m JOIN rental_apartments a ON a.id=m.apartment_id JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@account;
DELETE a FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id WHERE p.owner_id=@account;
DELETE FROM rental_properties WHERE owner_id=@account;
DELETE FROM auth_external_identities WHERE account_id=@account;
DELETE t FROM auth_refresh_tokens t JOIN auth_sessions s ON s.id=t.session_id WHERE s.account_id=@account;
DELETE FROM auth_sessions WHERE account_id=@account;
DELETE FROM auth_accounts WHERE id=@account;
COMMIT TRANSACTION;
SELECT (SELECT COUNT(*) FROM auth_accounts WHERE id=@account) accounts,(SELECT COUNT(*) FROM rental_properties WHERE owner_id=@account) properties;
'@;$reader=$command.ExecuteReader();[void]$reader.Read();@{accounts=[int]$reader['accounts'];properties=[int]$reader['properties']}|ConvertTo-Json -Compress;$reader.Close()}
}finally{$connection.Dispose()}
