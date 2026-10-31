IF OBJECT_ID('dbo.property_dossier_ai_reviews','U') IS NULL
BEGIN
 CREATE TABLE dbo.property_dossier_ai_reviews (
 id bigint IDENTITY(1,1) PRIMARY KEY,dossier_id bigint NOT NULL UNIQUE REFERENCES dbo.property_dossiers(id),
 state varchar(32) NOT NULL,source_json nvarchar(max) NOT NULL,source_hash varchar(64) NOT NULL,
 result_json nvarchar(max) NULL,model varchar(100) NULL,prompt_version varchar(40) NOT NULL,
 created_at datetime2(6) NOT NULL,started_at datetime2(6) NULL,finished_at datetime2(6) NULL,
 next_attempt_at datetime2(6) NOT NULL,attempts int NOT NULL DEFAULT 0,
 error_code varchar(40) NULL,run_token varchar(36) NULL,version bigint NOT NULL DEFAULT 0);
 CREATE INDEX ix_dossier_ai_queue ON dbo.property_dossier_ai_reviews(state,next_attempt_at,created_at);
END;
GO
