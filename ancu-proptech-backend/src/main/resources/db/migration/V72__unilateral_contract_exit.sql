IF COL_LENGTH('dbo.contract_exit_cases','unilateral_state') IS NULL
 ALTER TABLE dbo.contract_exit_cases ADD unilateral_state varchar(20) NOT NULL CONSTRAINT df_exit_unilateral_state DEFAULT 'NONE', unilateral_json nvarchar(max) NULL;
GO
