-- Explicit local fixture authorized 02 November 2026. Preview by default.
-- Change only @Apply to 1 to create once; reruns never reset a tested fixture.
-- Signature images/timestamps are copied with user authorization, NOT new consent.
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Apply bit = 0;
IF DB_NAME() <> 'proptech_db' THROW 51000, 'Local proptech_db only.', 1;
DECLARE @Marker nvarchar(100) = N'LOCAL-HH205-EXPIRED-20261102';
DECLARE @Title nvarchar(200) = N'[MẪU] Hết hạn - HH205.TEST';
DECLARE @Start date = '20260501', @End date = '20261031';
BEGIN TRANSACTION;
BEGIN TRY
 DECLARE @LockResult int;
 EXEC @LockResult = sys.sp_getapplock @Resource=@Marker, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
 IF @LockResult < 0 THROW 51000, 'Cannot lock fixture.', 1;
 IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=2 AND email='huuha205@gmail.com' AND role='CUSTOMER' AND status='ACTIVE' AND email_verified=1)
  THROW 51000, 'Exact customer guard failed.', 1;
 IF NOT EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id
  JOIN rental_properties p ON p.id=a.property_id JOIN auth_accounts o ON o.id=p.owner_id
  JOIN contract_drafts d ON d.contract_id=c.id
  WHERE c.id=2 AND c.customer_id=2 AND a.id=8 AND p.id=2 AND p.approval_status='APPROVED'
   AND o.id=3 AND o.email='owner@ancu.local' AND o.role='OWNER' AND o.status='ACTIVE'
   AND d.owner_signature IS NOT NULL AND d.customer_signature IS NOT NULL
   AND d.owner_signed_at IS NOT NULL AND d.customer_signed_at IS NOT NULL
   AND ISJSON(d.snapshot_json)=1 AND ISJSON(d.clauses_json)=1)
  THROW 51000, 'Source contract/parties/signature guard failed.', 1;
 IF @End >= CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')
  THROW 51000, 'Fixture must already be expired.', 1;
 DECLARE @Apartment bigint, @Request bigint, @Contract bigint, @Created bit=0;
 SELECT @Apartment=id FROM rental_apartments WITH(UPDLOCK,HOLDLOCK) WHERE title=@Title;
 IF @Apartment IS NOT NULL
 BEGIN
  SELECT @Contract=c.id,@Request=d.rental_request_id FROM rental_contracts c
   JOIN contract_drafts d ON d.contract_id=c.id JOIN rental_requests r ON r.id=d.rental_request_id
   JOIN rental_apartments a ON a.id=c.apartment_id
   WHERE a.id=@Apartment AND a.property_id=2 AND c.customer_id=2 AND c.local_fixture=1
    AND c.start_date=@Start AND c.end_date=@End AND r.message=@Marker;
  IF @Contract IS NULL THROW 51000, 'Marker collision; refusing to reset or replace data.', 1;
 END
 ELSE IF @Apply=1
 BEGIN
  INSERT INTO rental_apartments(title,description,area_m2,advertised_monthly_rent,bedrooms,bathrooms,
   cover_image_path,publication_status,availability,created_at,version,room_number,floor,deposit,
   electricity_index,water_index,max_occupants,electricity_unit_price,water_unit_price,property_id)
  SELECT @Title,N'Hợp đồng mẫu thử bàn giao/ký tiếp cho huuha205. Chữ ký sao chép theo yêu cầu; không phải thỏa thuận mới.',
   a.area_m2,c.monthly_rent,a.bedrooms,a.bathrooms,a.cover_image_path,'HIDDEN','OCCUPIED',SYSUTCDATETIME(),0,
   N'HH205.TEST',a.floor,d.deposit,1000,100,1,c.electricity_unit_price,c.water_unit_price,a.property_id
  FROM rental_apartments a JOIN rental_contracts c ON c.apartment_id=a.id
   JOIN contract_drafts d ON d.contract_id=c.id WHERE c.id=2;
  SET @Apartment=CONVERT(bigint,SCOPE_IDENTITY());
  INSERT INTO rental_requests(message,status,created_at,version,decision_reason,quoted_monthly_rent,apartment_id,customer_id,decided_at)
  SELECT @Marker,'ACCEPTED',SYSUTCDATETIME(),0,N'Dữ liệu mẫu được cho phép tạo riêng ngày 02/11/2026.',monthly_rent,@Apartment,2,SYSUTCDATETIME()
   FROM rental_contracts WHERE id=2;
  SET @Request=CONVERT(bigint,SCOPE_IDENTITY());
  INSERT INTO rental_contracts(status,start_date,end_date,monthly_rent,electricity_unit_price,water_unit_price,
   electricity_baseline,water_baseline,baseline_date,billing_version,local_fixture,version,apartment_id,customer_id,
   water_billing_mode,occupant_count,internet_fee,garbage_fee)
  SELECT 'ACTIVE',@Start,@End,monthly_rent,electricity_unit_price,water_unit_price,1000,100,@Start,0,1,0,@Apartment,2,
   water_billing_mode,occupant_count,internet_fee,garbage_fee FROM rental_contracts WHERE id=2;
  SET @Contract=CONVERT(bigint,SCOPE_IDENTITY());
  DECLARE @Snapshot nvarchar(max)=(SELECT snapshot_json FROM contract_drafts WHERE contract_id=2);
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.owner.id',CONVERT(nvarchar(30),3));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.customer.id',CONVERT(nvarchar(30),2));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.apartmentId',CONVERT(nvarchar(30),@Apartment));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.propertyId',CONVERT(nvarchar(30),2));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.title',@Title);
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.roomNumber',N'HH205.TEST');
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.localFixture',CAST(1 AS bit));
  DECLARE @DossierId nvarchar(30)=(SELECT TOP(1) CONVERT(nvarchar(30),id) FROM property_dossiers WHERE property_id=2 AND status='APPROVED' ORDER BY id DESC);
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.approvedDossierId',@DossierId);
  INSERT INTO contract_drafts(snapshot_json,clauses_json,deposit,payment_day,payment_method,usage_purpose,created_at,
   content_version,contract_id,rental_request_id,template_type,owner_signature,customer_signature,owner_signed_at,customer_signed_at,signed_content_hash)
  SELECT @Snapshot,clauses_json,deposit,payment_day,payment_method,
   N'[MẪU THỬ NGHIỆM] Bàn giao hoặc ký tiếp; chữ ký sao chép từ HD-2 theo yêu cầu ngày 02/11/2026.',
   SYSUTCDATETIME(),0,@Contract,@Request,COALESCE(template_type,'APARTMENT'),
   owner_signature,customer_signature,owner_signed_at,customer_signed_at,NULL
  FROM contract_drafts WHERE contract_id=2;
  -- Do not copy the old content hash: these images do not attest the new content.
  SET @Created=1;
 END;
 SELECT @Apply apply_requested,@Created created,@Apartment apartment_id,@Request request_id,@Contract contract_id,
  @Title title,@Start start_date,@End end_date,'huuha205@gmail.com' customer_email,'owner@ancu.local' owner_email,
  CAST(1000 AS decimal(15,2)) electricity_baseline,CAST(100 AS decimal(15,2)) water_baseline;
 COMMIT;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK;
 THROW;
END CATCH;
