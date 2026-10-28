IF OBJECT_ID(N'dbo.sepay_connections',N'U') IS NULL
CREATE TABLE dbo.sepay_connections (
 id bigint IDENTITY(1,1) PRIMARY KEY,
 owner_id bigint NOT NULL UNIQUE,
 bank varchar(50) NOT NULL, account_number varchar(30) NOT NULL, account_holder_name nvarchar(100) NOT NULL,
 virtual_account varchar(34), secret_hash varchar(64) NOT NULL,
 bank_account_id varchar(64) NOT NULL, enabled bit NOT NULL, last_webhook_at datetime2(6), version bigint NOT NULL
);
IF OBJECT_ID(N'dbo.invoice_payments',N'U') IS NULL
CREATE TABLE dbo.invoice_payments (
 id bigint IDENTITY(1,1) PRIMARY KEY,
 invoice_id bigint NOT NULL UNIQUE,
 owner_id bigint NOT NULL,
 payment_code varchar(28) NOT NULL UNIQUE,
 bank varchar(50) NOT NULL, account_number varchar(30) NOT NULL, virtual_account varchar(34),
 account_holder_name nvarchar(100) NOT NULL,
 amount decimal(31,4) NOT NULL CHECK (amount>0), paid_at datetime2(6)
);
IF OBJECT_ID(N'dbo.sepay_events',N'U') IS NULL
CREATE TABLE dbo.sepay_events (
 id bigint IDENTITY(1,1) PRIMARY KEY,
 transaction_id bigint NOT NULL UNIQUE,
 owner_id bigint NOT NULL,
 invoice_id bigint,
 result varchar(32) NOT NULL, amount decimal(31,4) NOT NULL,
 received_at datetime2(6) NOT NULL
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.sepay_events') AND name=N'ix_sepay_events_owner_time')
CREATE INDEX ix_sepay_events_owner_time ON sepay_events(owner_id,received_at DESC,id DESC);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'fk_sepay_connections_owner_id')
ALTER TABLE dbo.sepay_connections WITH CHECK ADD CONSTRAINT fk_sepay_connections_owner_id FOREIGN KEY (owner_id) REFERENCES dbo.auth_accounts(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'fk_invoice_payments_invoice_id')
ALTER TABLE dbo.invoice_payments WITH CHECK ADD CONSTRAINT fk_invoice_payments_invoice_id FOREIGN KEY (invoice_id) REFERENCES dbo.rental_invoices(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'fk_invoice_payments_owner_id')
ALTER TABLE dbo.invoice_payments WITH CHECK ADD CONSTRAINT fk_invoice_payments_owner_id FOREIGN KEY (owner_id) REFERENCES dbo.auth_accounts(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'fk_sepay_events_owner_id')
ALTER TABLE dbo.sepay_events WITH CHECK ADD CONSTRAINT fk_sepay_events_owner_id FOREIGN KEY (owner_id) REFERENCES dbo.auth_accounts(id);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'fk_sepay_events_invoice_id')
ALTER TABLE dbo.sepay_events WITH CHECK ADD CONSTRAINT fk_sepay_events_invoice_id FOREIGN KEY (invoice_id) REFERENCES dbo.rental_invoices(id);
