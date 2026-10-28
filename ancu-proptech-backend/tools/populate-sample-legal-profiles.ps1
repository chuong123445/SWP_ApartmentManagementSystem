param([switch]$Apply)
$ErrorActionPreference='Stop'
# Explicit one-off local fixtures. No startup hook; never change credentials or verification.
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
$taskTransaction=$null
function Invoke-TaskTable([string]$Sql,[hashtable]$Values=@{}) {
 $taskCmd=$taskConnection.CreateCommand();$taskCmd.Transaction=$taskTransaction;$taskCmd.CommandTimeout=30;$taskCmd.CommandText=$Sql
 foreach($taskKey in $Values.Keys){[void]$taskCmd.Parameters.AddWithValue('@'+$taskKey,$Values[$taskKey])}
 $taskData=New-Object System.Data.DataTable;$taskData.Load($taskCmd.ExecuteReader());return ,$taskData
}
function New-SampleCard([string]$Title,[string]$Name,[string]$Number) {
 $taskBitmap=New-Object System.Drawing.Bitmap 1000,600;$taskGraphics=[System.Drawing.Graphics]::FromImage($taskBitmap)
 $taskFont=New-Object System.Drawing.Font 'Segoe UI',26;$taskBig=New-Object System.Drawing.Font 'Segoe UI',40,([System.Drawing.FontStyle]::Bold)
 $taskStream=New-Object IO.MemoryStream
 try {
  $taskGraphics.Clear([System.Drawing.Color]::WhiteSmoke)
  $taskGraphics.DrawString('MAU / SAMPLE - KHONG CO GIA TRI PHAP LY',$taskFont,[System.Drawing.Brushes]::Red,25,30)
  $taskGraphics.DrawString($Title,$taskBig,[System.Drawing.Brushes]::Navy,25,140)
  $taskGraphics.DrawString($Name,$taskFont,[System.Drawing.Brushes]::Black,25,250)
  $taskGraphics.DrawString($Number,$taskFont,[System.Drawing.Brushes]::Black,25,330)
  $taskGraphics.DrawString('DU LIEU MINH HOA - KHONG PHAI GIAY TO THAT',$taskFont,[System.Drawing.Brushes]::Red,25,490)
  $taskBitmap.Save($taskStream,[System.Drawing.Imaging.ImageFormat]::Png);return ,$taskStream.ToArray()
 } finally {$taskStream.Dispose();$taskFont.Dispose();$taskBig.Dispose();$taskGraphics.Dispose();$taskBitmap.Dispose()}
}
try {
 $taskConnection.Open()
 $taskGuard=Invoke-TaskTable "SELECT DB_NAME() AS db;"
 if($taskGuard.Rows[0].db -ne 'proptech_db'){throw 'Local database guard failed'}
 $taskAccounts=Invoke-TaskTable @'
SELECT id,full_name,phone,date_of_birth,address,bio,version FROM auth_accounts
 WHERE id IN('afe8db01-9cb1-47ec-beed-3cf3349fa063','761141f5-f7cc-443d-b7a2-137ddd955c06','4ac1b90d-c8dd-41f3-9a35-4750e696f5aa','2687a510-0564-4dfd-9fd4-25f1515040ce')
 AND LOWER(email)<>'customer@ancu.local' ORDER BY id;
'@
 $taskProperties=Invoke-TaskTable @'
SELECT p.id,p.owner_id,p.name,o.full_name FROM rental_properties p JOIN auth_accounts o ON o.id=p.owner_id
 WHERE p.id IN('68d375a9-7f48-4dcf-a596-1b2b7dc24b14','695bf3b1-55b0-499d-a40d-fbaee8ecbcf2','e0ea22aa-7c26-4f7b-b119-cf2cea8d1b20','8cfa0b14-50ae-4d8d-babc-98a4030d49a2')
 AND p.id<>'0b50f9a1-491e-4319-bda7-9a8c62b0ba42' AND p.approval_status='APPROVED'
 AND EXISTS(SELECT 1 FROM rental_apartments a WHERE a.property_id=p.id AND a.publication_status='PUBLISHED' AND a.availability IN('VACANT','OCCUPIED','CONTRACT_IN_PROGRESS')) ORDER BY p.id;
'@
 if($taskAccounts.Rows.Count -ne 4 -or $taskProperties.Rows.Count -ne 4){throw 'Expected four inspected accounts and four approved sample properties'}
 if(!$Apply){@{accounts=$taskAccounts.Rows.Count;properties=$taskProperties.Rows.Count;mode='preview';excluded='customer@ancu.local and VC01'}|ConvertTo-Json -Compress;return}
 Add-Type -AssemblyName System.Drawing
 $taskTransaction=$taskConnection.BeginTransaction([System.Data.IsolationLevel]::Serializable)
 $taskInvariantSql=@'
SELECT CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),
 (SELECT * FROM auth_accounts WHERE id='082b7675-4091-4a59-b96a-5f2b7eb01ec8' OR LOWER(email)='customer@ancu.local' ORDER BY id FOR JSON PATH))),2) AS excluded_account,
 CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),(SELECT * FROM rental_properties WHERE id='0b50f9a1-491e-4319-bda7-9a8c62b0ba42' FOR JSON PATH))),2) AS vc01,
 CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),(SELECT * FROM rental_apartments ORDER BY id FOR JSON PATH))),2) AS apartments,
 CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),(SELECT * FROM rental_contracts ORDER BY id FOR JSON PATH))),2) AS contracts,
 CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),(SELECT * FROM contract_drafts ORDER BY id FOR JSON PATH))),2) AS drafts,
 CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),(SELECT * FROM rental_invoices ORDER BY id FOR JSON PATH))),2) AS invoices,
 CONVERT(varchar(64),HASHBYTES('SHA2_256',CONVERT(nvarchar(max),(SELECT id,email,password_hash,role,status,contact_verified,email_verified,phone_verified FROM auth_accounts ORDER BY id FOR JSON PATH))),2) AS credentials_and_verification;
