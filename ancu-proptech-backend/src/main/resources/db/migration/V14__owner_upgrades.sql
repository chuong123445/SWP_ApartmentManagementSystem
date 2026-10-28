IF OBJECT_ID(N'dbo.auth_owner_upgrades',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_owner_upgrades (
        account_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.auth_external_identities(account_id),
        consented_at datetime2(6) NOT NULL,
        checked_at datetime2(6) NOT NULL,
        eligible_asset_count int NOT NULL CHECK (eligible_asset_count>0),
        consent_version varchar(40) NOT NULL,
        source varchar(40) NOT NULL
    );
END;
GO
