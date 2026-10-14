-- Nullable certificate metadata keeps historical dossiers/snapshots compatible.
IF COL_LENGTH('dbo.property_dossiers','certificate_number') IS NULL
 ALTER TABLE dbo.property_dossiers ADD certificate_number nvarchar(100) NULL;
GO
IF COL_LENGTH('dbo.property_dossiers','certificate_issue_date') IS NULL
 ALTER TABLE dbo.property_dossiers ADD certificate_issue_date date NULL;
GO
IF COL_LENGTH('dbo.property_dossiers','certificate_issue_place') IS NULL
 ALTER TABLE dbo.property_dossiers ADD certificate_issue_place nvarchar(200) NULL;
GO
IF COL_LENGTH('dbo.property_dossiers','exploitation_right_description') IS NULL
 ALTER TABLE dbo.property_dossiers ADD exploitation_right_description nvarchar(1000) NULL;
GO
IF COL_LENGTH('dbo.property_dossiers','local_fixture') IS NULL
 ALTER TABLE dbo.property_dossiers ADD local_fixture bit NOT NULL CONSTRAINT df_dossier_local_fixture DEFAULT 0;
GO
IF COL_LENGTH('dbo.account_identity_profiles','local_fixture') IS NULL
 ALTER TABLE dbo.account_identity_profiles ADD local_fixture bit NOT NULL CONSTRAINT df_identity_local_fixture DEFAULT 0;
GO
