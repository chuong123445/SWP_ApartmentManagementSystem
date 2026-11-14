-- One-off local demo cleanup; wrapper supplies serializable transaction/backup.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'Only the explicitly requested local operation on 14 November 2026.',1;
IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=2 AND email='huuha205@gmail.com')
 OR NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=3 AND email='chuongaln@gmail.com')
 THROW 51000,'Party guard failed.',1;
IF (SELECT COUNT(*) FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id JOIN rental_properties p ON p.id=a.property_id
 WHERE c.id IN(5,15,18) AND c.customer_id=2 AND p.owner_id=3 AND
 ((c.id=5 AND a.id=17 AND a.room_number='HH205.D10' AND c.local_fixture=1 AND c.status='ACTIVE')
 OR(c.id IN(15,18) AND a.id=13 AND a.room_number='T.101' AND c.status IN('ACTIVE','CANCELLED'))))<>3
 THROW 51000,'Target contract guard failed; do not rerun after apply.',1;
IF NOT EXISTS(SELECT 1 FROM contract_renewal_requests WHERE id=3 AND contract_id=5 AND status='ACCEPTED')
 THROW 51000,'Expected old accepted renewal missing.',1;
IF EXISTS(SELECT 1 FROM rental_invoices WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM billing_meter_readings WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM escrow_deposits WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM sepay_test_payments WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM contract_handovers WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM contract_exit_cases WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM contract_exit_events WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM contract_exit_evidence WHERE contract_id IN(5,15,18))
 OR EXISTS(SELECT 1 FROM rental_contracts WHERE renewal_of_contract_id IN(5,15,18))
 THROW 51000,'Unexpected financial/lifecycle dependency; no deletion allowed.',1;
IF (SELECT COUNT(*) FROM contract_drafts WHERE contract_id IN(5,15,18) AND rental_request_id IN(40,54,57))<>3
 OR EXISTS(SELECT 1 FROM rental_requests WHERE apartment_id IN(13,17) AND status='ACCEPTED' AND id NOT IN(40,57))
 THROW 51000,'Request/draft guard failed.',1;
IF EXISTS(SELECT 1 FROM rental_requests WHERE message='LOCAL-HH205-RENEWAL-20261114')
 THROW 51000,'New sample already exists.',1;

DECLARE @Request bigint,@Contract bigint,@End date='20261121',@Start date='20260821';
INSERT INTO rental_requests(message,status,created_at,version,decision_reason,quoted_monthly_rent,apartment_id,customer_id,decided_at)
 SELECT 'LOCAL-HH205-RENEWAL-20261114','ACCEPTED',SYSUTCDATETIME(),0,N'Mẫu gia hạn theo yêu cầu ngày 14/11/2026.',monthly_rent,17,2,SYSUTCDATETIME() FROM rental_contracts WHERE id=5;
SET @Request=CONVERT(bigint,SCOPE_IDENTITY());
-- Release the filtered active-apartment uniqueness slot within this transaction.
UPDATE rental_contracts SET status='CANCELLED' WHERE id=5;
INSERT INTO rental_contracts(status,start_date,end_date,monthly_rent,electricity_unit_price,water_unit_price,electricity_baseline,water_baseline,baseline_date,billing_version,local_fixture,version,apartment_id,customer_id,water_billing_mode,occupant_count,internet_fee,garbage_fee,activated_at,rent_cycle_months,rent_payment_day,separate_billing_agreed)
 SELECT 'ACTIVE',@Start,@End,monthly_rent,electricity_unit_price,water_unit_price,electricity_baseline,water_baseline,@Start,0,1,0,17,2,water_billing_mode,occupant_count,internet_fee,garbage_fee,CAST(@Start AS datetime2),rent_cycle_months,rent_payment_day,separate_billing_agreed FROM rental_contracts WHERE id=5;
SET @Contract=CONVERT(bigint,SCOPE_IDENTITY());
-- Only pre-existing LOCAL sample artwork is reused. No new real signature claim.
INSERT INTO contract_drafts(snapshot_json,clauses_json,deposit,payment_day,payment_method,usage_purpose,created_at,content_version,contract_id,rental_request_id,template_type,owner_signature,customer_signature,owner_signed_at,customer_signed_at,signed_content_hash,electricity_baseline,water_baseline)
 SELECT JSON_MODIFY(snapshot_json,'$.asset.localFixture',CAST(1 AS bit)),clauses_json,deposit,payment_day,payment_method,
 N'[MẪU] Thử gia hạn ngày 14/11/2026. Ảnh chữ ký từ mẫu HD-5, không phải chữ ký/thỏa thuận mới.',SYSUTCDATETIME(),0,@Contract,@Request,COALESCE(template_type,'APARTMENT'),owner_signature,customer_signature,owner_signed_at,customer_signed_at,NULL,electricity_baseline,water_baseline FROM contract_drafts WHERE contract_id=5;
INSERT INTO contract_renewal_requests(contract_id,status,message,created_at,version)
 VALUES(@Contract,'PENDING',N'[MẪU] Tôi muốn thuê tiếp căn HH205.D10 sau khi hợp đồng hết hạn. Nhờ chủ nhà xem xét gia hạn.',SYSUTCDATETIME(),0);
DECLARE @Renewal bigint=CONVERT(bigint,SCOPE_IDENTITY());
DELETE FROM contract_expiry_notices WHERE contract_id IN(5,15,18);
DELETE FROM contract_renewal_requests WHERE contract_id IN(5,15,18);
DELETE FROM contract_drafts WHERE contract_id IN(5,15,18);
DELETE FROM rental_contracts WHERE id IN(5,15,18);
-- Preserve request/cancellation history and conversations; release only this room.
UPDATE rental_requests SET status='CANCELLED',version=version+1,decision_reason=N'Dọn hợp đồng demo theo yêu cầu ngày 14/11/2026.',decided_at=SYSUTCDATETIME() WHERE id IN(40,57) AND status='ACCEPTED';
IF EXISTS(SELECT 1 FROM rental_contracts WHERE apartment_id=13 AND status IN('ACTIVE','DRAFT'))
 OR EXISTS(SELECT 1 FROM rental_requests WHERE apartment_id=13 AND status='ACCEPTED')
 THROW 51000,'Cannot release T.101: another open selection exists.',1;
UPDATE rental_apartments SET availability='VACANT',version=version+1 WHERE id=13 AND availability='OCCUPIED';
IF @@ROWCOUNT<>1 THROW 51000,'T.101 availability guard failed.',1;
IF NOT EXISTS(SELECT 1 FROM rental_contracts WHERE id=4 AND status='ENDED' AND end_date='20261031')
 THROW 51000,'Expired sample must remain unchanged.',1;
SELECT @Contract contract_id,@Request request_id,@Renewal renewal_request_id,@Start start_date,@End end_date,'PENDING' renewal_status;
