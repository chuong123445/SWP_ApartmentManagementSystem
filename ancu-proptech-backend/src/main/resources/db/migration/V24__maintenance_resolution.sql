IF COL_LENGTH('dbo.maintenance_tickets','repair_result') IS NULL
 ALTER TABLE dbo.maintenance_tickets ADD repair_result nvarchar(3000) NULL;
GO
