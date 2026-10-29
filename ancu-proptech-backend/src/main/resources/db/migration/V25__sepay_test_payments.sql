-- Phiếu thử dùng tiền thật; không cập nhật công nợ hóa đơn thuê.
IF OBJECT_ID(N'dbo.sepay_test_payments',N'U') IS NULL
CREATE TABLE dbo.sepay_test_payments (
 id bigint IDENTITY(1,1) PRIMARY KEY, owner_id bigint NOT NULL,
 payment_code varchar(32) NOT NULL UNIQUE,
 bank varchar(50) NOT NULL, account_number varchar(30) NOT NULL, virtual_account varchar(34),
 account_holder_name nvarchar(100) NOT NULL,
 amount decimal(31,4) NOT NULL CHECK(amount>=1 AND amount<=999999999 AND amount=FLOOR(amount)),
 created_at datetime2(6) NOT NULL, paid_at datetime2(6),
 CONSTRAINT fk_sepay_test_owner FOREIGN KEY(owner_id) REFERENCES dbo.auth_accounts(id)
);
IF COL_LENGTH('dbo.sepay_events','test_payment_id') IS NULL
 ALTER TABLE dbo.sepay_events ADD test_payment_id bigint NULL;
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='fk_sepay_event_test_payment')
 EXEC('ALTER TABLE dbo.sepay_events ADD CONSTRAINT fk_sepay_event_test_payment FOREIGN KEY(test_payment_id) REFERENCES dbo.sepay_test_payments(id)');
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.sepay_test_payments') AND name='ix_sepay_test_owner')
 CREATE INDEX ix_sepay_test_owner ON dbo.sepay_test_payments(owner_id,id DESC);
