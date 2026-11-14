IF OBJECT_ID('dbo.billing_meter_readings','U') IS NULL
BEGIN
 CREATE TABLE dbo.billing_meter_readings(
 id bigint IDENTITY(1,1) PRIMARY KEY,contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),period varchar(7) NOT NULL,
 electricity_end_reading decimal(15,2) NOT NULL,water_end_reading decimal(15,2) NOT NULL,
 electricity_unit_price decimal(15,2) NOT NULL,water_unit_price decimal(15,2) NOT NULL,
 internet_fee decimal(15,2) NOT NULL,garbage_fee decimal(15,2) NOT NULL,water_billing_mode varchar(16) NOT NULL,
 occupant_count int NOT NULL,property_rates bit NOT NULL,saved_at datetime2(6) NOT NULL,saved_by bigint NOT NULL REFERENCES dbo.auth_accounts(id),
 CONSTRAINT uq_billing_meter_contract_period UNIQUE(contract_id,period),
 CONSTRAINT ck_billing_meter_nonnegative CHECK(electricity_end_reading>=0 AND water_end_reading>=0 AND electricity_unit_price>=0 AND water_unit_price>=0 AND internet_fee>=0 AND garbage_fee>=0),
 CONSTRAINT ck_billing_meter_mode CHECK(water_billing_mode IN ('METERED','PER_PERSON') AND occupant_count BETWEEN 1 AND 100));
END;
GO
