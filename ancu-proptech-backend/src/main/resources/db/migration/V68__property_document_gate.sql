IF OBJECT_ID('dbo.property_document_checks','U') IS NULL
BEGIN
 CREATE TABLE dbo.property_document_checks (
  file_id bigint NOT NULL PRIMARY KEY REFERENCES dbo.property_evidence_files(id),
  property_id bigint NOT NULL REFERENCES dbo.rental_properties(id),
  purpose varchar(24) NOT NULL,
  accepted bit NOT NULL,
  scan_token varchar(36) NOT NULL,
  checked_at datetime2(6) NOT NULL,
  version bigint NOT NULL DEFAULT 0
 );
END;
GO
IF COL_LENGTH('dbo.property_document_checks','scan_token') IS NULL
BEGIN
 ALTER TABLE dbo.property_document_checks ADD scan_token varchar(36) NULL;
END;
GO
UPDATE dbo.property_document_checks SET scan_token=CONVERT(varchar(36),NEWID()) WHERE scan_token IS NULL;
GO
ALTER TABLE dbo.property_document_checks ALTER COLUMN scan_token varchar(36) NOT NULL;
GO
