IF OBJECT_ID(N'dbo.rental_properties', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.rental_properties (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        owner_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        name nvarchar(150) NOT NULL,
        address nvarchar(300) NOT NULL,
        city nvarchar(80) NOT NULL,
        district nvarchar(80) NOT NULL,
        approval_status varchar(24) NOT NULL,
        version bigint NOT NULL DEFAULT 0
    );
    CREATE INDEX ix_rental_properties_owner ON dbo.rental_properties(owner_id);
END;
GO
IF OBJECT_ID(N'dbo.rental_apartments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.rental_apartments (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        property_id uniqueidentifier NOT NULL REFERENCES dbo.rental_properties(id),
        title nvarchar(150) NOT NULL,
        description nvarchar(3000) NOT NULL,
        area_m2 decimal(12,2) NOT NULL,
        advertised_monthly_rent decimal(15,2) NOT NULL,
        bedrooms int NULL,
        bathrooms int NULL,
        cover_image_path varchar(500) NULL,
        publication_status varchar(24) NOT NULL,
        availability varchar(24) NOT NULL,
        created_at datetime2(6) NOT NULL,
        version bigint NOT NULL DEFAULT 0
    );
    CREATE INDEX ix_rental_apartments_public ON dbo.rental_apartments(publication_status, created_at, id);
    CREATE INDEX ix_rental_apartments_property ON dbo.rental_apartments(property_id);
END;
GO
IF OBJECT_ID(N'dbo.rental_apartment_amenities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.rental_apartment_amenities (
        apartment_id uniqueidentifier NOT NULL REFERENCES dbo.rental_apartments(id),
        amenity nvarchar(100) NULL
    );
END;
GO
IF OBJECT_ID(N'dbo.rental_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.rental_requests (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        apartment_id uniqueidentifier NOT NULL REFERENCES dbo.rental_apartments(id),
        customer_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        message nvarchar(2000) NOT NULL,
        status varchar(24) NOT NULL,
        created_at datetime2(6) NOT NULL,
        version bigint NOT NULL DEFAULT 0
    );
    CREATE INDEX ix_rental_requests_apartment ON dbo.rental_requests(apartment_id, created_at, id);
    CREATE INDEX ix_rental_requests_customer ON dbo.rental_requests(customer_id, created_at, id);
END;
GO
