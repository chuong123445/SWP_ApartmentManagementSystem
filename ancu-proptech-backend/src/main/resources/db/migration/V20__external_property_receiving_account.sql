-- Thông tin nhận tiền tự khai, riêng tư; không phải xác minh ngân hàng.
IF COL_LENGTH('dbo.property_external_imports','bank') IS NULL
BEGIN
 ALTER TABLE dbo.property_external_imports ADD bank nvarchar(150) NULL, account_number varchar(50) NULL,
 account_holder_name nvarchar(100) NULL, receiving_account_updated_at datetime2(6) NULL,
 version bigint NOT NULL CONSTRAINT df_external_import_version DEFAULT 0;
END;
GO
