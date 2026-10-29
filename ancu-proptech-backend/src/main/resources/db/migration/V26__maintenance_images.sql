IF OBJECT_ID('dbo.maintenance_images','U') IS NULL
BEGIN
 CREATE TABLE dbo.maintenance_images(id bigint IDENTITY(1,1) PRIMARY KEY,ticket_id bigint NOT NULL REFERENCES dbo.maintenance_tickets(id),
 kind varchar(24) NOT NULL,content_type varchar(40) NOT NULL,content varbinary(max) NOT NULL,created_at datetime2(6) NOT NULL);
 CREATE INDEX ix_maintenance_images_ticket ON dbo.maintenance_images(ticket_id,id);
END;
GO
