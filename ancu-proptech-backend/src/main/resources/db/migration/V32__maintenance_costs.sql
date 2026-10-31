IF COL_LENGTH('dbo.maintenance_tickets','actual_cost') IS NULL
 ALTER TABLE dbo.maintenance_tickets ADD actual_cost decimal(15,2) NULL, customer_cost decimal(15,2) NULL, cost_responsibility varchar(24) NULL;
GO
