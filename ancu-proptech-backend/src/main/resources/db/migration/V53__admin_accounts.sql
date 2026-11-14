IF COL_LENGTH('dbo.auth_accounts', 'deleted_at') IS NULL
    ALTER TABLE dbo.auth_accounts ADD deleted_at DATETIME2(6) NULL;
IF COL_LENGTH('dbo.auth_accounts', 'locked_from_status') IS NULL
    ALTER TABLE dbo.auth_accounts ADD locked_from_status VARCHAR(24) NULL;
GO
IF OBJECT_ID('dbo.admin_account_events','U') IS NULL
BEGIN
    CREATE TABLE dbo.admin_account_events (
        id BIGINT IDENTITY PRIMARY KEY,
        actor_id BIGINT NOT NULL REFERENCES dbo.auth_accounts(id),
        target_account_id BIGINT NOT NULL,
        target_email NVARCHAR(254) NOT NULL,
        outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('LOCKED','UNLOCKED','SOFT_DELETED','HARD_DELETED')),
        reason NVARCHAR(500) NOT NULL,
        created_at DATETIME2(6) NOT NULL
    );
END;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.admin_account_events') AND name='ix_admin_account_event_target')
    CREATE INDEX ix_admin_account_event_target ON dbo.admin_account_events(target_account_id, id DESC);
