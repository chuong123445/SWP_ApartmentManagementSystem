-- Additive: historical evidence and saved contract snapshots are not rewritten.
-- Phone is an ordinary account field. Any legacy identity phone column is left unused, never dropped.
IF COL_LENGTH('dbo.auth_external_identities','document_issue_date') IS NULL
    ALTER TABLE dbo.auth_external_identities ADD document_issue_date date NULL;
GO
IF COL_LENGTH('dbo.auth_external_identities','document_issue_place') IS NULL
    ALTER TABLE dbo.auth_external_identities ADD document_issue_place nvarchar(200) NULL;
GO
IF COL_LENGTH('dbo.auth_external_identities','permanent_address') IS NULL
    ALTER TABLE dbo.auth_external_identities ADD permanent_address nvarchar(500) NULL;
GO
IF COL_LENGTH('dbo.auth_external_identities','details_updated_at') IS NULL
    ALTER TABLE dbo.auth_external_identities ADD details_updated_at datetime2(6) NULL;
GO
