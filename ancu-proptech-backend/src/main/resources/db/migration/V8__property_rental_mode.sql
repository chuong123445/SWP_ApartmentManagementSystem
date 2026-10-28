-- Additive: legacy properties keep their mode unspecified; never reset fixtures.
IF COL_LENGTH(N'dbo.rental_properties', N'rental_mode') IS NULL
    ALTER TABLE dbo.rental_properties ADD rental_mode varchar(24) NULL;
GO
