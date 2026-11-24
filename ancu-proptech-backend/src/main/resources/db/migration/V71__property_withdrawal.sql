IF COL_LENGTH('dbo.rental_properties','withdrawn_at') IS NULL
 ALTER TABLE dbo.rental_properties ADD withdrawn_at datetime2(6) NULL;
GO
