SET XACT_ABORT ON;
SET NOCOUNT ON;
IF DB_NAME() <> N'proptech_db' THROW 51000,'Local demo database only.',1;

DECLARE @today date=CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time');
IF (SELECT COUNT(*) FROM dbo.rental_contracts WHERE id IN(4,5) AND customer_id=2 AND status='ACTIVE')<>2
    THROW 51000,'Expected the two Huu Ha contracts. Audit again.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.auth_accounts WHERE id=2 AND email='huuha205@gmail.com')
    THROW 51000,'Unexpected Huu Ha account.',1;
IF NOT EXISTS(SELECT 1 FROM dbo.rental_contracts WHERE id=4 AND end_date<@today)
 OR NOT EXISTS(SELECT 1 FROM dbo.rental_contracts WHERE id=5 AND end_date BETWEEN @today AND DATEADD(day,10,@today))
    THROW 51000,'Retained expiry dates no longer suit the demo. Audit again.',1;
IF (SELECT COUNT(*) FROM dbo.contract_drafts WHERE contract_id IN(4,5) AND owner_signature IS NOT NULL AND customer_signature IS NOT NULL)<>2
    THROW 51000,'Expected signed retained drafts.',1;
IF EXISTS(SELECT 1 FROM dbo.rental_contracts WHERE id NOT IN(1,2,3,4,5,6,7,10,12,13))
    THROW 51000,'A new contract was added since the audit. Audit again.',1;

