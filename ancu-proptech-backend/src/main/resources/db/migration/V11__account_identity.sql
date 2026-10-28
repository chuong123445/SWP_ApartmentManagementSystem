IF OBJECT_ID(N'dbo.account_identity_profiles',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.account_identity_profiles (
        account_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.auth_accounts(id),
        legal_name nvarchar(100) NOT NULL,
        document_number varchar(12) NOT NULL,
        date_of_birth date NOT NULL,
        issue_date date NOT NULL,
        issue_place nvarchar(200) NOT NULL,
        permanent_address nvarchar(500) NOT NULL,
        current_address nvarchar(500) NOT NULL,
        verification_status varchar(24) NOT NULL DEFAULT 'NOT_VERIFIED',
        updated_at datetime2(6) NOT NULL,
        version bigint NOT NULL DEFAULT 0
    );
END;
GO
IF OBJECT_ID(N'dbo.account_identity_documents',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.account_identity_documents (
        account_id uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.account_identity_profiles(account_id),
        front_content varbinary(max) NOT NULL,
        front_content_type varchar(30) NOT NULL,
        back_content varbinary(max) NOT NULL,
        back_content_type varchar(30) NOT NULL
    );
END;
GO
