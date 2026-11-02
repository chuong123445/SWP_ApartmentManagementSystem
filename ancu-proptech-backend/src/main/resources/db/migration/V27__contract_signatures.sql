-- Additive only: existing snapshots, contracts and signatures are never replaced.
IF COL_LENGTH('dbo.contract_drafts','template_type') IS NULL
    ALTER TABLE dbo.contract_drafts ADD template_type varchar(20) NULL;
GO
IF COL_LENGTH('dbo.contract_drafts','owner_signature') IS NULL
    ALTER TABLE dbo.contract_drafts ADD owner_signature varbinary(max) NULL;
GO
IF COL_LENGTH('dbo.contract_drafts','customer_signature') IS NULL
    ALTER TABLE dbo.contract_drafts ADD customer_signature varbinary(max) NULL;
GO
IF COL_LENGTH('dbo.contract_drafts','owner_signed_at') IS NULL
    ALTER TABLE dbo.contract_drafts ADD owner_signed_at datetime2(6) NULL;
GO
IF COL_LENGTH('dbo.contract_drafts','customer_signed_at') IS NULL
    ALTER TABLE dbo.contract_drafts ADD customer_signed_at datetime2(6) NULL;
GO
IF COL_LENGTH('dbo.contract_drafts','signed_content_hash') IS NULL
    ALTER TABLE dbo.contract_drafts ADD signed_content_hash varchar(64) NULL;
GO
