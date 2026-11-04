param([Parameter(Mandatory=$true)][string]$InputFile,[switch]$Apply,[switch]$Validate)
$ErrorActionPreference='Stop'
if($Apply -and $Validate){throw 'Choose Apply or Validate.'}
$taskRoot=Split-Path $PSScriptRoot -Parent
$taskPlan=Get-Content -Raw -LiteralPath $InputFile -Encoding UTF8 | ConvertFrom-Json
if($taskPlan.source -ne 'LOCAL_DEMO' -or (@($taskPlan.accounts.id | Sort-Object) -join ',') -ne '3,5,6' -or (@($taskPlan.unsignedContracts | Sort-Object) -join ',') -ne '8,9'){throw 'This one-off change is limited to accounts 3/5/6 and unsigned contracts 8/9.'}
foreach($p in $taskPlan.accounts){
 if($p.documentNumber -notmatch '^\d{12}$' -or $p.email -notmatch '^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$'){throw 'Invalid profile email/document format.'}
 foreach($key in @('fullName','address','permanentAddress','documentIssuePlace')){if([string]::IsNullOrWhiteSpace($p.$key) -or $p.$key -match '(?i)mẫu|sample|minh họa|placeholder'){throw 'Use complete ordinary profile text.'}}
}
$taskSettings=@{}
foreach($line in Get-Content -LiteralPath ($taskRoot+'/src/main/resources/application.properties') -Encoding UTF8){if($line -match '^([^#=]+)=(.*)$'){$taskSettings[$matches[1].Trim()]=$matches[2]}}
$taskBuilder=New-Object Data.SqlClient.SqlConnectionStringBuilder
$taskBuilder['Data Source']='localhost,1433';$taskBuilder['Initial Catalog']='proptech_db';$taskBuilder['User ID']=$taskSettings['spring.datasource.username'];$taskBuilder['Password']=$taskSettings['spring.datasource.password'];$taskBuilder['TrustServerCertificate']=$true
$taskConnection=New-Object Data.SqlClient.SqlConnection($taskBuilder.ConnectionString)
$taskTx=$null
function Table([string]$Sql,[hashtable]$Params=@{}) {
 $q=$taskConnection.CreateCommand();try{$q.Transaction=$taskTx;$q.CommandTimeout=180;$q.CommandText=$Sql
  foreach($key in $Params.Keys){$value=$Params[$key];if($null -eq $value){$value=[DBNull]::Value};[void]$q.Parameters.AddWithValue('@'+$key,$value)}
  $dt=New-Object Data.DataTable;[void](New-Object Data.SqlClient.SqlDataAdapter($q)).Fill($dt);return ,$dt
 }finally{$q.Dispose()}
}
function Run([string]$Sql,[hashtable]$Params=@{}) {
 $q=$taskConnection.CreateCommand();try{$q.Transaction=$taskTx;$q.CommandTimeout=180;$q.CommandText=$Sql
  foreach($key in $Params.Keys){$value=$Params[$key];if($null -eq $value){$value=[DBNull]::Value};[void]$q.Parameters.AddWithValue('@'+$key,$value)}
  return $q.ExecuteNonQuery()
 }finally{$q.Dispose()}
}
function Fingerprint([string]$Sql) {return (Table ("SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',("+$Sql+' FOR JSON PATH,INCLUDE_NULL_VALUES)),2) AS hash')).Rows[0].hash}
function Invariants {
 $result=@{}
 $result.credentials=Fingerprint 'SELECT id,password_hash,google_subject,local_password_enabled,role,status FROM auth_accounts ORDER BY id'
 $result.other_accounts=Fingerprint 'SELECT * FROM auth_accounts WHERE id NOT IN(3,5,6) ORDER BY id'
 $result.other_identities=Fingerprint 'SELECT * FROM auth_external_identities WHERE account_id NOT IN(3,5,6) ORDER BY account_id'
 $result.other_profiles=Fingerprint 'SELECT * FROM account_identity_profiles WHERE account_id NOT IN(3,5,6) ORDER BY account_id'
 $result.signed_documents=Fingerprint 'SELECT * FROM contract_drafts WHERE owner_signed_at IS NOT NULL OR customer_signed_at IS NOT NULL ORDER BY id'
 $result.other_drafts=Fingerprint 'SELECT * FROM contract_drafts WHERE contract_id NOT IN(8,9) ORDER BY id'
 $result.other_sessions=Fingerprint 'SELECT * FROM auth_sessions WHERE account_id NOT IN(3,5,6) ORDER BY id'
 foreach($entry in @(@('auth_account_roles','account_id,role_id'),@('auth_roles','id'),@('rental_contracts','id'),@('rental_apartments','id'),@('rental_properties','id'),@('property_dossiers','id'),@('rental_invoices','id'),@('invoice_payments','id'),@('sepay_test_payments','id'),@('sepay_connections','owner_id'),@('settlement_entries','id'),@('owner_withdrawals','id'),@('account_identity_documents','account_id'))){$result[$entry[0]]=Fingerprint ('SELECT * FROM dbo.'+$entry[0]+' ORDER BY '+$entry[1])}
 return $result
}
function UpdateLocalEnvironment {
 $path=Join-Path $taskRoot '.env.local';$text=if(Test-Path -LiteralPath $path){[IO.File]::ReadAllText($path)}else{''}
 $values=@{LOCAL_OWNER_EMAIL=($taskPlan.accounts | Where-Object id -eq 3).email;LOCAL_TENANT_1_EMAIL=($taskPlan.accounts | Where-Object id -eq 5).email;LOCAL_TENANT_2_EMAIL=($taskPlan.accounts | Where-Object id -eq 6).email;SEPAY_PLATFORM_SOURCE_EMAIL=($taskPlan.accounts | Where-Object id -eq 3).email}
 foreach($entry in $values.GetEnumerator()){$pattern='(?m)^'+[regex]::Escape($entry.Key)+'=.*$';$line=$entry.Key+'='+$entry.Value;if($text -match $pattern){$text=[regex]::Replace($text,$pattern,$line)}else{$text=$text.TrimEnd()+"`r`n"+$line+"`r`n"}}
 [IO.File]::WriteAllText($path,$text,[Text.UTF8Encoding]::new($false))
}
try {
 $taskConnection.Open()
 if((Table 'SELECT DB_NAME() AS name').Rows[0].name -ne 'proptech_db'){throw 'Wrong local database.'}
 $accounts=Table 'SELECT id,email,full_name,status,version FROM auth_accounts WHERE id IN(3,5,6) ORDER BY id'
 if($accounts.Rows.Count -ne 3){throw 'Expected exactly the three inspected accounts.'}
 $already=$true
 foreach($p in $taskPlan.accounts){$a=@($accounts.Rows | Where-Object id -eq $p.id)[0];if($a.status -ne 'ACTIVE'){throw 'Do not activate/unlock an account through this helper.'};if($a.email -ne $p.email){$already=$false;if($a.email -ne $p.previousEmail){throw 'Account email changed since inspection.'}}}
 if($already){
  $ready=(Table "SELECT COUNT(*) AS n FROM auth_external_identities WHERE account_id IN(3,5,6) AND source='LOCAL_DEMO' AND verification_status='VERIFIED'").Rows[0].n
  if($ready -ne 3){throw 'Emails changed without matching local identity evidence; review before applying.'}
  if($Apply){UpdateLocalEnvironment};[pscustomobject]@{mode='already-applied';accounts=3}|ConvertTo-Json -Compress;return
 }
 foreach($p in $taskPlan.accounts){
  if((Table 'SELECT COUNT(*) AS n FROM auth_accounts WHERE email=@email AND id<>@id' @{email=$p.email;id=[long]$p.id}).Rows[0].n -ne 0){throw 'New email already belongs to another account.'}
  if((Table 'SELECT COUNT(*) AS n FROM auth_external_identities WHERE document_number=@number AND account_id<>@id' @{number=$p.documentNumber;id=[long]$p.id}).Rows[0].n -ne 0){throw 'Document number is already linked to another account.'}
 }
 if((Table "SELECT COUNT(*) AS n FROM auth_external_identities WHERE account_id IN(3,5,6) AND source<>'LOCAL_DEMO'").Rows[0].n -ne 0){throw 'Do not replace an existing provider identity.'}
 $drafts=Table "SELECT d.contract_id,d.snapshot_json,d.content_version FROM contract_drafts d JOIN rental_contracts c ON c.id=d.contract_id WHERE d.contract_id IN(8,9) AND c.status='DRAFT' AND d.owner_signed_at IS NULL AND d.customer_signed_at IS NULL AND d.owner_signature IS NULL AND d.customer_signature IS NULL"
 if($drafts.Rows.Count -ne 2){throw 'Both selected drafts must still be unsigned.'}
 if(!$Apply -and !$Validate){[pscustomobject]@{mode='preview';accounts=3;unsigned_contracts=2;new_emails=@($taskPlan.accounts.email);source='LOCAL_DEMO'}|ConvertTo-Json -Compress;return}
 $stamp=[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')
 $backup=Join-Path (Split-Path $taskRoot -Parent) ('../tmp/proptech_db-before-profiles-'+$stamp+'.bak');$backup=[IO.Path]::GetFullPath($backup)
 if($Apply){Run 'BACKUP DATABASE [proptech_db] TO DISK=@path WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM' @{path=$backup}|Out-Null}
 $taskTx=$taskConnection.BeginTransaction([Data.IsolationLevel]::Serializable)
 [void](Table 'SELECT id FROM auth_accounts WITH(UPDLOCK,HOLDLOCK) WHERE id IN(3,5,6)')
 $before=Invariants
 foreach($name in @('V55__local_demo_identity_source.sql','V54__account_role_view.sql')){
  foreach($batch in [regex]::Split([IO.File]::ReadAllText((Join-Path $taskRoot ('src/main/resources/db/migration/'+$name))),'(?im)^GO\s*\r?$')){if($batch.Trim()){Run $batch|Out-Null}}
 }
 $parties=@{}
 foreach($p in $taskPlan.accounts){
  $a=@($accounts.Rows | Where-Object id -eq $p.id)[0]
  $values=@{id=[long]$p.id;expected=[long]$a.version;email=$p.email;name=$p.fullName;phone=$p.phone;birth=[DateTime]$p.dateOfBirth;address=$p.address;permanent=$p.permanentAddress;number=$p.documentNumber;issued=[DateTime]$p.documentIssueDate;place=$p.documentIssuePlace;gender=$p.gender;subject=[string]$p.id}
  if((Run "UPDATE auth_accounts SET email=@email,full_name=@name,phone=@phone,date_of_birth=@birth,address=@address,bio=N'Sinh sống và làm việc tại TP. Hồ Chí Minh.',email_verified=1,phone_verified=1,identity_verified=1,contact_verified=1,version=version+1 WHERE id=@id AND version=@expected AND status='ACTIVE'" $values) -ne 1){throw 'Account changed during update.'}
  Run @'
UPDATE account_identity_profiles SET legal_name=@name,document_number=@number,date_of_birth=@birth,issue_date=@issued,issue_place=@place,
 permanent_address=@permanent,current_address=@address,local_fixture=1,updated_at=SYSUTCDATETIME(),version=version+1 WHERE account_id=@id;
IF @@ROWCOUNT=0 THROW 51000,'Expected an existing identity profile.',1;
INSERT auth_external_identities(account_id,issuer,subject,document_number,legal_name,date_of_birth,gender,address,source,verification_status,verified_at,version,document_issue_date,document_issue_place,permanent_address,details_updated_at)
VALUES(@id,'urn:ancu:local-demo',@subject,@number,@name,@birth,@gender,@address,'LOCAL_DEMO','VERIFIED',SYSUTCDATETIME(),0,@issued,@place,@permanent,SYSUTCDATETIME());
'@ $values|Out-Null
  $parties[[string]$p.id]=([ordered]@{id=[string]$p.id;fullName=$p.fullName;email=$p.email;phone=$p.phone;address=$p.address;dateOfBirth=([DateTime]$p.dateOfBirth).ToString('yyyy-MM-dd');emailVerified=$true;documentNumber=$p.documentNumber;documentIssueDate=([DateTime]$p.documentIssueDate).ToString('yyyy-MM-dd');documentIssuePlace=$p.documentIssuePlace;permanentAddress=$p.permanentAddress;identityVerificationStatus='VERIFIED_LOCAL_DEMO';localFixture=$true}|ConvertTo-Json -Depth 3 -Compress)
 }
 foreach($d in $drafts.Rows){
  $snapshot=$d.snapshot_json | ConvertFrom-Json
  $ownerJson=$parties[[string]$snapshot.owner.id];$customerJson=$parties[[string]$snapshot.customer.id]
  if(!$ownerJson -and !$customerJson){throw 'Draft does not involve the selected accounts.'}
  $values=@{id=[long]$d.contract_id;version=[long]$d.content_version;owner=$ownerJson;customer=$customerJson}
  if((Run @'
DECLARE @snapshot nvarchar(max)=(SELECT snapshot_json FROM contract_drafts WITH(UPDLOCK,HOLDLOCK) WHERE contract_id=@id);
IF @owner IS NOT NULL SET @snapshot=JSON_MODIFY(@snapshot,'$.owner',JSON_QUERY(@owner));
IF @customer IS NOT NULL SET @snapshot=JSON_MODIFY(@snapshot,'$.customer',JSON_QUERY(@customer));
UPDATE d SET snapshot_json=@snapshot,content_version=content_version+1 FROM contract_drafts d JOIN rental_contracts c ON c.id=d.contract_id
WHERE d.contract_id=@id AND d.content_version=@version AND c.status='DRAFT' AND d.owner_signed_at IS NULL AND d.customer_signed_at IS NULL AND d.owner_signature IS NULL AND d.customer_signature IS NULL;
'@ $values) -ne 1){throw 'Draft changed or was signed during update.'}
 }
 $revoked=Run 'UPDATE auth_sessions SET revoked_at=SYSUTCDATETIME() WHERE account_id IN(3,5,6) AND revoked_at IS NULL'
 Run 'UPDATE email_change_challenges SET invalidated_at=SYSUTCDATETIME() WHERE account_id IN(3,5,6) AND used_at IS NULL AND invalidated_at IS NULL'|Out-Null
 $after=Invariants;foreach($key in $before.Keys){if($before[$key] -ne $after[$key]){throw ('Preservation check failed: '+$key)}}
 if((Table "SELECT COUNT(*) AS n FROM auth_external_identities WHERE account_id IN(3,5,6) AND source='LOCAL_DEMO' AND verification_status='VERIFIED'").Rows[0].n -ne 3){throw 'Missing local identity evidence.'}
 if($Validate){$taskTx.Rollback();$taskTx=$null;[pscustomobject]@{mode='validated-and-rolled-back';accounts=3;unsigned_contracts=2;preservation='PASS';environment_unchanged=$true}|ConvertTo-Json -Compress;return}
 $taskTx.Commit();$taskTx=$null
 UpdateLocalEnvironment
 $evidence=[ordered]@{database='proptech_db';accounts=3;unsignedContracts=@(8,9);source='LOCAL_DEMO';revokedSessions=$revoked;backup=$backup;preserved=@($before.Keys | Sort-Object);inputSha256=(Get-FileHash -LiteralPath $InputFile -Algorithm SHA256).Hash;appliedAt=[DateTime]::UtcNow.ToString('o')}
 $output=Join-Path $taskRoot 'target/local-account-profile-change-20261104.json';[IO.File]::WriteAllText($output,($evidence|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
 $evidence|ConvertTo-Json -Depth 5 -Compress
}catch{if($taskTx){$taskTx.Rollback()};throw}finally{$taskConnection.Dispose();$taskSettings.Clear();$taskBuilder=$null}
