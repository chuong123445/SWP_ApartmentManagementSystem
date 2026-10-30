IF COL_LENGTH('dbo.property_settings','water_billing_mode') IS NULL
 ALTER TABLE dbo.property_settings ADD water_billing_mode varchar(16) NOT NULL CONSTRAINT df_settings_water_mode DEFAULT 'METERED' CHECK(water_billing_mode IN ('METERED','PER_PERSON'));
GO
