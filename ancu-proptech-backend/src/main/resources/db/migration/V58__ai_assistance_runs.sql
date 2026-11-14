IF OBJECT_ID('dbo.ai_assistance_runs','U') IS NULL
BEGIN
 CREATE TABLE dbo.ai_assistance_runs (
 id varchar(36) NOT NULL PRIMARY KEY,task varchar(32) NOT NULL,account_id bigint NULL,property_id bigint NULL,
 source_hash varchar(64) NOT NULL,model varchar(100) NOT NULL,prompt_version varchar(64) NOT NULL,
 status varchar(32) NOT NULL,error_code varchar(64) NULL,result_json nvarchar(max) NULL,accepted_json nvarchar(max) NULL,
 created_at datetime2(6) NOT NULL,finished_at datetime2(6) NULL,accepted_at datetime2(6) NULL,version bigint NOT NULL DEFAULT 0
 );
 CREATE INDEX ix_ai_runs_account ON dbo.ai_assistance_runs(account_id,created_at);
END;
GO
