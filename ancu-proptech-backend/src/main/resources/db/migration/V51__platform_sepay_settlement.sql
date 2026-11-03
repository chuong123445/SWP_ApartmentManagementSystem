IF COL_LENGTH('dbo.invoice_payments', 'collection_owner_id') IS NULL
    ALTER TABLE dbo.invoice_payments ADD collection_owner_id BIGINT NULL;
IF COL_LENGTH('dbo.sepay_test_payments', 'collection_owner_id') IS NULL
    ALTER TABLE dbo.sepay_test_payments ADD collection_owner_id BIGINT NULL;
GO
IF OBJECT_ID('dbo.fk_invoice_payment_collection_owner', 'F') IS NULL
    ALTER TABLE dbo.invoice_payments ADD CONSTRAINT fk_invoice_payment_collection_owner
        FOREIGN KEY (collection_owner_id) REFERENCES dbo.sepay_connections(owner_id);
IF OBJECT_ID('dbo.fk_additional_payment_collection_owner', 'F') IS NULL
    ALTER TABLE dbo.sepay_test_payments ADD CONSTRAINT fk_additional_payment_collection_owner
        FOREIGN KEY (collection_owner_id) REFERENCES dbo.sepay_connections(owner_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.invoice_payments') AND name = 'ix_invoice_payment_collection_owner')
    CREATE INDEX ix_invoice_payment_collection_owner ON dbo.invoice_payments(collection_owner_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.sepay_test_payments') AND name = 'ix_additional_payment_collection_owner')
    CREATE INDEX ix_additional_payment_collection_owner ON dbo.sepay_test_payments(collection_owner_id);

IF OBJECT_ID('dbo.owner_withdrawals', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.owner_withdrawals (
        id BIGINT IDENTITY PRIMARY KEY,
        owner_id BIGINT NOT NULL REFERENCES dbo.auth_accounts(id),
        request_key VARCHAR(36) NOT NULL,
        amount DECIMAL(31,0) NOT NULL CHECK (amount > 0),
        bank VARCHAR(50) NOT NULL,
        account_number VARCHAR(34) NOT NULL,
        account_holder NVARCHAR(100) NOT NULL,
        status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING','PROCESSING','PAID','REJECTED','CANCELLED')),
        transfer_reference VARCHAR(100) NULL,
        note NVARCHAR(300) NULL,
        processing_admin_id BIGINT NULL REFERENCES dbo.auth_accounts(id),
        handled_by_id BIGINT NULL REFERENCES dbo.auth_accounts(id),
        created_at DATETIME2(6) NOT NULL,
        updated_at DATETIME2(6) NOT NULL,
        version BIGINT NOT NULL,
        CONSTRAINT ux_owner_withdrawal_request UNIQUE(owner_id, request_key),
        CONSTRAINT ck_owner_withdrawal_transfer CHECK (
            (status = 'PAID' AND transfer_reference IS NOT NULL AND processing_admin_id IS NOT NULL)
            OR (status <> 'PAID' AND transfer_reference IS NULL AND (status <> 'PROCESSING' OR processing_admin_id IS NOT NULL)))
    );
END;
IF COL_LENGTH('dbo.owner_withdrawals', 'account_number') < 34
    ALTER TABLE dbo.owner_withdrawals ALTER COLUMN account_number VARCHAR(34) NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.owner_withdrawals') AND name = 'ux_owner_withdrawal_transfer')
    CREATE UNIQUE INDEX ux_owner_withdrawal_transfer ON dbo.owner_withdrawals(transfer_reference) WHERE transfer_reference IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.owner_withdrawals') AND name = 'ix_owner_withdrawal_history')
    CREATE INDEX ix_owner_withdrawal_history ON dbo.owner_withdrawals(owner_id, id DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.owner_withdrawals') AND name = 'ix_owner_withdrawal_status')
    CREATE INDEX ix_owner_withdrawal_status ON dbo.owner_withdrawals(status, id DESC);

IF OBJECT_ID('dbo.settlement_entries', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.settlement_entries (
        id BIGINT IDENTITY PRIMARY KEY,
        owner_id BIGINT NOT NULL REFERENCES dbo.auth_accounts(id),
        kind VARCHAR(24) NOT NULL CHECK (kind IN ('INVOICE','ADDITIONAL_RECEIPT','RESERVE','RELEASE','PAYOUT')),
        source_id BIGINT NOT NULL,
        amount DECIMAL(31,0) NOT NULL CHECK (amount > 0),
        created_at DATETIME2(6) NOT NULL,
        CONSTRAINT ux_settlement_entry_source UNIQUE(kind, source_id)
    );
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.settlement_entries') AND name = 'ix_settlement_entry_owner')
    CREATE INDEX ix_settlement_entry_owner ON dbo.settlement_entries(owner_id, id DESC) INCLUDE (kind, amount);
