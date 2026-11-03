-- Schema only: generated contact data is an explicitly authorized local operation.
IF COL_LENGTH('dbo.auth_accounts','contact_details_confirmed_at') IS NULL
    ALTER TABLE dbo.auth_accounts ADD contact_details_confirmed_at datetime2(6) NULL;
GO
