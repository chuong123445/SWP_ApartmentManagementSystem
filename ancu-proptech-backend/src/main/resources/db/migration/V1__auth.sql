-- Idempotent auth schema bootstrap. Existing rental tables are not modified.
IF OBJECT_ID(N'dbo.auth_accounts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_accounts (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        email varchar(254) NOT NULL UNIQUE,
        password_hash varchar(100) NOT NULL,
        full_name nvarchar(100) NOT NULL,
        role varchar(20) NOT NULL,
        status varchar(24) NOT NULL,
        contact_verified bit NOT NULL,
        version bigint NOT NULL DEFAULT 0
    );
END;
GO
IF OBJECT_ID(N'dbo.auth_sessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_sessions (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        account_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        expires_at datetime2(6) NOT NULL,
        revoked_at datetime2(6) NULL
    );
    CREATE INDEX ix_auth_sessions_account ON dbo.auth_sessions(account_id);
END;
GO
IF OBJECT_ID(N'dbo.auth_refresh_tokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_refresh_tokens (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        session_id uniqueidentifier NOT NULL REFERENCES dbo.auth_sessions(id),
        token_hash varchar(64) NOT NULL UNIQUE,
        used_at datetime2(6) NULL
    );
    CREATE INDEX ix_auth_refresh_session ON dbo.auth_refresh_tokens(session_id);
END;
GO
