-- User-authorized removal of the latest asset of Nguyen Van Chuong, local only.
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'Local one-off date/database guard.',1;
IF NOT EXISTS(SELECT 1 FROM rental_properties p JOIN auth_accounts a ON a.id=p.owner_id WHERE p.id=25 AND p.name=N'An Cư 01 - Linh Trung' AND p.owner_id=3 AND a.email='chuongaln@gmail.com' AND p.approval_status='APPROVED')
 OR (SELECT MAX(id) FROM rental_properties WHERE owner_id=3)<>25
 OR NOT EXISTS(SELECT 1 FROM rental_apartments WHERE id=31 AND property_id=25 AND room_number='P.101' AND availability='VACANT' AND publication_status='DRAFT')
 OR (SELECT COUNT(*) FROM rental_apartments WHERE property_id=25)<>1
 OR NOT EXISTS(SELECT 1 FROM property_listing_drafts WHERE property_id=25 AND account_id=3 AND completed=1)
 THROW 51000,'Exact reviewed latest property guard failed.',1;
DECLARE @Guard nvarchar(max)=N'';
SELECT @Guard=@Guard+N'IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(t.name)+N' WHERE property_id=25) THROW 51000,''Unexpected property dependency: '+t.name+N''',1;'
 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id AND c.name='property_id'
 WHERE t.name NOT IN('property_listing_drafts','rental_apartments','property_dossiers','property_evidence_files','property_document_checks','property_images','ai_assistance_runs');
SELECT @Guard=@Guard+N'IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(t.name)+N' WHERE apartment_id=31) THROW 51000,''Unexpected apartment dependency: '+t.name+N''',1;'
 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id AND c.name='apartment_id'
 WHERE t.name NOT IN('property_images','rental_apartment_amenities');
EXEC sp_executesql @Guard;
IF (SELECT COUNT(*) FROM property_dossiers WHERE property_id=25)<>1
 OR (SELECT COUNT(*) FROM property_evidence_files WHERE property_id=25)<>1
 OR (SELECT COUNT(*) FROM property_document_checks WHERE property_id=25)<>1
 OR (SELECT COUNT(*) FROM property_images WHERE property_id=25)<>2
 OR (SELECT COUNT(*) FROM ai_assistance_runs WHERE property_id=25)<>2
 OR EXISTS(SELECT 1 FROM property_dossier_files WHERE file_id IN(SELECT id FROM property_evidence_files WHERE property_id=25) AND dossier_id NOT IN(SELECT id FROM property_dossiers WHERE property_id=25))
 THROW 51000,'Reviewed dossier/evidence scope changed or shared.',1;
DELETE FROM property_images WHERE property_id=25;
DELETE FROM rental_apartment_amenities WHERE apartment_id=31;
DELETE FROM rental_apartments WHERE id=31 AND property_id=25;
DELETE FROM property_document_checks WHERE property_id=25;
DELETE FROM property_dossier_files WHERE dossier_id IN(SELECT id FROM property_dossiers WHERE property_id=25);
DELETE FROM property_dossier_ai_reviews WHERE dossier_id IN(SELECT id FROM property_dossiers WHERE property_id=25);
DELETE FROM property_dossiers WHERE property_id=25;
DELETE FROM property_evidence_content WHERE id IN(SELECT id FROM property_evidence_files WHERE property_id=25);
DELETE FROM property_evidence_files WHERE property_id=25;
DELETE FROM ai_assistance_runs WHERE property_id=25;
DELETE FROM property_listing_drafts WHERE property_id=25 AND account_id=3;
DELETE FROM rental_properties WHERE id=25 AND owner_id=3;
IF @@ROWCOUNT<>1 THROW 51000,'Expected one property deleted.',1;
SELECT (SELECT COUNT(*) FROM rental_properties WHERE id=25) remaining_property,
 (SELECT COUNT(*) FROM rental_apartments WHERE id=31) remaining_apartment,
 (SELECT COUNT(*) FROM rental_contracts) contracts_preserved,(SELECT COUNT(*) FROM rental_invoices) invoices_preserved;
