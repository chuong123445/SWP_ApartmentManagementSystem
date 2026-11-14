-- Additive local-only fixture requested by the user: Huu Ha / Van Chuong, D-7.
-- @Apply is supplied by the wrapper; the wrapper owns commit/rollback and backup.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' THROW 51000,'Local proptech_db only.',1;
DECLARE @Today date=CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time');
DECLARE @End date=DATEADD(day,7,@Today),@Start date;
SET @Start=DATEADD(month,-3,@End);
DECLARE @Marker nvarchar(100)=N'LOCAL-HH205-RENEWAL-20261113',@Room nvarchar(40)=N'HH205.RENEW',@Title nvarchar(150)=N'[MẪU] Hợp đồng sắp hết hạn - HH205.RENEW';
DECLARE @Apartment bigint,@Request bigint,@Contract bigint,@Created bit=0;
SELECT @Contract=c.id,@Apartment=a.id,@Request=d.rental_request_id
 FROM dbo.rental_contracts c JOIN dbo.rental_apartments a ON a.id=c.apartment_id
 JOIN dbo.contract_drafts d ON d.contract_id=c.id JOIN dbo.rental_requests r ON r.id=d.rental_request_id
 WHERE r.message=@Marker AND a.room_number=@Room AND c.customer_id=2 AND a.property_id=2 AND c.local_fixture=1;