SELECT id INTO #removeContracts FROM dbo.rental_contracts WHERE id NOT IN(4,5);
SELECT rental_request_id id INTO #keepRequests FROM dbo.contract_drafts WHERE contract_id IN(4,5);
SELECT id INTO #removeRequests FROM dbo.rental_requests WHERE id NOT IN(SELECT id FROM #keepRequests);
SELECT id INTO #removeInvoices FROM dbo.rental_invoices WHERE contract_id IN(SELECT id FROM #removeContracts);
SELECT id INTO #removeTestPayments FROM dbo.sepay_test_payments WHERE contract_id IN(SELECT id FROM #removeContracts);
SELECT DISTINCT owner_id INTO #affectedBalanceOwners FROM dbo.invoice_payments
 WHERE invoice_id IN(SELECT id FROM #removeInvoices) AND paid_at IS NOT NULL;

-- Keep signed snapshots, dates and all children of the two retained contracts intact.
DECLARE @keptBefore nvarchar(max)=(SELECT * FROM dbo.contract_drafts WHERE contract_id IN(4,5) ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES);

DELETE FROM dbo.sepay_events WHERE invoice_id IN(SELECT id FROM #removeInvoices) OR test_payment_id IN(SELECT id FROM #removeTestPayments);
-- Explicitly authorized local demo withdrawal cleanup for owners losing paid invoice history.
DELETE FROM dbo.owner_withdrawals WHERE owner_id IN(SELECT owner_id FROM #affectedBalanceOwners);
DELETE FROM dbo.invoice_payments WHERE invoice_id IN(SELECT id FROM #removeInvoices);
DELETE FROM dbo.cash_entries WHERE source_invoice_id IN(SELECT id FROM #removeInvoices);
DELETE FROM dbo.invoice_events WHERE invoice_id IN(SELECT id FROM #removeInvoices);
DELETE FROM dbo.invoice_notifications WHERE invoice_id IN(SELECT id FROM #removeInvoices);
DELETE FROM dbo.rental_invoices WHERE id IN(SELECT id FROM #removeInvoices);
DELETE FROM dbo.sepay_test_payments WHERE id IN(SELECT id FROM #removeTestPayments);
DELETE FROM dbo.billing_meter_readings WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.contract_renewal_requests WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.contract_expiry_notices WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.contract_exit_evidence WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.contract_exit_events WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.contract_exit_cases WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.contract_handovers WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.escrow_deposits WHERE TRY_CONVERT(bigint,contract_id) IN(SELECT id FROM #removeContracts)
 OR contract_id IN(SELECT CONCAT('HD-',id) FROM #removeContracts);
DELETE FROM dbo.selection_cancellation_events WHERE request_id IN(SELECT id FROM #removeRequests);
DELETE FROM dbo.selection_cancellations WHERE request_id IN(SELECT id FROM #removeRequests);
DELETE FROM dbo.contract_drafts WHERE contract_id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.rental_contracts WHERE id IN(SELECT id FROM #removeContracts);
DELETE FROM dbo.rental_requests WHERE id IN(SELECT id FROM #removeRequests);

UPDATE dbo.rental_apartments SET max_occupants=CASE WHEN area_m2<25 THEN 1 WHEN area_m2<40 THEN 2 ELSE 3 END,version=version+1
 WHERE max_occupants IS NULL OR max_occupants<1;

-- A1205 has no uploaded room photos. Use an existing interior asset for this local demo.
UPDATE a SET cover_image_path='/apartment/images/apartment4.jpg',version=a.version+1
FROM dbo.rental_apartments a
WHERE a.id=14 AND a.property_id=8 AND a.room_number='A1205'
 AND (a.cover_image_path IS NULL OR LTRIM(RTRIM(a.cover_image_path))='' OR a.cover_image_path='/images/apartment-placeholder.svg')
 AND NOT EXISTS(SELECT 1 FROM dbo.property_images i WHERE i.apartment_id=a.id);

-- Only already-approved assets with currently effective rights can be published.
UPDATE a SET availability='VACANT',publication_status='PUBLISHED',version=a.version+1
FROM dbo.rental_apartments a JOIN dbo.rental_properties p ON p.id=a.property_id
WHERE NOT EXISTS(SELECT 1 FROM dbo.rental_contracts c WHERE c.apartment_id=a.id)
 AND p.approval_status='APPROVED'
 AND (p.right_type IS NULL OR p.right_type='OWNERSHIP' OR @today BETWEEN p.rights_valid_from AND p.rights_valid_until)
 AND (a.availability<>'VACANT' OR a.publication_status<>'PUBLISHED');

IF (SELECT COUNT(*) FROM dbo.rental_contracts)<>2 OR (SELECT COUNT(*) FROM dbo.rental_requests)<>2
    THROW 51000,'Unexpected remaining rental records.',1;
IF EXISTS(SELECT 1 FROM dbo.rental_apartments WHERE max_occupants IS NULL OR max_occupants<1)
    THROW 51000,'Missing room capacity.',1;
IF @keptBefore<>(SELECT * FROM dbo.contract_drafts WHERE contract_id IN(4,5) ORDER BY id FOR JSON PATH,INCLUDE_NULL_VALUES)
    THROW 51000,'A retained signed draft changed.',1;
IF (SELECT COUNT(*) FROM dbo.rental_apartments WHERE availability='OCCUPIED' AND id IN(16,17))<>2
    THROW 51000,'Unexpected retained apartment availability.',1;

SELECT 'contracts' result,COUNT(*) records FROM dbo.rental_contracts
UNION ALL SELECT 'requests',COUNT(*) FROM dbo.rental_requests
UNION ALL SELECT 'missingCapacity',COUNT(*) FROM dbo.rental_apartments WHERE max_occupants IS NULL OR max_occupants<1
UNION ALL SELECT 'publicVacant',COUNT(*) FROM dbo.rental_apartments WHERE availability='VACANT' AND publication_status='PUBLISHED';
SELECT c.id,c.apartment_id,c.customer_id,c.status,c.start_date,c.end_date FROM dbo.rental_contracts c ORDER BY c.id;
SELECT a.id,a.room_number,a.area_m2,a.max_occupants,a.availability,a.publication_status,p.approval_status,a.cover_image_path
 FROM dbo.rental_apartments a JOIN dbo.rental_properties p ON p.id=a.property_id ORDER BY a.id;
