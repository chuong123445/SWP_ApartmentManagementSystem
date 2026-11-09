IF COL_LENGTH('dbo.contract_exit_cases','document_json') IS NULL
BEGIN
 ALTER TABLE dbo.contract_exit_cases ADD document_json nvarchar(max) NULL, document_hash varchar(64) NULL,
 owner_signature varbinary(max) NULL, customer_signature varbinary(max) NULL,
 owner_signed_at datetime2(6) NULL, customer_signed_at datetime2(6) NULL;
END;
GO
