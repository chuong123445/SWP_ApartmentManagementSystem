-- Explicit user reset: all contracts/invoices, recreate two local signed samples.
-- Wrapper owns serializable transaction, backup and preservation checks.
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'Local one-off date/database guard.',1;
IF (SELECT COUNT(*) FROM rental_contracts)<>3 OR (SELECT COUNT(*) FROM rental_contracts WHERE id IN(4,21,23) AND customer_id=2 AND local_fixture=1)<>3
 OR EXISTS(SELECT 1 FROM rental_invoices)
 THROW 51000,'Reviewed scope changed: expected three local contracts and zero invoices.',1;
IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=2 AND email='huuha205@gmail.com')
 OR NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=3 AND email='chuongaln@gmail.com')
 OR (SELECT COUNT(*) FROM rental_apartments a JOIN rental_properties p ON p.id=a.property_id WHERE a.id IN(16,17,30) AND p.id=2 AND p.owner_id=3 AND p.approval_status='APPROVED' AND a.publication_status='HIDDEN')<>3
 THROW 51000,'Party/property/private fixture guard.',1;
IF (SELECT COUNT(*) FROM contract_drafts WHERE contract_id IN(4,21,23) AND rental_request_id IN(39,60,62))<>3
 OR NOT EXISTS(SELECT 1 FROM contract_drafts WHERE contract_id=23 AND owner_signature IS NOT NULL AND customer_signature IS NOT NULL AND ISJSON(snapshot_json)=1 AND ISJSON(clauses_json)=1)
 OR EXISTS(SELECT 1 FROM rental_requests WHERE apartment_id IN(16,17,30) AND status='ACCEPTED' AND id NOT IN(39,60,62))
 THROW 51000,'Draft/source/request guard.',1;
IF EXISTS(SELECT 1 FROM escrow_deposits WHERE contract_id IN(4,21,23))
 OR EXISTS(SELECT 1 FROM sepay_test_payments WHERE contract_id IN(4,21,23))
 THROW 51000,'Unexpected escrow/provider financial dependency.',1;
SELECT * INTO #SourceContract FROM rental_contracts WHERE id=23;
SELECT * INTO #SourceDraft FROM contract_drafts WHERE contract_id=23;
DELETE FROM contract_exit_evidence WHERE contract_id IN(4,21,23);
DELETE FROM contract_exit_events WHERE contract_id IN(4,21,23);
DELETE FROM contract_exit_cases WHERE contract_id IN(4,21,23);
DELETE FROM contract_handovers WHERE contract_id IN(4,21,23);
DELETE FROM contract_renewal_requests WHERE contract_id IN(4,21,23);
DELETE FROM contract_expiry_notices WHERE contract_id IN(4,21,23);
DELETE FROM billing_meter_readings WHERE contract_id IN(4,21,23);
DELETE FROM contract_drafts WHERE contract_id IN(4,21,23);
DELETE FROM rental_contracts WHERE id IN(4,21,23);
UPDATE rental_requests SET status='CANCELLED',version=version+1,decided_at=SYSUTCDATETIME(),decision_reason=N'Dọn toàn bộ hợp đồng để tạo lại hai tình huống demo ngày 14/11/2026.' WHERE id IN(39,60,62) AND status='ACCEPTED';
UPDATE rental_apartments SET availability='VACANT',version=version+1 WHERE id IN(16,17,30);

DECLARE @i int=0,@Apartment bigint,@Request bigint,@Contract bigint,@End date,@Start date,@Snapshot nvarchar(max);
DECLARE @Result TABLE(contract_id bigint,apartment_id bigint,request_id bigint,end_date date,scenario varchar(20));
WHILE @i<2
BEGIN
 SET @Apartment=CASE WHEN @i=0 THEN 30 ELSE 16 END;
 SET @End=CASE WHEN @i=0 THEN CONVERT(date,'20261121') ELSE CONVERT(date,'20261112') END;
 SET @Start=DATEADD(month,-3,@End);
 INSERT INTO rental_requests(message,status,created_at,version,decision_reason,quoted_monthly_rent,apartment_id,customer_id,decided_at)
  SELECT CONCAT('LOCAL-DEMO-RESET-20261114-',@i),'ACCEPTED',SYSUTCDATETIME(),0,N'Mẫu demo mới theo yêu cầu ngày 14/11/2026.',monthly_rent,@Apartment,2,SYSUTCDATETIME() FROM #SourceContract;
 SET @Request=CONVERT(bigint,SCOPE_IDENTITY());
 -- ACTIVE + past end_date is intentionally awaiting handover, never ENDED yet.
 INSERT INTO rental_contracts(status,start_date,end_date,monthly_rent,electricity_unit_price,water_unit_price,electricity_baseline,water_baseline,baseline_date,billing_version,local_fixture,version,apartment_id,customer_id,water_billing_mode,occupant_count,internet_fee,garbage_fee,activated_at,rent_cycle_months,rent_payment_day,separate_billing_agreed)
  SELECT 'ACTIVE',@Start,@End,monthly_rent,electricity_unit_price,water_unit_price,electricity_baseline,water_baseline,@Start,0,1,0,@Apartment,2,water_billing_mode,occupant_count,internet_fee,garbage_fee,CAST(@Start AS datetime2),rent_cycle_months,rent_payment_day,separate_billing_agreed FROM #SourceContract;
 SET @Contract=CONVERT(bigint,SCOPE_IDENTITY());
 SET @Snapshot=(SELECT snapshot_json FROM #SourceDraft);
 SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.apartmentId',CONVERT(nvarchar(30),@Apartment));
 SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.title',(SELECT title FROM rental_apartments WHERE id=@Apartment));
 SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.roomNumber',(SELECT room_number FROM rental_apartments WHERE id=@Apartment));
 SET @Snapshot=JSON_MODIFY(@Snapshot,'$.asset.localFixture',CAST(1 AS bit));
 INSERT INTO contract_drafts(snapshot_json,clauses_json,deposit,payment_day,payment_method,usage_purpose,created_at,content_version,contract_id,rental_request_id,template_type,owner_signature,customer_signature,owner_signed_at,customer_signed_at,signed_content_hash,electricity_baseline,water_baseline)
  SELECT @Snapshot,clauses_json,deposit,payment_day,payment_method,N'[MẪU] Demo gia hạn/bàn giao. Ảnh chữ ký từ mẫu local HD-23; không phải chữ ký hay thỏa thuận mới.',SYSUTCDATETIME(),0,@Contract,@Request,template_type,owner_signature,customer_signature,owner_signed_at,customer_signed_at,NULL,electricity_baseline,water_baseline FROM #SourceDraft;
 UPDATE rental_apartments SET availability='OCCUPIED',version=version+1 WHERE id=@Apartment;
 INSERT INTO @Result VALUES(@Contract,@Apartment,@Request,@End,CASE WHEN @i=0 THEN 'NEAR_EXPIRY' ELSE 'EXPIRED_NO_HANDOVER' END);
 SET @i=@i+1;
END;
IF (SELECT COUNT(*) FROM rental_contracts)<>2 OR EXISTS(SELECT 1 FROM rental_invoices)
 OR EXISTS(SELECT 1 FROM contract_handovers) OR EXISTS(SELECT 1 FROM contract_exit_cases)
 OR EXISTS(SELECT 1 FROM contract_exit_events) OR EXISTS(SELECT 1 FROM contract_exit_evidence)
 OR EXISTS(SELECT 1 FROM contract_renewal_requests)
 THROW 51000,'Reset invariant failed: expected two clean samples only.',1;
SELECT * FROM @Result ORDER BY end_date;
