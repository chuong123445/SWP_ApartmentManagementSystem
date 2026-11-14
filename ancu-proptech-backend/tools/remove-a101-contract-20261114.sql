-- Explicit follow-up consent includes paid invoice and matched SePay history.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'One-off local operation on 14 November 2026 only.',1;
IF NOT EXISTS(SELECT 1 FROM rental_contracts c JOIN rental_apartments a ON a.id=c.apartment_id
 JOIN rental_properties p ON p.id=a.property_id JOIN auth_accounts o ON o.id=p.owner_id JOIN auth_accounts u ON u.id=c.customer_id
 WHERE c.id=14 AND c.status='ACTIVE' AND a.id=4 AND a.room_number='A.101' AND p.owner_id=3 AND c.customer_id=2
 AND o.email='chuongaln@gmail.com' AND u.email='huuha205@gmail.com')
 OR NOT EXISTS(SELECT 1 FROM contract_drafts WHERE id=12 AND contract_id=14 AND rental_request_id=53)
 THROW 51000,'Exact A.101 party/contract/draft guard failed.',1;
IF (SELECT COUNT(*) FROM rental_invoices WHERE contract_id=14)<>2
 OR (SELECT COUNT(*) FROM rental_invoices WHERE contract_id=14 AND id IN(8,9))<>2
 OR NOT EXISTS(SELECT 1 FROM invoice_payments WHERE id=6 AND invoice_id=9 AND amount=19000 AND paid_at IS NOT NULL)
 OR NOT EXISTS(SELECT 1 FROM invoice_payments WHERE id=5 AND invoice_id=8 AND paid_at IS NULL)
 OR (SELECT COUNT(*) FROM invoice_payments WHERE invoice_id IN(8,9))<>2
 OR (SELECT COUNT(*) FROM sepay_events WHERE invoice_id IN(8,9))<>1
 OR NOT EXISTS(SELECT 1 FROM sepay_events WHERE id=3 AND invoice_id=9 AND result='MATCHED' AND amount=19000 AND test_payment_id IS NULL)
 THROW 51000,'Financial scope changed; re-review required.',1;
IF EXISTS(SELECT 1 FROM cash_entries WHERE source_invoice_id IN(8,9))
 OR EXISTS(SELECT 1 FROM settlement_entries WHERE kind='INVOICE' AND source_id IN(8,9))
 OR EXISTS(SELECT 1 FROM billing_meter_readings WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM escrow_deposits WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM sepay_test_payments WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM contract_handovers WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM contract_exit_cases WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM contract_exit_events WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM contract_exit_evidence WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM rental_contracts WHERE renewal_of_contract_id=14)
 OR EXISTS(SELECT 1 FROM contract_renewal_requests WHERE contract_id=14)
 OR EXISTS(SELECT 1 FROM contract_expiry_notices WHERE contract_id=14)
 THROW 51000,'Unexpected dependency, refusing wider deletion.',1;
IF EXISTS(SELECT 1 FROM rental_contracts WHERE apartment_id=4 AND id<>14 AND status IN('ACTIVE','DRAFT'))
 OR EXISTS(SELECT 1 FROM rental_requests WHERE apartment_id=4 AND id<>53 AND status='ACCEPTED')
 THROW 51000,'Another active room selection exists.',1;
DELETE FROM sepay_events WHERE id=3 AND invoice_id=9;
DELETE FROM invoice_payments WHERE invoice_id IN(8,9);
DELETE FROM invoice_events WHERE invoice_id IN(8,9);
DELETE FROM invoice_notifications WHERE invoice_id IN(8,9);
DELETE FROM rental_invoices WHERE contract_id=14 AND id IN(8,9);
DELETE FROM contract_drafts WHERE id=12 AND contract_id=14;
DELETE FROM rental_contracts WHERE id=14;
UPDATE rental_requests SET status='CANCELLED',version=version+1,decision_reason=N'Dọn hợp đồng A.101 theo yêu cầu ngày 14/11/2026, gồm dữ liệu thanh toán liên quan.',decided_at=SYSUTCDATETIME() WHERE id=53 AND status='ACCEPTED';
IF @@ROWCOUNT<>1 THROW 51000,'Expected request 53 not accepted.',1;
UPDATE rental_apartments SET availability='VACANT',version=version+1 WHERE id=4 AND availability='OCCUPIED';
IF @@ROWCOUNT<>1 THROW 51000,'Expected A.101 occupied.',1;
SELECT COUNT(*) remaining_contracts FROM rental_contracts;
