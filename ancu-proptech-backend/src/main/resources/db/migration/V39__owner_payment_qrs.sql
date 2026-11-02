IF OBJECT_ID('dbo.owner_payment_qrs','U') IS NULL
BEGIN
 CREATE TABLE dbo.owner_payment_qrs(id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,owner_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),bank_bin varchar(6) NOT NULL,bank varchar(100) NOT NULL,account_number varchar(34) NOT NULL,account_holder_name nvarchar(200) NULL,content_type varchar(24) NOT NULL,content varbinary(max) NOT NULL,ai_status varchar(32) NOT NULL,created_at datetime2(6) NOT NULL,confirmed_at datetime2(6) NULL,version bigint NOT NULL DEFAULT 0);
 CREATE INDEX ix_owner_qr_confirmed ON dbo.owner_payment_qrs(owner_id,confirmed_at,id);
END;
GO
