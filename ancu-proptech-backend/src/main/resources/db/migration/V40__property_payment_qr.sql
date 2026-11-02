IF COL_LENGTH('dbo.owner_payment_qrs','property_id') IS NULL
 ALTER TABLE dbo.owner_payment_qrs ADD property_id bigint NULL REFERENCES dbo.rental_properties(id);
GO
IF COL_LENGTH('dbo.rental_properties','private_payment_qr_id') IS NULL
 ALTER TABLE dbo.rental_properties ADD private_payment_qr_id bigint NULL REFERENCES dbo.owner_payment_qrs(id);
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='ix_qr_scope_confirmed' AND object_id=OBJECT_ID('dbo.owner_payment_qrs'))
 CREATE INDEX ix_qr_scope_confirmed ON dbo.owner_payment_qrs(owner_id,property_id,confirmed_at,id);
GO
