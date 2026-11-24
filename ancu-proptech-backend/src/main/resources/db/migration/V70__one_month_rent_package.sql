-- Opt in only when a draft is explicitly created/edited under the new policy.
-- Existing signed/active leases retain their original billing behavior.
IF COL_LENGTH('dbo.rental_contracts','one_month_rent_package') IS NULL
 ALTER TABLE dbo.rental_contracts ADD one_month_rent_package bit NOT NULL
 CONSTRAINT df_contract_one_month_rent_package DEFAULT 0 WITH VALUES;
GO
