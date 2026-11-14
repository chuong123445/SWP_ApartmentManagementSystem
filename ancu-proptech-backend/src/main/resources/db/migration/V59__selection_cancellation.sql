IF OBJECT_ID('dbo.selection_cancellations','U') IS NULL
 CREATE TABLE dbo.selection_cancellations (
 request_id bigint NOT NULL PRIMARY KEY REFERENCES dbo.rental_requests(id),state varchar(20) NOT NULL CHECK(state IN('PENDING','CANCELLED','REJECTED','WITHDRAWN')),
 proposer_id bigint NOT NULL,reason nvarchar(2000) NOT NULL,responder_id bigint NULL,response_reason nvarchar(2000) NULL,
 created_at datetime2(6) NOT NULL,updated_at datetime2(6) NOT NULL,version bigint NOT NULL DEFAULT 0);
GO
IF OBJECT_ID('dbo.selection_cancellation_events','U') IS NULL
BEGIN
 CREATE TABLE dbo.selection_cancellation_events (
 id bigint IDENTITY PRIMARY KEY,request_id bigint NOT NULL REFERENCES dbo.rental_requests(id),actor_id bigint NOT NULL,actor_name nvarchar(100) NOT NULL,
 action varchar(24) NOT NULL,reason nvarchar(2000) NULL,created_at datetime2(6) NOT NULL,before_json nvarchar(max) NOT NULL,after_json nvarchar(max) NOT NULL);
 CREATE INDEX ix_selection_cancel_events_request ON dbo.selection_cancellation_events(request_id,id);
END;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_requests') AND name='ix_request_accepted_apartment')
 CREATE INDEX ix_request_accepted_apartment ON dbo.rental_requests(apartment_id,id) WHERE status='ACCEPTED';
GO
