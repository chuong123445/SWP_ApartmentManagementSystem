IF COL_LENGTH('dbo.rental_properties','onboarding_application') IS NULL
    ALTER TABLE dbo.rental_properties ADD onboarding_application bit NOT NULL CONSTRAINT df_property_application DEFAULT 0;
IF COL_LENGTH('dbo.rental_properties','right_type') IS NULL
    ALTER TABLE dbo.rental_properties ADD right_type varchar(24) NULL, rights_valid_from date NULL, rights_valid_until date NULL, approved_rights_dossier_id uniqueidentifier NULL;
IF COL_LENGTH('dbo.property_dossiers','rights_valid_from') IS NULL
    ALTER TABLE dbo.property_dossiers ADD rights_valid_from date NULL, rights_valid_until date NULL, original_lease_from date NULL, original_lease_until date NULL, principal_name nvarchar(100) NULL, principal_document_number varchar(12) NULL, applicant_document_number varchar(12) NULL, renewal bit NOT NULL CONSTRAINT df_dossier_renewal DEFAULT 0;
GO
