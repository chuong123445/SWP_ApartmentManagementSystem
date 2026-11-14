-- SePay transaction IDs are deduplicated within each owner's integration.
-- An unmatched notification received by another owner's endpoint must not consume it.
DECLARE @sql nvarchar(max)=N'';
SELECT @sql=@sql+CASE WHEN i.is_unique_constraint=1
 THEN N'ALTER TABLE dbo.sepay_events DROP CONSTRAINT '+QUOTENAME(i.name)+N';'
 ELSE N'DROP INDEX '+QUOTENAME(i.name)+N' ON dbo.sepay_events;' END
FROM sys.indexes i
WHERE i.object_id=OBJECT_ID(N'dbo.sepay_events') AND i.is_unique=1 AND i.is_primary_key=0
AND (SELECT COUNT(*) FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)=1
AND EXISTS(SELECT 1 FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
 WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal=1 AND c.name=N'transaction_id');
IF LEN(@sql)>0 EXEC sp_executesql @sql;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.sepay_events') AND name=N'ux_sepay_event_owner_transaction')
ALTER TABLE dbo.sepay_events ADD CONSTRAINT ux_sepay_event_owner_transaction UNIQUE(owner_id,transaction_id);
GO
