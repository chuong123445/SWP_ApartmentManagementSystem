-- Record only future transitions. Do not invent timestamps for old ACTIVE/ENDED fixtures.
IF COL_LENGTH('dbo.rental_contracts','activated_at') IS NULL
    ALTER TABLE dbo.rental_contracts ADD activated_at datetime2(6) NULL;
GO
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.rental_contracts')
    AND name='activated_at' AND TYPE_NAME(system_type_id)<>'datetime2')
    THROW 51000, 'rental_contracts.activated_at must be datetime2; inspect the existing schema.', 1;
GO
