IF COL_LENGTH('dbo.rental_contracts','renewal_of_contract_id') IS NULL
    ALTER TABLE dbo.rental_contracts ADD renewal_of_contract_id bigint NULL;
GO
IF COL_LENGTH('dbo.rental_contracts','ended_at') IS NULL
    ALTER TABLE dbo.rental_contracts ADD ended_at datetime2(6) NULL;
GO
IF COL_LENGTH('dbo.rental_contracts','end_reason') IS NULL
    ALTER TABLE dbo.rental_contracts ADD end_reason varchar(24) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_contracts') AND name='ux_contract_open_renewal')
    CREATE UNIQUE INDEX ux_contract_open_renewal ON dbo.rental_contracts(renewal_of_contract_id)
    WHERE renewal_of_contract_id IS NOT NULL AND status<>'ENDED';
GO
IF OBJECT_ID('dbo.contract_handovers','U') IS NULL
BEGIN
 CREATE TABLE dbo.contract_handovers(
  id bigint IDENTITY PRIMARY KEY,contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),
  status varchar(24) NOT NULL,return_date date NOT NULL,electricity_reading decimal(15,2) NOT NULL,water_reading decimal(15,2) NOT NULL,
  keys_returned bit NOT NULL,condition_notes nvarchar(3000) NOT NULL,deduction_amount decimal(15,2) NOT NULL,
  deposit_amount decimal(15,2) NOT NULL,utility_amount decimal(15,2) NOT NULL,refund_amount decimal(15,2) NOT NULL,extra_amount_due decimal(15,2) NOT NULL,
  owner_confirmed_at datetime2(6) NOT NULL,customer_confirmed_at datetime2(6) NULL,version bigint NOT NULL DEFAULT 0
 );
 CREATE UNIQUE INDEX ux_contract_pending_handover ON dbo.contract_handovers(contract_id) WHERE status='PENDING';
END;
GO
IF COL_LENGTH('dbo.contract_handovers','electricity_start_reading') IS NULL
    ALTER TABLE dbo.contract_handovers ADD electricity_start_reading decimal(15,2) NULL;
GO
IF COL_LENGTH('dbo.contract_handovers','water_start_reading') IS NULL
    ALTER TABLE dbo.contract_handovers ADD water_start_reading decimal(15,2) NULL;
GO
