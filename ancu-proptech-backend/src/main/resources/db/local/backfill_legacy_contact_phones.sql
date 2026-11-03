-- Explicit one-off LOCAL operation, never part of automatic application schema initialization.
IF DB_NAME()<>'proptech_db' AND DB_NAME() NOT LIKE 'ancu[_]%'
    THROW 51000,'Local contact backfill database guard',1;
DECLARE @filled TABLE(account_id bigint PRIMARY KEY);
UPDATE dbo.auth_accounts
SET phone='+849'+RIGHT('00000000'+CONVERT(varchar(20),id % 100000000),8),
    phone_verified=0, version=version+1
OUTPUT inserted.id INTO @filled(account_id)
WHERE phone IS NULL OR LTRIM(RTRIM(phone))='';
-- Contact changes invalidate prior account-security evidence and sessions, just like settings.
UPDATE dbo.auth_sessions SET revoked_at=SYSUTCDATETIME()
WHERE revoked_at IS NULL AND account_id IN(SELECT account_id FROM @filled);
UPDATE dbo.email_change_challenges SET invalidated_at=SYSUTCDATETIME()
WHERE used_at IS NULL AND invalidated_at IS NULL AND account_id IN(SELECT account_id FROM @filled);
GO
