IF OBJECT_ID('dbo.maintenance_tickets','U') IS NULL
BEGIN
 CREATE TABLE dbo.maintenance_tickets (
 id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
 property_id bigint NOT NULL REFERENCES dbo.rental_properties(id),
 apartment_id bigint NULL REFERENCES dbo.rental_apartments(id),
 reporter_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
 title nvarchar(200) NOT NULL, description nvarchar(3000) NOT NULL,
 category varchar(24) NOT NULL, priority varchar(24) NOT NULL,
 status varchar(24) NOT NULL,
 created_at datetime2(6) NOT NULL, version bigint NOT NULL DEFAULT 0);
 CREATE INDEX ix_maintenance_property ON dbo.maintenance_tickets(property_id,created_at);
 CREATE INDEX ix_maintenance_reporter ON dbo.maintenance_tickets(reporter_id,created_at);
END;
GO
