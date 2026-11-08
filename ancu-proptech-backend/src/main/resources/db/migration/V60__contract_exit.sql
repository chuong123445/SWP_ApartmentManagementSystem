IF OBJECT_ID('dbo.contract_exit_cases','U') IS NULL
 CREATE TABLE dbo.contract_exit_cases(contract_id bigint PRIMARY KEY REFERENCES dbo.rental_contracts(id),termination_state varchar(20) NOT NULL,handover_state varchar(20) NOT NULL,termination_json nvarchar(max) NULL,handover_json nvarchar(max) NULL,updated_at datetime2(6) NOT NULL,version bigint NOT NULL DEFAULT 0);
GO
IF OBJECT_ID('dbo.contract_exit_events','U') IS NULL
BEGIN
 CREATE TABLE dbo.contract_exit_events(id bigint IDENTITY PRIMARY KEY,contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),actor_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),actor_name nvarchar(100) NOT NULL,action varchar(32) NOT NULL,reason nvarchar(3000) NOT NULL,before_json nvarchar(max) NOT NULL,after_json nvarchar(max) NOT NULL,created_at datetime2(6) NOT NULL);
 CREATE INDEX ix_contract_exit_events ON dbo.contract_exit_events(contract_id,id);
END;
GO
IF OBJECT_ID('dbo.contract_exit_evidence','U') IS NULL
BEGIN
 CREATE TABLE dbo.contract_exit_evidence(id bigint IDENTITY PRIMARY KEY,contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),uploader_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),filename nvarchar(160) NOT NULL,content_type varchar(24) NOT NULL,content varbinary(max) NOT NULL,created_at datetime2(6) NOT NULL);
 CREATE INDEX ix_contract_exit_evidence ON dbo.contract_exit_evidence(contract_id,id);
END;
GO
