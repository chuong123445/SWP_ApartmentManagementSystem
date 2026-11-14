IF OBJECT_ID('dbo.contract_renewal_requests','U') IS NULL
BEGIN
 CREATE TABLE dbo.contract_renewal_requests (
  id bigint IDENTITY PRIMARY KEY,
  contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),
  status varchar(24) NOT NULL,
  message nvarchar(1000) NOT NULL,
  created_at datetime2(6) NOT NULL,
  decision varchar(16) NULL,
  decision_reason nvarchar(1000) NULL,
  decided_at datetime2(6) NULL,
  cancelled_at datetime2(6) NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT ux_renewal_request_contract UNIQUE(contract_id),
  CONSTRAINT ck_renewal_request_status CHECK(status IN('PENDING','ACCEPTED','REJECTED','FULFILLED','CANCELLED')),
  CONSTRAINT ck_renewal_request_decision CHECK(decision IN('ACCEPT','REJECT'))
 );
END;
GO
IF COL_LENGTH('dbo.contract_renewal_requests','cancelled_at') IS NULL
 ALTER TABLE dbo.contract_renewal_requests ADD cancelled_at datetime2(6) NULL;
GO
IF OBJECT_ID('dbo.contract_expiry_notices','U') IS NULL
BEGIN
 CREATE TABLE dbo.contract_expiry_notices (
  id bigint IDENTITY PRIMARY KEY,
  contract_id bigint NOT NULL REFERENCES dbo.rental_contracts(id),
  recipient_id bigint NOT NULL REFERENCES dbo.auth_accounts(id),
  expires_on date NOT NULL,
  days_before int NOT NULL CHECK(days_before IN(10,20)),
  created_at datetime2(6) NOT NULL,
  CONSTRAINT ux_contract_expiry_notice UNIQUE(contract_id,recipient_id,expires_on,days_before)
 );
END;
GO