IF @Contract IS NULL
BEGIN
 IF @Today<>'20261113' THROW 51000,'Creation is authorized for 13 November 2026 only; do not shift sample dates.',1;
 IF EXISTS(SELECT 1 FROM dbo.rental_apartments WHERE room_number=@Room) OR EXISTS(SELECT 1 FROM dbo.rental_requests WHERE message=@Marker)
  THROW 51000,'Fixture marker collision; refusing to replace existing data.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.auth_accounts WHERE id=2 AND email='huuha205@gmail.com' AND status='ACTIVE')
  THROW 51000,'Expected Huu Ha account not found.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.auth_accounts WHERE id=3 AND email='chuongaln@gmail.com' AND status='ACTIVE')
  THROW 51000,'Expected Van Chuong account not found.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.rental_contracts c JOIN dbo.rental_apartments a ON a.id=c.apartment_id
  JOIN dbo.rental_properties p ON p.id=a.property_id JOIN dbo.contract_drafts d ON d.contract_id=c.id
  WHERE c.id=5 AND c.local_fixture=1 AND c.customer_id=2 AND p.id=2 AND p.owner_id=3 AND p.approval_status='APPROVED'
   AND c.electricity_baseline IS NOT NULL AND c.water_baseline IS NOT NULL
   AND d.owner_signature IS NOT NULL AND d.customer_signature IS NOT NULL AND d.owner_signed_at IS NOT NULL AND d.customer_signed_at IS NOT NULL
   AND ISJSON(d.snapshot_json)=1 AND ISJSON(d.clauses_json)=1)
  THROW 51000,'Expected existing signed local sample HD-5 not found.',1;
 IF @Apply=1
 BEGIN
  INSERT INTO dbo.rental_apartments(title,description,area_m2,advertised_monthly_rent,bedrooms,bathrooms,cover_image_path,publication_status,availability,created_at,version,room_number,floor,deposit,electricity_index,water_index,max_occupants,electricity_unit_price,water_unit_price,property_id)
  SELECT @Title,N'Dữ liệu mẫu để Hữu Hà và Văn Chương thử yêu cầu thuê tiếp/gia hạn; không phải thỏa thuận thuê mới.',a.area_m2,c.monthly_rent,a.bedrooms,a.bathrooms,a.cover_image_path,'HIDDEN','OCCUPIED',SYSUTCDATETIME(),0,@Room,a.floor,d.deposit,a.electricity_index,a.water_index,a.max_occupants,c.electricity_unit_price,c.water_unit_price,a.property_id
   FROM dbo.rental_contracts c JOIN dbo.rental_apartments a ON a.id=c.apartment_id JOIN dbo.contract_drafts d ON d.contract_id=c.id WHERE c.id=5;
  SET @Apartment=CONVERT(bigint,SCOPE_IDENTITY());
  INSERT INTO dbo.rental_requests(message,status,created_at,version,decision_reason,quoted_monthly_rent,apartment_id,customer_id,decided_at)
   SELECT @Marker,'ACCEPTED',SYSUTCDATETIME(),0,N'Hợp đồng mẫu sắp hết hạn được yêu cầu thêm ngày 13/11/2026.',monthly_rent,@Apartment,2,SYSUTCDATETIME() FROM dbo.rental_contracts WHERE id=5;
  SET @Request=CONVERT(bigint,SCOPE_IDENTITY());
  INSERT INTO dbo.rental_contracts(status,start_date,end_date,monthly_rent,electricity_unit_price,water_unit_price,electricity_baseline,water_baseline,baseline_date,billing_version,local_fixture,version,apartment_id,customer_id,water_billing_mode,occupant_count,internet_fee,garbage_fee,activated_at,rent_cycle_months,rent_payment_day,separate_billing_agreed)
   SELECT 'ACTIVE',@Start,@End,monthly_rent,electricity_unit_price,water_unit_price,electricity_baseline,water_baseline,@Start,0,1,0,@Apartment,2,water_billing_mode,occupant_count,internet_fee,garbage_fee,CAST(@Start AS datetime2),rent_cycle_months,rent_payment_day,separate_billing_agreed FROM dbo.rental_contracts WHERE id=5;
  SET @Contract=CONVERT(bigint,SCOPE_IDENTITY());
  DECLARE @Snapshot nvarchar(max)=(SELECT snapshot_json FROM dbo.contract_drafts WHERE contract_id=5);
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.owner.id',CONVERT(nvarchar(30),3));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.owner.fullName',(SELECT full_name FROM dbo.auth_accounts WHERE id=3));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.owner.email',(SELECT email FROM dbo.auth_accounts WHERE id=3));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.customer.id',CONVERT(nvarchar(30),2));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.customer.fullName',(SELECT full_name FROM dbo.auth_accounts WHERE id=2));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.customer.email',(SELECT email FROM dbo.auth_accounts WHERE id=2));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.apartmentId',CONVERT(nvarchar(30),@Apartment));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.propertyId',CONVERT(nvarchar(30),2));
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.title',@Title);
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.roomNumber',@Room);
  SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.localFixture',CAST(1 AS bit));
  -- Reuse only the already-existing LOCAL fixture artwork. It does not attest new content.
  INSERT INTO dbo.contract_drafts(snapshot_json,clauses_json,deposit,payment_day,payment_method,usage_purpose,created_at,content_version,contract_id,rental_request_id,template_type,owner_signature,customer_signature,owner_signed_at,customer_signed_at,signed_content_hash,electricity_baseline,water_baseline)
   SELECT @Snapshot,clauses_json,deposit,payment_day,payment_method,N'[MẪU] Thử gia hạn. Ảnh chữ ký lấy từ mẫu HD-5; không phải chữ ký hay thỏa thuận mới.',SYSUTCDATETIME(),0,@Contract,@Request,COALESCE(template_type,'APARTMENT'),owner_signature,customer_signature,owner_signed_at,customer_signed_at,NULL,electricity_baseline,water_baseline FROM dbo.contract_drafts WHERE contract_id=5;
  SET @Created=1;
 END;
END;
SELECT @Created created,@Apply apply_requested,@Contract contract_id,@Request request_id,@Apartment apartment_id,@Room room_number,
 COALESCE((SELECT start_date FROM dbo.rental_contracts WHERE id=@Contract),@Start) start_date,
 COALESCE((SELECT end_date FROM dbo.rental_contracts WHERE id=@Contract),@End) end_date,
 (SELECT full_name FROM dbo.auth_accounts WHERE id=3) owner_name,
 (SELECT full_name FROM dbo.auth_accounts WHERE id=2) customer_name;
