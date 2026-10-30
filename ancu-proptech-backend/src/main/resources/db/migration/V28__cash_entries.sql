IF OBJECT_ID('dbo.cash_entries','U') IS NULL
BEGIN
 CREATE TABLE dbo.cash_entries (
 id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
 property_id bigint NOT NULL REFERENCES dbo.rental_properties(id),
 created_by bigint NOT NULL REFERENCES dbo.auth_accounts(id),
 request_key varchar(36) NOT NULL,
 direction varchar(16) NOT NULL CHECK(direction IN ('INCOME','EXPENSE')),
 status varchar(16) NOT NULL CHECK(status IN ('DRAFT','POSTED','CANCELLED')),
 payment_method varchar(24) NOT NULL CHECK(payment_method IN ('CASH','BANK_TRANSFER')),
 amount decimal(15,2) NOT NULL CHECK(amount>0), transaction_date date NOT NULL,
 category nvarchar(100) NOT NULL, counterparty nvarchar(200) NOT NULL,
 description nvarchar(2000) NOT NULL, reference nvarchar(200) NULL,
 created_at datetime2(6) NOT NULL, posted_at datetime2(6) NULL, cancelled_at datetime2(6) NULL,
 posted_by bigint NULL REFERENCES dbo.auth_accounts(id), cancelled_by bigint NULL REFERENCES dbo.auth_accounts(id),
 cancellation_reason nvarchar(1000) NULL, version bigint NOT NULL DEFAULT 0,
 CONSTRAINT ux_cash_entry_request UNIQUE(property_id,request_key),
 CONSTRAINT ck_cash_posted_audit CHECK(status<>'POSTED' OR (posted_at IS NOT NULL AND posted_by IS NOT NULL)),
 CONSTRAINT ck_cash_cancel_audit CHECK(status<>'CANCELLED' OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL)));
 CREATE INDEX ix_cash_property_date ON dbo.cash_entries(property_id,transaction_date,id);
END;
GO
