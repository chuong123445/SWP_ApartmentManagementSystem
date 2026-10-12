IF COL_LENGTH('dbo.auth_accounts','phone') IS NULL
    ALTER TABLE dbo.auth_accounts ADD phone varchar(20) NULL,address nvarchar(300) NULL,bio nvarchar(1000) NULL,date_of_birth date NULL,
        email_verified bit NOT NULL DEFAULT 0,phone_verified bit NOT NULL DEFAULT 0;
GO
-- Existing verified fixtures only had an email channel; do not guess verification for future updates.
IF OBJECT_ID('dbo.email_change_challenges','U') IS NULL
BEGIN
    UPDATE dbo.auth_accounts SET email_verified=contact_verified WHERE phone IS NULL;
    CREATE TABLE dbo.email_change_challenges (
        id uniqueidentifier NOT NULL PRIMARY KEY,account_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        target_email varchar(254) NOT NULL,code_hash varchar(64) NOT NULL,account_version bigint NOT NULL,attempts int NOT NULL DEFAULT 0,
        created_at datetime2(6) NOT NULL,expires_at datetime2(6) NOT NULL,used_at datetime2(6) NULL,invalidated_at datetime2(6) NULL,version bigint NOT NULL DEFAULT 0);
    CREATE INDEX ix_email_challenge_account_created ON dbo.email_change_challenges(account_id,created_at);
END;
GO
IF EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.auth_accounts') AND name='ux_auth_phone' AND filter_definition NOT LIKE '%phone_verified%')
    DROP INDEX ux_auth_phone ON dbo.auth_accounts;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.auth_accounts') AND name='ux_auth_phone')
    CREATE UNIQUE INDEX ux_auth_phone ON dbo.auth_accounts(phone) WHERE phone IS NOT NULL AND phone_verified=1;
GO
