IF COL_LENGTH('dbo.cash_entries','source_invoice_id') IS NULL
 ALTER TABLE dbo.cash_entries ADD source_invoice_id bigint NULL REFERENCES dbo.rental_invoices(id);
GO
IF COL_LENGTH('dbo.cash_entries','source_maintenance_id') IS NULL
 ALTER TABLE dbo.cash_entries ADD source_maintenance_id bigint NULL REFERENCES dbo.maintenance_tickets(id);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.cash_entries') AND name='ux_cash_source_invoice')
 CREATE UNIQUE INDEX ux_cash_source_invoice ON dbo.cash_entries(source_invoice_id) WHERE source_invoice_id IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.cash_entries') AND name='ux_cash_source_maintenance')
 CREATE UNIQUE INDEX ux_cash_source_maintenance ON dbo.cash_entries(source_maintenance_id) WHERE source_maintenance_id IS NOT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='ck_cash_single_source')
 ALTER TABLE dbo.cash_entries ADD CONSTRAINT ck_cash_single_source CHECK(source_invoice_id IS NULL OR source_maintenance_id IS NULL);
GO
