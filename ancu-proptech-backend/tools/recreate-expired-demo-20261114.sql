-- One-off user-authorized replacement of completed handover demo 27 only.
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'Local date/database guard.',1;
IF NOT EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id
 WHERE c.id=27 AND c.status='ENDED' AND c.local_fixture=1 AND c.customer_id=2 AND c.end_date='20261112' AND a.id=16 AND a.room_number='HH205.TEST' AND a.availability='VACANT' AND p.owner_id=3)
 OR NOT EXISTS(SELECT 1 FROM contract_exit_cases WHERE contract_id=27 AND handover_state='CONFIRMED' AND owner_signed_at IS NOT NULL AND customer_signed_at IS NOT NULL)
 OR NOT EXISTS(SELECT 1 FROM contract_drafts WHERE contract_id=27 AND rental_request_id=66 AND owner_signature IS NOT NULL AND customer_signature IS NOT NULL)
 THROW 51000,'Completed sample guard failed.',1;
IF EXISTS(SELECT 1 FROM rental_invoices WHERE contract_id=27)
 OR EXISTS(SELECT 1 FROM escrow_deposits WHERE contract_id=27)
 OR EXISTS(SELECT 1 FROM sepay_test_payments WHERE contract_id=27)
 OR EXISTS(SELECT 1 FROM rental_contracts WHERE renewal_of_contract_id=27 OR (apartment_id=16 AND id<>27 AND status IN('ACTIVE','DRAFT')))
 OR EXISTS(SELECT 1 FROM rental_requests WHERE apartment_id=16 AND id<>66 AND status='ACCEPTED')
 THROW 51000,'Unexpected financial/selection dependency.',1;
SELECT * INTO #SourceContract FROM rental_contracts WHERE id=27;
SELECT * INTO #SourceDraft FROM contract_drafts WHERE contract_id=27;
DELETE FROM contract_exit_evidence WHERE contract_id=27;
DELETE FROM contract_exit_events WHERE contract_id=27;
DELETE FROM contract_exit_cases WHERE contract_id=27;
DELETE FROM contract_handovers WHERE contract_id=27;
DELETE FROM contract_renewal_requests WHERE contract_id=27;
DELETE FROM contract_expiry_notices WHERE contract_id=27;
DELETE FROM billing_meter_readings WHERE contract_id=27;
DELETE FROM contract_drafts WHERE contract_id=27;
DELETE FROM rental_contracts WHERE id=27;
UPDATE rental_requests SET status='CANCELLED',version=version+1,decided_at=SYSUTCDATETIME(),decision_reason=N'Tạo lại mẫu hết hạn chưa bàn giao theo yêu cầu ngày 14/11/2026.' WHERE id=66 AND status='ACCEPTED';
IF @@ROWCOUNT<>1 THROW 51000,'Original request guard.',1;
DECLARE @i int=0,@Apartment bigint,@Request bigint,@Contract bigint,@End date,@Start date,@Snapshot nvarchar(max);
DECLARE @Result TABLE(contract_id bigint,apartment_id bigint,request_id bigint,end_date date,scenario varchar(20));
WHILE @i<1
BEGIN
 SET @Apartment=16;
 SET @End=CONVERT(date,'20261112');
 SET @Start=DATEADD(month,-3,@End);
 INSERT INTO rental_requests(message,status,created_at,version,decision_reason,quoted_monthly_rent,apartment_id,customer_id,decided_at)
  SELECT CONCAT('LOCAL-DEMO-HANDOVER-RECREATE-20261114-',@i),'ACCEPTED',SYSUTCDATETIME(),0,N'Mẫu demo mới theo yêu cầu ngày 14/11/2026.',monthly_rent,@Apartment,2,SYSUTCDATETIME() FROM #SourceContract;
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
  SELECT @Snapshot,clauses_json,deposit,payment_day,payment_method,N'[MẪU] Demo gia hạn/bàn giao. Ảnh chữ ký từ mẫu local HD-27; không phải chữ ký hay thỏa thuận mới.',SYSUTCDATETIME(),0,@Contract,@Request,template_type,owner_signature,customer_signature,owner_signed_at,customer_signed_at,NULL,electricity_baseline,water_baseline FROM #SourceDraft;
 UPDATE rental_apartments SET availability='OCCUPIED',version=version+1 WHERE id=@Apartment;
 INSERT INTO @Result VALUES(@Contract,@Apartment,@Request,@End,'EXPIRED_NO_HANDOVER');
 SET @i=@i+1;
END;
IF EXISTS(SELECT 1 FROM contract_exit_cases WHERE contract_id=@Contract) OR EXISTS(SELECT 1 FROM contract_handovers WHERE contract_id=@Contract)
 THROW 51000,'New sample must not have handover.',1;
SELECT * FROM @Result;
