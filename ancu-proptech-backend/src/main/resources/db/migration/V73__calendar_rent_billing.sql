IF COL_LENGTH('dbo.rental_contracts','calendar_rent_billing') IS NULL
 ALTER TABLE dbo.rental_contracts ADD calendar_rent_billing bit NOT NULL CONSTRAINT df_contract_calendar_rent DEFAULT 0;
GO
IF COL_LENGTH('dbo.rental_invoices','rent_calculation') IS NULL
 ALTER TABLE dbo.rental_invoices ADD rent_calculation nvarchar(4000) NULL;
GO
