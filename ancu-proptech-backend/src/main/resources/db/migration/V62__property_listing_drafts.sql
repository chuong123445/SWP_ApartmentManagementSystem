IF OBJECT_ID('dbo.property_listing_drafts','U') IS NULL
BEGIN
 CREATE TABLE dbo.property_listing_drafts (
 property_id bigint NOT NULL PRIMARY KEY REFERENCES dbo.rental_properties(id),
 request_key varchar(36) NOT NULL UNIQUE,
 account_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
 payload nvarchar(max) NOT NULL,
 completed bit NOT NULL DEFAULT 0,
 updated_at datetime2(6) NOT NULL,
 version bigint NOT NULL DEFAULT 0
 );
 CREATE INDEX ix_listing_draft_account ON dbo.property_listing_drafts(account_id,completed,updated_at);
END;
GO

IF COL_LENGTH('dbo.property_images','apartment_id') IS NULL
 ALTER TABLE dbo.property_images ADD apartment_id bigint NULL REFERENCES dbo.rental_apartments(id);
GO
