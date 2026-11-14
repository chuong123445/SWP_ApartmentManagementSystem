IF OBJECT_ID('dbo.action_otp_challenges','U') IS NULL
BEGIN
 CREATE TABLE dbo.action_otp_challenges (
  id varchar(36) NOT NULL PRIMARY KEY, account_id bigint NOT NULL,
  purpose varchar(24) NOT NULL, target_email varchar(254) NOT NULL,
  binding_hash varchar(64) NOT NULL, code_hash varchar(64) NOT NULL, proof_hash varchar(64) NULL,
  account_version bigint NOT NULL, attempts int NOT NULL DEFAULT 0,
  created_at datetime2(6) NOT NULL, expires_at datetime2(6) NOT NULL,
  verified_at datetime2(6) NULL, used_at datetime2(6) NULL, invalidated_at datetime2(6) NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT fk_action_otp_account FOREIGN KEY(account_id) REFERENCES dbo.auth_accounts(id)
 );
 CREATE INDEX ix_action_otp_account_purpose_created ON dbo.action_otp_challenges(account_id,purpose,created_at);
END;
GO
