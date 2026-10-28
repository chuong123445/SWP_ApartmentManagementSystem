-- Additive draft authoring only. No changes to existing accounts/contracts or activation.
IF OBJECT_ID('dbo.contract_drafts','U') IS NULL
BEGIN
 CREATE TABLE dbo.contract_drafts (
 id uniqueidentifier NOT NULL PRIMARY KEY,
 contract_id uniqueidentifier NOT NULL UNIQUE REFERENCES dbo.rental_contracts(id),
 rental_request_id uniqueidentifier NOT NULL UNIQUE REFERENCES dbo.rental_requests(id),
 snapshot_json nvarchar(max) NOT NULL, clauses_json nvarchar(max) NOT NULL,
 deposit decimal(15,2) NOT NULL, payment_day int NOT NULL,
 payment_method nvarchar(300) NOT NULL, usage_purpose nvarchar(300) NOT NULL,
 created_at datetime2(6) NOT NULL, content_version bigint NOT NULL DEFAULT 0,
 CONSTRAINT ck_contract_draft_deposit CHECK(deposit>=0),
 CONSTRAINT ck_contract_draft_payment_day CHECK(payment_day BETWEEN 1 AND 28));
END;
GO