'@
 $taskBefore=Invoke-TaskTable $taskInvariantSql
 $taskBackup=Join-Path $taskRoot ('target/sample-legal-before-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')+'.json')
 @{accounts=@($taskAccounts|Select-Object id,phone,date_of_birth,address,bio,version);invariants=@($taskBefore|Select-Object excluded_account,vc01,apartments,contracts,drafts,invoices,credentials_and_verification)}|ConvertTo-Json -Depth 4|Set-Content -LiteralPath $taskBackup -Encoding UTF8
 $taskNewIdentities=0;$taskNewDossiers=0;$taskIndex=0
 foreach($taskAccount in $taskAccounts.Rows){
  $taskIndex++;$taskId=[Guid]$taskAccount.id;$taskNumber='999'+$taskIndex.ToString('000000000')
  $taskExisting=Invoke-TaskTable 'SELECT account_id FROM account_identity_profiles WITH(UPDLOCK,HOLDLOCK) WHERE account_id=@id' @{id=$taskId}
  if($taskExisting.Rows.Count){continue}
  $taskFront=New-SampleCard 'CAN CUOC - MAT TRUOC' $taskAccount.full_name $taskNumber
  $taskBack=New-SampleCard 'CAN CUOC - MAT SAU' $taskAccount.full_name $taskNumber
  $taskParams=@{id=$taskId;name=[string]$taskAccount.full_name;number=$taskNumber;phone=('+849000001'+$taskIndex.ToString('00'));front=$taskFront;back=$taskBack;address='Địa chỉ sinh sống mẫu - chỉ để thử nghiệm';place='Cơ quan cấp mẫu - không có giá trị pháp lý';bio='Thông tin liên hệ và giấy tờ minh họa; chưa xác minh danh tính.'}
  [void](Invoke-TaskTable @'
UPDATE auth_accounts SET phone=COALESCE(NULLIF(phone,''),@phone),date_of_birth=COALESCE(date_of_birth,'1995-06-15'),address=COALESCE(NULLIF(address,''),@address),bio=COALESCE(NULLIF(bio,''),@bio),version=version+1 WHERE id=@id AND LOWER(email)<>'customer@ancu.local';
INSERT INTO account_identity_profiles(account_id,legal_name,document_number,date_of_birth,issue_date,issue_place,permanent_address,current_address,verification_status,updated_at,version,local_fixture)
 SELECT id,full_name,@number,date_of_birth,CASE WHEN date_of_birth>'2025-06-15' THEN date_of_birth ELSE CONVERT(date,'2025-06-15') END,@place,N'Địa chỉ trên căn cước mẫu - chỉ để thử nghiệm',CASE WHEN address LIKE '%@%' THEN @address ELSE address END,'NOT_VERIFIED',SYSUTCDATETIME(),0,1 FROM auth_accounts WHERE id=@id;
INSERT INTO account_identity_documents(account_id,front_content,front_content_type,back_content,back_content_type) VALUES(@id,@front,'image/png',@back,'image/png');
SELECT 1 AS inserted;
'@ $taskParams);$taskNewIdentities++
 }
 $taskIndex=0
 foreach($taskProperty in $taskProperties.Rows){
  $taskIndex++;$taskId=[Guid]$taskProperty.id
  $taskExisting=Invoke-TaskTable 'SELECT id FROM property_dossiers WITH(UPDLOCK,HOLDLOCK) WHERE property_id=@id' @{id=$taskId}
  if($taskExisting.Rows.Count){continue}
  $taskNumber='MAU-GCN-2026-'+$taskIndex.ToString('000');$taskDossierId=[Guid]::NewGuid();$taskFileId=[Guid]::NewGuid()
  $taskImage=New-SampleCard 'GIAY CHUNG NHAN / QUYEN CHO THUE' $taskProperty.name $taskNumber
  [void](Invoke-TaskTable @'
INSERT INTO property_evidence_files(id,property_id,uploader_id,purpose,filename,content_type,size_bytes,created_at)
 VALUES(@file,@property,@owner,'RIGHT_DOCUMENT',@filename,'image/png',@size,SYSUTCDATETIME());
INSERT INTO property_evidence_content(id,content) VALUES(@file,@image);
INSERT INTO property_dossiers(id,property_id,right_type,applicant_name,bank,account_number,account_holder_name,status,submitted_at,review_reason,version,certificate_number,certificate_issue_date,certificate_issue_place,exploitation_right_description,local_fixture)
 VALUES(@dossier,@property,'OWNERSHIP',@name,@bank,@bankNumber,@name,'APPROVED',SYSUTCDATETIME(),@note,0,@certificate,'2020-01-15',@place,@right,1);
INSERT INTO property_dossier_files(dossier_id,file_id) VALUES(@dossier,@file);
SELECT 1 AS inserted;
'@ @{file=$taskFileId;property=$taskId;owner=[Guid]$taskProperty.owner_id;filename=($taskNumber+'.png');size=[long]$taskImage.Length;image=$taskImage;dossier=$taskDossierId;name=[string]$taskProperty.full_name;bank='Ngân hàng mẫu - không giao dịch';bankNumber=('000000000'+$taskIndex.ToString('000'));note='Hồ sơ minh họa cho tài sản mẫu đã được công khai; không có kiểm duyệt giấy tờ thật.';certificate=$taskNumber;place='Cơ quan cấp mẫu - không có giá trị pháp lý';right=('Dữ liệu mẫu: quyền sở hữu và cho thuê căn hộ tại '+$taskProperty.name+'. Chỉ để thử nghiệm, chưa đối chiếu chứng từ thật.')} );$taskNewDossiers++
 }
 $taskAfter=Invoke-TaskTable $taskInvariantSql
 foreach($taskColumn in $taskBefore.Columns){if($taskBefore.Rows[0][$taskColumn.ColumnName] -ne $taskAfter.Rows[0][$taskColumn.ColumnName]){throw ('Preservation guard failed: '+$taskColumn.ColumnName)}}
 $taskTransaction.Commit();$taskTransaction=$null
 @{identitiesInserted=$taskNewIdentities;dossiersInserted=$taskNewDossiers;backup=$taskBackup;preservationGuards='PASS'}|ConvertTo-Json -Compress
}catch{if($taskTransaction){$taskTransaction.Rollback()};throw}finally{$taskConnection.Dispose()}
