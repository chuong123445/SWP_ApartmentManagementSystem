-- User explicitly authorized generated, unverified format-correct numbers for legacy blanks.
-- These numbers are NOT evidence of phone possession and must not be marked verified.
IF COL_LENGTH('dbo.auth_accounts','contact_details_confirmed_at') IS NULL
    ALTER TABLE dbo.auth_accounts ADD contact_details_confirmed_at datetime2(6) NULL;
GO
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
