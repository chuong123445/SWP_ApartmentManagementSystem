IF OBJECT_ID(N'dbo.property_external_imports',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_external_imports (
        property_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.rental_properties(id),
        issuer varchar(300) COLLATE Latin1_General_100_BIN2 NOT NULL,
        external_asset_id nvarchar(100) COLLATE Latin1_General_100_BIN2 NOT NULL,
        subject varchar(255) COLLATE Latin1_General_100_BIN2 NOT NULL,
        source varchar(40) NOT NULL,
        source_version varchar(64) NOT NULL,
        source_snapshot nvarchar(max) NOT NULL,
        imported_at datetime2(6) NOT NULL,
        CONSTRAINT uq_property_external_asset UNIQUE(issuer,external_asset_id)
    );
END;
IF COL_LENGTH('dbo.rental_apartments','electricity_unit_price') IS NULL
    ALTER TABLE dbo.rental_apartments ADD electricity_unit_price decimal(15,2) NULL;
IF COL_LENGTH('dbo.rental_apartments','water_unit_price') IS NULL
    ALTER TABLE dbo.rental_apartments ADD water_unit_price decimal(15,2) NULL;
GO
