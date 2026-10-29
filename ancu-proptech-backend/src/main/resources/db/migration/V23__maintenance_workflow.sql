IF COL_LENGTH('dbo.maintenance_tickets','tenant_id') IS NULL
BEGIN
 ALTER TABLE dbo.maintenance_tickets ADD tenant_id bigint NULL REFERENCES dbo.auth_accounts(id),
 technician_name nvarchar(200) NULL, technician_phone varchar(30) NULL, scheduled_at datetime2(6) NULL;
END;
GO
IF OBJECT_ID('dbo.maintenance_events','U') IS NULL
BEGIN
 CREATE TABLE dbo.maintenance_events(id bigint IDENTITY(1,1) PRIMARY KEY,ticket_id bigint NOT NULL REFERENCES dbo.maintenance_tickets(id),
 actor_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),action varchar(40) NOT NULL,note nvarchar(3000) NOT NULL,created_at datetime2(6) NOT NULL);
 CREATE INDEX ix_maintenance_events_ticket ON dbo.maintenance_events(ticket_id,id);
END;
GO
