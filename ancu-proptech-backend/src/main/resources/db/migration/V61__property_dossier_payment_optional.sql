-- Retain historical receiving-account snapshots; new dossiers concern property rights only.
ALTER TABLE dbo.property_dossiers ALTER COLUMN bank nvarchar(100) NULL;
ALTER TABLE dbo.property_dossiers ALTER COLUMN account_number varchar(40) NULL;
ALTER TABLE dbo.property_dossiers ALTER COLUMN account_holder_name nvarchar(100) NULL;
