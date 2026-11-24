IF COL_LENGTH('dbo.maintenance_tickets','billing_contract_id') IS NULL
    ALTER TABLE dbo.maintenance_tickets ADD billing_contract_id bigint NULL REFERENCES dbo.rental_contracts(id);
IF COL_LENGTH('dbo.maintenance_tickets','billing_period') IS NULL
    ALTER TABLE dbo.maintenance_tickets ADD billing_period varchar(7) NULL;
IF COL_LENGTH('dbo.rental_invoices','maintenance_amount') IS NULL
    ALTER TABLE dbo.rental_invoices ADD maintenance_amount decimal(31,4) NOT NULL CONSTRAINT df_invoice_maintenance DEFAULT 0;
IF COL_LENGTH('dbo.rental_invoices','maintenance_items_json') IS NULL
    ALTER TABLE dbo.rental_invoices ADD maintenance_items_json nvarchar(max) NULL;
GO
IF OBJECT_ID('dbo.maintenance_charges','U') IS NULL
BEGIN
    CREATE TABLE dbo.maintenance_charges (
        ticket_id bigint NOT NULL PRIMARY KEY REFERENCES dbo.maintenance_tickets(id),
        contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),
        invoice_id bigint NULL REFERENCES dbo.rental_invoices(id),
        period varchar(7) NOT NULL,
        title nvarchar(200) NOT NULL,
        actual_cost decimal(15,2) NOT NULL CHECK(actual_cost>=0),
        customer_cost decimal(15,2) NOT NULL,
        CONSTRAINT ck_maintenance_charge_amount CHECK(customer_cost>0 AND customer_cost<=actual_cost)
    );
    CREATE INDEX ix_maintenance_charge_pending ON dbo.maintenance_charges(contract_id,period,invoice_id);
END;
GO
