IF COL_LENGTH('dbo.rental_contracts','water_billing_mode') IS NULL
 ALTER TABLE dbo.rental_contracts ADD water_billing_mode varchar(16) NOT NULL CONSTRAINT df_rental_contracts_water_mode DEFAULT 'METERED',occupant_count int NOT NULL CONSTRAINT df_rental_contracts_occupants DEFAULT 1 CHECK(occupant_count BETWEEN 1 AND 100),internet_fee decimal(15,2) NOT NULL CONSTRAINT df_rental_contracts_internet DEFAULT 0 CHECK(internet_fee>=0),garbage_fee decimal(15,2) NOT NULL CONSTRAINT df_rental_contracts_garbage DEFAULT 0 CHECK(garbage_fee>=0);
GO
IF COL_LENGTH('dbo.rental_invoices','water_billing_mode') IS NULL
 ALTER TABLE dbo.rental_invoices ADD water_billing_mode varchar(16) NOT NULL CONSTRAINT df_rental_invoices_water_mode DEFAULT 'METERED',occupant_count int NOT NULL CONSTRAINT df_rental_invoices_occupants DEFAULT 1 CHECK(occupant_count BETWEEN 1 AND 100),internet_fee decimal(15,2) NOT NULL CONSTRAINT df_rental_invoices_internet DEFAULT 0 CHECK(internet_fee>=0),garbage_fee decimal(15,2) NOT NULL CONSTRAINT df_rental_invoices_garbage DEFAULT 0 CHECK(garbage_fee>=0);
GO
