IF OBJECT_ID(N'dbo.property_evidence_files', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_evidence_files (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        property_id uniqueidentifier NOT NULL REFERENCES dbo.rental_properties(id),
        uploader_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        purpose varchar(24) NOT NULL,
        filename nvarchar(150) NOT NULL,
        content_type varchar(50) NOT NULL,
        size_bytes bigint NOT NULL,
        created_at datetime2(6) NOT NULL
    );
    CREATE INDEX ix_property_files_property ON dbo.property_evidence_files(property_id);
    CREATE TABLE dbo.property_evidence_content (
        id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.property_evidence_files(id),
        content varbinary(max) NOT NULL
    );
END;
GO
IF OBJECT_ID(N'dbo.property_dossiers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_dossiers (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        property_id uniqueidentifier NOT NULL REFERENCES dbo.rental_properties(id),
        right_type varchar(24) NOT NULL,
        applicant_name nvarchar(100) NOT NULL,
        bank nvarchar(100) NOT NULL,
        account_number varchar(40) NOT NULL,
        account_holder_name nvarchar(100) NOT NULL,
        status varchar(24) NOT NULL,
        submitted_at datetime2(6) NOT NULL,
        reviewed_at datetime2(6) NULL,
        reviewer_id uniqueidentifier NULL REFERENCES dbo.auth_accounts(id),
        review_reason nvarchar(2000) NULL,
        version bigint NOT NULL DEFAULT 0
    );
    CREATE INDEX ix_property_dossiers_queue ON dbo.property_dossiers(status,submitted_at,id);
    CREATE INDEX ix_property_dossiers_property ON dbo.property_dossiers(property_id,submitted_at,id);
    CREATE TABLE dbo.property_dossier_files (
        dossier_id uniqueidentifier NOT NULL REFERENCES dbo.property_dossiers(id),
        file_id uniqueidentifier NOT NULL REFERENCES dbo.property_evidence_files(id),
        PRIMARY KEY(dossier_id,file_id)
    );
END;
GO
