SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
GO
IF COL_LENGTH('dbo.rental_contracts','rent_cycle_months') IS NULL
BEGIN
 ALTER TABLE dbo.rental_contracts ADD rent_cycle_months int NOT NULL CONSTRAINT df_contract_rent_cycle DEFAULT 1,
 rent_payment_day int NOT NULL CONSTRAINT df_contract_rent_due DEFAULT 5,
 separate_billing_agreed bit NOT NULL CONSTRAINT df_contract_separate_agreed DEFAULT 0;
 EXEC('UPDATE c SET rent_payment_day=CASE WHEN d.payment_day BETWEEN 1 AND 28 THEN d.payment_day ELSE 5 END FROM dbo.rental_contracts c JOIN dbo.contract_drafts d ON d.contract_id=c.id');
END;
GO
IF COL_LENGTH('dbo.rental_invoices','kind') IS NULL
BEGIN
 ALTER TABLE dbo.rental_invoices ADD kind varchar(16) NOT NULL CONSTRAINT df_invoice_kind DEFAULT 'LEGACY',
 coverage_start date NULL,coverage_end date NULL,rent_months int NOT NULL CONSTRAINT df_invoice_rent_months DEFAULT 1,
 rent_unit_price decimal(15,2) NOT NULL CONSTRAINT df_invoice_rent_unit DEFAULT 0,
 auto_generated bit NOT NULL CONSTRAINT df_invoice_auto_generated DEFAULT 0;
END;
GO
IF COLUMNPROPERTY(OBJECT_ID('dbo.rental_invoices'),'monthly_rent','PRECISION')<17
 ALTER TABLE dbo.rental_invoices ALTER COLUMN monthly_rent decimal(17,2) NOT NULL;
GO
UPDATE i SET coverage_start=TRY_CONVERT(date,i.period+'-01'),coverage_end=EOMONTH(TRY_CONVERT(date,i.period+'-01')),rent_unit_price=i.monthly_rent
FROM dbo.rental_invoices i WHERE coverage_start IS NULL AND kind='LEGACY';
GO
IF COL_LENGTH('dbo.property_settings','rent_invoice_mode') IS NULL
 ALTER TABLE dbo.property_settings ADD rent_invoice_mode varchar(16) NOT NULL CONSTRAINT df_property_rent_mode DEFAULT 'DRAFT';
GO
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_invoices') AND name='ux_invoice_current_contract_period')
 DROP INDEX ux_invoice_current_contract_period ON dbo.rental_invoices;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_invoices') AND name='ux_invoice_kind_period')
 CREATE UNIQUE INDEX ux_invoice_kind_period ON dbo.rental_invoices(contract_id,kind,period) WHERE status<>'CANCELLED';
GO
