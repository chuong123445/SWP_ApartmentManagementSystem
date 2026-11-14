-- Presentation-only cleanup. Keep internal payment codes/source/audit metadata.
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET CONCAT_NULL_YIELDS_NULL ON; SET ARITHABORT ON; SET NUMERIC_ROUNDABORT OFF;
IF DB_NAME()<>'proptech_db' OR NOT EXISTS(SELECT 1 FROM rental_contracts WHERE id=29 AND local_fixture=1 AND rent_cycle_months=6 AND start_date='20250901' AND end_date='20261031')
 OR (SELECT COUNT(*) FROM rental_invoices WHERE contract_id=29 AND id IN(16,17,18))<>3
 THROW 51000,'Expected local contract/invoices not found.',1;
UPDATE rental_apartments SET title=N'Căn hộ HH205.TEST',version=version+1 WHERE id=16;
UPDATE contract_drafts SET usage_purpose=N'Thuê căn hộ để ở.',content_version=content_version+1,
 snapshot_json=JSON_MODIFY(snapshot_json,'$.asset.title',N'Căn hộ HH205.TEST') WHERE contract_id=29 AND signed_content_hash IS NULL;
IF @@ROWCOUNT<>1 THROW 51000,'Expected illustrative draft with no content attestation.',1;
-- Retain old audit wording as metadata, replace only the displayed reason/title.
UPDATE invoice_events SET after_json=JSON_MODIFY(JSON_MODIFY(after_json,'$.fixtureOriginalReason',reason),'$.apartmentTitle',N'Căn hộ HH205.TEST'),
 before_json=CASE WHEN before_json IS NULL THEN NULL ELSE JSON_MODIFY(before_json,'$.apartmentTitle',N'Căn hộ HH205.TEST') END,
 reason=CASE WHEN action='CREATED' THEN N'Lập hóa đơn tiền phòng theo chu kỳ hợp đồng.' ELSE N'Ghi nhận đã thanh toán tiền phòng.' END
 WHERE invoice_id IN(16,17,18) AND reason LIKE N'[[]LOCAL_DEMO]%';
IF @@ROWCOUNT<>6 THROW 51000,'Audit presentation scope changed; refusing rerun.',1;
SELECT COUNT(*) invoices,SUM(total_amount) total FROM rental_invoices WHERE contract_id=29;
