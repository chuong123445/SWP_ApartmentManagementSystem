-- User explicitly authorized generated, unverified format-correct numbers for legacy blanks.
-- These numbers are NOT evidence of phone possession and must not be marked verified.
IF COL_LENGTH('dbo.auth_accounts','contact_details_confirmed_at') IS NULL
    ALTER TABLE dbo.auth_accounts ADD contact_details_confirmed_at datetime2(6) NULL;
GO
UPDATE dbo.auth_accounts
SET phone='+849'+RIGHT('00000000'+CONVERT(varchar(20),id % 100000000),8),
    phone_verified=0, version=version+1
WHERE phone IS NULL OR LTRIM(RTRIM(phone))='';
GO
