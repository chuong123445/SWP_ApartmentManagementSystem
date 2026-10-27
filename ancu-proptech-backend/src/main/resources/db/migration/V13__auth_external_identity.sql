IF OBJECT_ID(N'dbo.auth_external_identities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.auth_external_identities (
        account_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.auth_accounts(id),
        issuer varchar(255) COLLATE Latin1_General_100_BIN2 NOT NULL,
        subject varchar(255) COLLATE Latin1_General_100_BIN2 NOT NULL,
        document_number varchar(12) NOT NULL UNIQUE,
        legal_name nvarchar(100) NOT NULL,
        date_of_birth date NOT NULL,
        gender nvarchar(30) NOT NULL,
        address nvarchar(300) NOT NULL,
        source varchar(40) NOT NULL,
        verification_status varchar(20) NOT NULL,
        verified_at datetime2(6) NOT NULL,
        version bigint NOT NULL DEFAULT 0,
        CONSTRAINT UQ_external_subject UNIQUE (issuer, subject),
        CONSTRAINT CK_external_verified CHECK (verification_status = 'VERIFIED'),
        CONSTRAINT CK_external_source CHECK (source = 'AUTH0_VNEID_SIMULATION')
    );
END;
GO
ALTER TABLE dbo.auth_accounts ALTER COLUMN password_hash varchar(100) NULL;
GO
