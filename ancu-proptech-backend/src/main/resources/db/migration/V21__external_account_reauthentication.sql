IF COL_LENGTH('dbo.auth_accounts','google_subject') IS NULL
 ALTER TABLE dbo.auth_accounts ADD google_subject varchar(255) NULL;
-- Giữ nguyên hash cũ; không coi mật khẩu Google sinh ngẫu nhiên là mật khẩu người dùng đã thiết lập.
IF COL_LENGTH('dbo.auth_accounts','local_password_enabled') IS NULL
BEGIN
 ALTER TABLE dbo.auth_accounts ADD local_password_enabled bit NOT NULL CONSTRAINT df_local_password_enabled DEFAULT 1;
 EXEC('UPDATE dbo.auth_accounts SET local_password_enabled=0 WHERE password_hash IS NULL OR google_subject IS NOT NULL');
END;
IF OBJECT_ID(N'dbo.account_reauthentications',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.account_reauthentications (
 id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
 account_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
 session_id bigint NOT NULL REFERENCES dbo.auth_sessions(id),
 account_version bigint NOT NULL, purpose varchar(16) NOT NULL,
 nonce_hash varchar(64) NOT NULL, credential_hash varchar(64) NULL, proof_hash varchar(64) NULL,
 created_at datetime2(6) NOT NULL, expires_at datetime2(6) NOT NULL,
 confirmed_at datetime2(6) NULL, used_at datetime2(6) NULL, attempts int NOT NULL DEFAULT 0
 );
 CREATE UNIQUE INDEX uq_reauthentication_proof ON dbo.account_reauthentications(proof_hash) WHERE proof_hash IS NOT NULL;
 CREATE UNIQUE INDEX uq_reauthentication_credential ON dbo.account_reauthentications(credential_hash) WHERE credential_hash IS NOT NULL;
 CREATE INDEX ix_reauthentication_account_created ON dbo.account_reauthentications(account_id,created_at);
END;
GO
