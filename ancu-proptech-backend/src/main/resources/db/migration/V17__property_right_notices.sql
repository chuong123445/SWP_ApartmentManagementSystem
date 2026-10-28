IF OBJECT_ID(N'dbo.property_right_notices',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_right_notices (
        id uniqueidentifier NOT NULL PRIMARY KEY,
        property_id uniqueidentifier NOT NULL REFERENCES dbo.rental_properties(id),
        recipient_id uniqueidentifier NOT NULL REFERENCES dbo.auth_accounts(id),
        dossier_id uniqueidentifier NOT NULL REFERENCES dbo.property_dossiers(id),
        kind varchar(16) NOT NULL,
        expires_on date NOT NULL,
        created_at datetime2(6) NOT NULL,
        email_status varchar(16) NOT NULL,
        email_destination nvarchar(254) NULL,
        attempts int NOT NULL,
        next_attempt_at datetime2(6) NOT NULL,
        version bigint NOT NULL,
        CONSTRAINT uq_right_notice_dossier_kind UNIQUE(dossier_id,kind)
    );
END;
GO
