IF OBJECT_ID('dbo.account_identity_submissions','U') IS NULL
BEGIN
 CREATE TABLE dbo.account_identity_submissions (
  id bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
  profile_version bigint NOT NULL,
  snapshot_json nvarchar(max) NOT NULL,
  status varchar(24) NOT NULL,
  submitted_at datetime2(6) NOT NULL,
  reviewer_id bigint NULL REFERENCES dbo.auth_accounts(id),
  reviewed_at datetime2(6) NULL,
  reason nvarchar(2000) NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT CK_identity_submission_status CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  CONSTRAINT CK_identity_submission_json CHECK(ISJSON(snapshot_json)=1),
  CONSTRAINT CK_identity_submission_review CHECK(
   (status='PENDING' AND reviewer_id IS NULL AND reviewed_at IS NULL) OR
   (status IN ('APPROVED','REJECTED') AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND reviewer_id<>account_id))
 );
 CREATE UNIQUE INDEX UQ_identity_submission_pending ON dbo.account_identity_submissions(account_id) WHERE status='PENDING';
 CREATE INDEX IX_identity_submission_queue ON dbo.account_identity_submissions(status,submitted_at,id);
 CREATE TABLE dbo.account_identity_submission_images (
  id bigint NOT NULL PRIMARY KEY REFERENCES dbo.account_identity_submissions(id),
  front_content varbinary(max) NOT NULL,front_content_type varchar(30) NOT NULL,
  back_content varbinary(max) NOT NULL,back_content_type varchar(30) NOT NULL
 );
END;
GO
-- Startup replays V55 too: both declarations retain the Admin source on later starts.
IF OBJECT_ID('dbo.CK_external_source','C') IS NOT NULL
 ALTER TABLE dbo.auth_external_identities DROP CONSTRAINT CK_external_source;
GO
ALTER TABLE dbo.auth_external_identities WITH CHECK ADD CONSTRAINT CK_external_source CHECK (
 source='AUTH0_VNEID_SIMULATION'
 OR (source='LOCAL_DEMO' AND issuer='urn:ancu:local-demo' AND subject=CONVERT(varchar(20),account_id))
 OR (source='ADMIN_REVIEW' AND issuer='urn:ancu:admin-review' AND subject=CONVERT(varchar(20),account_id))
);
GO
