-- One current invoice per contract/month; cancelled documents remain auditable.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id=OBJECT_ID('dbo.rental_invoices') AND name='ux_invoice_contract_period')
    ALTER TABLE dbo.rental_invoices DROP CONSTRAINT ux_invoice_contract_period;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_invoices') AND name='ux_invoice_contract_period')
    DROP INDEX ux_invoice_contract_period ON dbo.rental_invoices;
IF COL_LENGTH('dbo.rental_invoices','kind') IS NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_invoices') AND name='ux_invoice_current_contract_period')
    CREATE UNIQUE INDEX ux_invoice_current_contract_period ON dbo.rental_invoices(contract_id,period) WHERE status <> 'CANCELLED';
GO
IF OBJECT_ID('dbo.invoice_events','U') IS NULL
BEGIN
    CREATE TABLE dbo.invoice_events (
        id bigint IDENTITY PRIMARY KEY,
        invoice_id bigint NOT NULL REFERENCES dbo.rental_invoices(id),
        actor_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
        action varchar(16) NOT NULL CHECK(action IN ('CREATED','UPDATED','CANCELLED','SENT')),
        occurred_at datetime2(6) NOT NULL,
        reason nvarchar(1000) NULL,
        before_json nvarchar(max) NULL,
        after_json nvarchar(max) NOT NULL
    );
    CREATE INDEX ix_invoice_events_invoice ON dbo.invoice_events(invoice_id,id);
END;
GO
