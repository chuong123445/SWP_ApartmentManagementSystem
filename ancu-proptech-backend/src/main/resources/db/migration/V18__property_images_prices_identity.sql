IF OBJECT_ID(N'dbo.property_images',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_images(
        id uniqueidentifier NOT NULL PRIMARY KEY,
        uploader_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        property_id uniqueidentifier NULL REFERENCES dbo.rental_properties(id),
        position int NOT NULL,
        content_type varchar(255) NOT NULL,
        created_at datetime2(6) NOT NULL,
        content varbinary(max) NOT NULL
    );
    CREATE INDEX ix_property_images_property ON dbo.property_images(property_id,position);
END;
GO
IF COL_LENGTH('dbo.auth_accounts','identity_verified') IS NULL
    ALTER TABLE dbo.auth_accounts ADD identity_verified bit NOT NULL CONSTRAINT df_account_identity_verified DEFAULT 0;
GO
UPDATE a SET identity_verified=CASE WHEN EXISTS(SELECT 1 FROM dbo.auth_external_identities i WHERE i.account_id=a.id AND i.verification_status='VERIFIED') THEN 1 ELSE 0 END FROM dbo.auth_accounts a
WHERE identity_verified<>CASE WHEN EXISTS(SELECT 1 FROM dbo.auth_external_identities i WHERE i.account_id=a.id AND i.verification_status='VERIFIED') THEN 1 ELSE 0 END;
GO
IF COL_LENGTH('dbo.rental_requests','quoted_monthly_rent') IS NULL
    ALTER TABLE dbo.rental_requests ADD quoted_monthly_rent decimal(15,2) NULL;
GO
-- Dữ liệu cũ chưa có snapshot giá: giữ NULL, không giả định đây là giá thời điểm đã gửi.
