IF OBJECT_ID(N'dbo.property_source_consents',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.property_source_consents (
 account_id bigint NOT NULL PRIMARY KEY REFERENCES dbo.auth_accounts(id),
 issuer varchar(300) NOT NULL, subject varchar(255) NOT NULL,
 consented_at datetime2(6) NOT NULL, consent_version varchar(40) NOT NULL
 );
END;
GO
