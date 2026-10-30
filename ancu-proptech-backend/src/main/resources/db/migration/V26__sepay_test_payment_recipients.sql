-- Phiếu thử cũ giữ nguyên: không tự gán người thuê hay thay đổi công nợ.
IF COL_LENGTH('dbo.sepay_test_payments','customer_id') IS NULL
 ALTER TABLE dbo.sepay_test_payments ADD customer_id bigint NULL;
IF COL_LENGTH('dbo.sepay_test_payments','contract_id') IS NULL
 ALTER TABLE dbo.sepay_test_payments ADD contract_id bigint NULL;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='fk_sepay_test_customer')
 EXEC('ALTER TABLE dbo.sepay_test_payments ADD CONSTRAINT fk_sepay_test_customer FOREIGN KEY(customer_id) REFERENCES dbo.auth_accounts(id)');
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='fk_sepay_test_contract')
 EXEC('ALTER TABLE dbo.sepay_test_payments ADD CONSTRAINT fk_sepay_test_contract FOREIGN KEY(contract_id) REFERENCES dbo.rental_contracts(id)');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.sepay_test_payments') AND name='ix_sepay_test_customer')
 EXEC('CREATE INDEX ix_sepay_test_customer ON dbo.sepay_test_payments(customer_id,id DESC)');
GO
