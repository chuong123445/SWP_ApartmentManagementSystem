IF COL_LENGTH('dbo.invoice_payments','payment_method') IS NULL
 ALTER TABLE dbo.invoice_payments ADD payment_method varchar(24) NOT NULL CONSTRAINT df_invoice_payment_method DEFAULT 'BANK_TRANSFER' WITH VALUES;
GO
IF COL_LENGTH('dbo.invoice_payments','confirmed_by') IS NULL
 ALTER TABLE dbo.invoice_payments ADD confirmed_by bigint NULL REFERENCES dbo.auth_accounts(id);
GO
IF COL_LENGTH('dbo.invoice_payments','confirmation_note') IS NULL
 ALTER TABLE dbo.invoice_payments ADD confirmation_note nvarchar(1000) NULL;
GO
ALTER TABLE dbo.invoice_payments ALTER COLUMN bank varchar(50) NULL;
ALTER TABLE dbo.invoice_payments ALTER COLUMN account_number varchar(30) NULL;
ALTER TABLE dbo.invoice_payments ALTER COLUMN account_holder_name nvarchar(100) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE name='ck_invoice_payment_method')
 ALTER TABLE dbo.invoice_payments ADD CONSTRAINT ck_invoice_payment_method CHECK (
  (payment_method='BANK_TRANSFER' AND bank IS NOT NULL AND account_number IS NOT NULL AND account_holder_name IS NOT NULL)
  OR (payment_method='CASH' AND paid_at IS NOT NULL AND confirmed_by IS NOT NULL));
GO
