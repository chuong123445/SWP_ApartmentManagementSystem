IF OBJECT_ID('dbo.property_settings','U') IS NULL
BEGIN
 CREATE TABLE dbo.property_settings (
 property_id bigint NOT NULL PRIMARY KEY REFERENCES dbo.rental_properties(id),
 electricity_unit_price decimal(15,2) NOT NULL CHECK(electricity_unit_price>=0),
 water_unit_price decimal(15,2) NOT NULL CHECK(water_unit_price>=0),
 internet_fee decimal(15,2) NOT NULL CHECK(internet_fee>=0),
 garbage_fee decimal(15,2) NOT NULL CHECK(garbage_fee>=0),
 updated_at datetime2(6) NOT NULL,updated_by bigint NOT NULL REFERENCES dbo.auth_accounts(id),
 version bigint NOT NULL DEFAULT 0);
END;
GO
