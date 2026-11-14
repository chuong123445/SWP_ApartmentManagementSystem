-- Rent invoices always send automatically; retain enum values for old clients/history.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF COL_LENGTH('dbo.property_settings','rent_invoice_mode') IS NOT NULL
BEGIN
 DECLARE @DefaultName sysname,@Definition nvarchar(max);
 SELECT @DefaultName=d.name,@Definition=d.definition FROM sys.default_constraints d
 JOIN sys.columns c ON c.object_id=d.parent_object_id AND c.column_id=d.parent_column_id
 WHERE d.parent_object_id=OBJECT_ID('dbo.property_settings') AND c.name='rent_invoice_mode';
 IF @DefaultName IS NOT NULL AND @Definition NOT LIKE '%SEND%'
 BEGIN
  DECLARE @Sql nvarchar(max)='ALTER TABLE dbo.property_settings DROP CONSTRAINT '+QUOTENAME(@DefaultName);
  EXEC sp_executesql @Sql;
  SET @DefaultName=NULL;
 END;
 IF @DefaultName IS NULL
  ALTER TABLE dbo.property_settings ADD CONSTRAINT df_property_rent_send DEFAULT 'SEND' FOR rent_invoice_mode;
 UPDATE dbo.property_settings SET rent_invoice_mode='SEND',version=version+1 WHERE rent_invoice_mode<>'SEND';
END;
GO
