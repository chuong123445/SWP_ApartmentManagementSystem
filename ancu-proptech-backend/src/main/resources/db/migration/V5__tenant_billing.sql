IF COL_LENGTH('dbo.rental_properties','ward') IS NULL ALTER TABLE dbo.rental_properties ADD ward nvarchar(80) NULL;
GO
IF OBJECT_ID('dbo.invoices','U') IS NOT NULL AND OBJECT_ID('dbo.legacy_invoices_archive','U') IS NULL EXEC sys.sp_rename 'dbo.invoices','legacy_invoices_archive';
IF OBJECT_ID('dbo.tenants','U') IS NOT NULL AND OBJECT_ID('dbo.legacy_tenants_archive','U') IS NULL EXEC sys.sp_rename 'dbo.tenants','legacy_tenants_archive';
GO
IF OBJECT_ID('dbo.rental_contracts','U') IS NULL
BEGIN
 CREATE TABLE dbo.rental_contracts (
 id uniqueidentifier NOT NULL PRIMARY KEY, apartment_id uniqueidentifier NOT NULL REFERENCES dbo.rental_apartments(id), customer_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
 status varchar(24) NOT NULL,start_date date NOT NULL,end_date date NOT NULL,monthly_rent decimal(15,2) NOT NULL,electricity_unit_price decimal(15,2) NOT NULL,water_unit_price decimal(15,2) NOT NULL,
 electricity_baseline decimal(15,2) NULL,water_baseline decimal(15,2) NULL,baseline_date date NULL,billing_version bigint NOT NULL DEFAULT 0,local_fixture bit NOT NULL DEFAULT 0,version bigint NOT NULL DEFAULT 0);
 CREATE UNIQUE INDEX ux_contract_active_apartment ON dbo.rental_contracts(apartment_id) WHERE status='ACTIVE';
 CREATE INDEX ix_contract_customer ON dbo.rental_contracts(customer_id,start_date);
END;
GO
IF OBJECT_ID('dbo.rental_invoices','U') IS NULL
BEGIN
 CREATE TABLE dbo.rental_invoices (
 id uniqueidentifier NOT NULL PRIMARY KEY,contract_id uniqueidentifier NOT NULL REFERENCES dbo.rental_contracts(id),period varchar(7) NOT NULL,due_date date NOT NULL,monthly_rent decimal(15,2) NOT NULL,
 electricity_start_reading decimal(15,2) NOT NULL,electricity_end_reading decimal(15,2) NOT NULL,electricity_quantity decimal(15,2) NOT NULL,electricity_unit_price decimal(15,2) NOT NULL,electricity_amount decimal(30,4) NOT NULL,
 water_start_reading decimal(15,2) NOT NULL,water_end_reading decimal(15,2) NOT NULL,water_quantity decimal(15,2) NOT NULL,water_unit_price decimal(15,2) NOT NULL,water_amount decimal(30,4) NOT NULL,
 total_amount decimal(31,4) NOT NULL,status varchar(16) NOT NULL,created_at datetime2(6) NOT NULL,sent_at datetime2(6) NULL,version bigint NOT NULL DEFAULT 0,
 CONSTRAINT ux_invoice_contract_period UNIQUE(contract_id,period));
 CREATE INDEX ix_invoice_contract_status ON dbo.rental_invoices(contract_id,status,period);
END;
GO
IF OBJECT_ID('dbo.invoice_notifications','U') IS NULL CREATE TABLE dbo.invoice_notifications (
 id uniqueidentifier NOT NULL PRIMARY KEY,invoice_id uniqueidentifier NOT NULL UNIQUE REFERENCES dbo.rental_invoices(id),customer_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),created_at datetime2(6) NOT NULL);
GO
