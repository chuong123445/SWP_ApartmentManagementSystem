IF OBJECT_ID('dbo.notification_reads','U') IS NULL
BEGIN
 CREATE TABLE dbo.notification_reads(account_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),notification_key varchar(80) NOT NULL,read_at datetime2(6) NOT NULL,CONSTRAINT pk_notification_reads PRIMARY KEY(account_id,notification_key));
END;
GO
IF COL_LENGTH('dbo.rental_requests','decided_at') IS NULL
 ALTER TABLE dbo.rental_requests ADD decided_at datetime2(6) NULL;
GO
