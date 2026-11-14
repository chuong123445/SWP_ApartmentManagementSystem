-- Explicit one-off deletion of all reviewed incomplete listing dossiers, not leases.
SET NOCOUNT ON; SET XACT_ABORT ON;
IF DB_NAME()<>'proptech_db' OR CONVERT(date,SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time')<>'20261114'
 THROW 51000,'One-off local date/database guard.',1;
CREATE TABLE #Targets(id bigint PRIMARY KEY);
INSERT INTO #Targets VALUES(11),(13),(14),(15),(16),(17),(19),(20),(21),(22),(23);
IF NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=3 AND email='chuongaln@gmail.com')
 OR (SELECT COUNT(*) FROM property_listing_drafts WHERE account_id=3 AND completed=0)<>11
 OR (SELECT COUNT(*) FROM property_listing_drafts d JOIN rental_properties p ON p.id=d.property_id JOIN #Targets t ON t.id=p.id
     WHERE d.account_id=3 AND d.completed=0 AND p.owner_id=3 AND p.approval_status='DRAFT')<>11
 THROW 51000,'Reviewed incomplete draft scope changed.',1;
-- Any apartment, submitted dossier, financial entry, imported asset or other
-- dependency blocks deletion. Never cascade into completed/published resources.
DECLARE @Guard nvarchar(max)=N'';
SELECT @Guard=@Guard+N'IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(t.name)+N' WHERE property_id IN(SELECT id FROM #Targets)) THROW 51000,''Unexpected property dependency: '+t.name+N''',1;'
 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id AND c.name='property_id'
 WHERE t.name NOT IN('property_listing_drafts','property_evidence_files','property_document_checks','ai_assistance_runs');
EXEC sp_executesql @Guard;
IF EXISTS(SELECT 1 FROM property_dossier_files WHERE file_id IN(SELECT f.id FROM property_evidence_files f JOIN #Targets t ON t.id=f.property_id))
 OR EXISTS(SELECT 1 FROM property_evidence_files WHERE property_id IN(SELECT id FROM #Targets) AND uploader_id<>3)
 THROW 51000,'Evidence is submitted/shared or belongs to another uploader.',1;
IF (SELECT COUNT(*) FROM property_evidence_files WHERE property_id IN(SELECT id FROM #Targets))<>12
 OR (SELECT COUNT(*) FROM property_document_checks WHERE property_id IN(SELECT id FROM #Targets))<>4
 OR (SELECT COUNT(*) FROM ai_assistance_runs WHERE property_id IN(SELECT id FROM #Targets))<>23
 THROW 51000,'Reviewed evidence/scan counts changed.',1;
DELETE FROM property_document_checks WHERE property_id IN(SELECT id FROM #Targets);
DELETE FROM property_evidence_content WHERE id IN(SELECT id FROM property_evidence_files WHERE property_id IN(SELECT id FROM #Targets));
DELETE FROM property_evidence_files WHERE property_id IN(SELECT id FROM #Targets);
DELETE FROM ai_assistance_runs WHERE property_id IN(SELECT id FROM #Targets);
DELETE FROM property_listing_drafts WHERE property_id IN(SELECT id FROM #Targets) AND account_id=3 AND completed=0;
DELETE FROM rental_properties WHERE id IN(SELECT id FROM #Targets) AND owner_id=3 AND approval_status='DRAFT';
IF @@ROWCOUNT<>11 THROW 51000,'Expected eleven empty draft properties deleted.',1;
SELECT (SELECT COUNT(*) FROM property_listing_drafts WHERE account_id=3 AND completed=0) remaining_incomplete,
 (SELECT COUNT(*) FROM property_listing_drafts WHERE account_id=3 AND completed=1) completed_preserved,
 (SELECT COUNT(*) FROM rental_contracts) contracts_preserved,(SELECT COUNT(*) FROM rental_invoices) invoices_preserved;
