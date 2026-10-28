-- Chuyển khóa đang hoạt động, giữ nguyên dữ liệu/snapshot và ánh xạ ID cũ.
-- Chạy trong maintenance window sau COPY_ONLY backup. Không dùng để reset dữ liệu.
SET XACT_ABORT ON;
IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.auth_accounts') AND name='id' AND system_type_id=36)
BEGIN
 IF EXISTS(SELECT 1 FROM dbo.auth_accounts) AND COALESCE(TRY_CONVERT(int,SESSION_CONTEXT(N'identity_migration_approved')),0)<>1
  THROW 51000,'Existing data requires verified backup and tools/identity-migration.ps1 Apply before starting the new application.',1;
 BEGIN TRY
  BEGIN TRANSACTION;
  CREATE TABLE dbo.legacy_id_mappings(entity_name varchar(128) NOT NULL,legacy_id varchar(64) NOT NULL,numeric_id bigint NOT NULL,CONSTRAINT pk_legacy_id_mappings PRIMARY KEY(entity_name,legacy_id),CONSTRAINT uq_legacy_numeric UNIQUE(entity_name,numeric_id));
  CREATE TABLE #roots(table_name sysname PRIMARY KEY);
  INSERT #roots VALUES('auth_accounts'),('auth_sessions'),('auth_refresh_tokens'),('email_change_challenges'),('rental_properties'),('rental_apartments'),('rental_requests'),('rental_contracts'),('contract_drafts'),('rental_invoices'),('invoice_notifications'),('property_dossiers'),('property_evidence_files'),('property_right_notices'),('property_images'),('escrow_deposits');
  DELETE r FROM #roots r WHERE OBJECT_ID('dbo.'+r.table_name,'U') IS NULL;
  CREATE TABLE #columns(table_name sysname,column_name sysname,root_name sysname,nullable bit,PRIMARY KEY(table_name,column_name));
  INSERT #columns SELECT t.name,c.name,t.name,c.is_nullable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN #roots r ON r.table_name=t.name WHERE c.name='id';
  -- Khóa ngoại một cột trỏ trực tiếp bảng gốc.
  INSERT #columns SELECT OBJECT_NAME(f.parent_object_id),COL_NAME(f.parent_object_id,f.parent_column_id),OBJECT_NAME(f.referenced_object_id),c.is_nullable
   FROM sys.foreign_key_columns f JOIN #roots r ON r.table_name=OBJECT_NAME(f.referenced_object_id)
   JOIN sys.columns c ON c.object_id=f.parent_object_id AND c.column_id=f.parent_column_id
   WHERE NOT EXISTS(SELECT 1 FROM #columns x WHERE x.table_name=OBJECT_NAME(f.parent_object_id) AND x.column_name=c.name);
  -- Các tham chiếu có ý nghĩa nghiệp vụ nhưng schema cũ chưa khai báo FK.
  INSERT #columns SELECT v.t,v.c,v.r,c.is_nullable FROM (VALUES
   ('rental_properties','approved_rights_dossier_id','property_dossiers'),
   ('property_right_notices','recipient_id','auth_accounts'),('property_right_notices','dossier_id','property_dossiers'),
   ('property_images','uploader_id','auth_accounts'),('property_images','property_id','rental_properties'),
   ('account_identity_profiles','account_id','auth_accounts'),('account_identity_documents','account_id','auth_accounts'),
   ('auth_external_identities','account_id','auth_accounts'),('auth_owner_upgrades','account_id','auth_accounts'),
   ('property_external_imports','property_id','rental_properties'),('property_evidence_content','id','property_evidence_files'))v(t,c,r)
   JOIN sys.columns c ON c.object_id=OBJECT_ID('dbo.'+v.t) AND c.name=v.c
   WHERE NOT EXISTS(SELECT 1 FROM #columns x WHERE x.table_name=v.t AND x.column_name=v.c);
  IF EXISTS(SELECT 1 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id WHERE c.system_type_id=36 AND NOT EXISTS(SELECT 1 FROM #columns x WHERE x.table_name=t.name AND x.column_name=c.name))
   THROW 51000,'Unmapped UUID column: review schema before migration.',1;
  CREATE TABLE #ddl(seq int IDENTITY PRIMARY KEY,drop_sql nvarchar(max),create_sql nvarchar(max),priority int);
  INSERT #ddl(drop_sql,create_sql,priority)
   SELECT 'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+' DROP CONSTRAINT '+QUOTENAME(f.name),
    'ALTER TABLE dbo.'+QUOTENAME(OBJECT_NAME(f.parent_object_id))+' WITH CHECK ADD CONSTRAINT '+QUOTENAME(f.name)+' FOREIGN KEY ('+
    (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.parent_object_id,fc.parent_column_id))),',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+') REFERENCES dbo.'+QUOTENAME(OBJECT_NAME(f.referenced_object_id))+' ('+
    (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(COL_NAME(fc.referenced_object_id,fc.referenced_column_id))),',') WITHIN GROUP(ORDER BY fc.constraint_column_id) FROM sys.foreign_key_columns fc WHERE fc.constraint_object_id=f.object_id)+') ON DELETE '+REPLACE(f.delete_referential_action_desc,'_',' ')+' ON UPDATE '+REPLACE(f.update_referential_action_desc,'_',' '),3
   FROM sys.foreign_keys f WHERE EXISTS(SELECT 1 FROM #columns x WHERE OBJECT_ID('dbo.'+x.table_name) IN(f.parent_object_id,f.referenced_object_id));
  INSERT #ddl(drop_sql,create_sql,priority)
   SELECT CASE WHEN i.is_primary_key=1 OR i.is_unique_constraint=1 THEN 'ALTER TABLE dbo.'+QUOTENAME(t.name)+' DROP CONSTRAINT '+QUOTENAME(i.name) ELSE 'DROP INDEX '+QUOTENAME(i.name)+' ON dbo.'+QUOTENAME(t.name) END,
   CASE WHEN i.is_primary_key=1 OR i.is_unique_constraint=1 THEN 'ALTER TABLE dbo.'+QUOTENAME(t.name)+' ADD CONSTRAINT '+QUOTENAME(i.name)+CASE WHEN i.is_primary_key=1 THEN ' PRIMARY KEY ' ELSE ' UNIQUE ' END
    ELSE 'CREATE '+CASE WHEN i.is_unique=1 THEN 'UNIQUE ' ELSE '' END END+
   CASE WHEN i.type=1 THEN 'CLUSTERED ' ELSE 'NONCLUSTERED ' END+CASE WHEN i.is_primary_key=0 AND i.is_unique_constraint=0 THEN 'INDEX '+QUOTENAME(i.name)+' ON dbo.'+QUOTENAME(t.name) ELSE '' END+' ('+
   (SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)+CASE WHEN ic.is_descending_key=1 THEN ' DESC' ELSE ' ASC' END),',') WITHIN GROUP(ORDER BY ic.key_ordinal) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0)+')'+
   CASE WHEN EXISTS(SELECT 1 FROM sys.index_columns ic WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1) THEN ' INCLUDE ('+(SELECT STRING_AGG(CONVERT(nvarchar(max),QUOTENAME(c.name)),',') WITHIN GROUP(ORDER BY ic.index_column_id) FROM sys.index_columns ic JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.is_included_column=1)+')' ELSE '' END+
   CASE WHEN i.has_filter=1 THEN ' WHERE '+i.filter_definition ELSE '' END,CASE WHEN i.type=1 THEN 1 ELSE 2 END
   FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE i.type IN(1,2) AND i.is_hypothetical=0 AND EXISTS(SELECT 1 FROM #columns x WHERE x.table_name=t.name);
  DECLARE @t sysname,@c sysname,@r sysname,@nullable bit,@sql nvarchar(max),@drop nvarchar(max),@create nvarchar(max);
  DECLARE roots CURSOR LOCAL FAST_FORWARD FOR SELECT table_name FROM #roots ORDER BY table_name;
  OPEN roots;FETCH NEXT FROM roots INTO @t;
  WHILE @@FETCH_STATUS=0 BEGIN
   SET @sql='ALTER TABLE dbo.'+QUOTENAME(@t)+' ADD __numeric_id bigint IDENTITY(1,1) NOT NULL;';EXEC sp_executesql @sql; SET @sql='INSERT dbo.legacy_id_mappings SELECT '''+@t+''',CONVERT(varchar(64),id),__numeric_id FROM dbo.'+QUOTENAME(@t)+';';EXEC sp_executesql @sql;
   FETCH NEXT FROM roots INTO @t;
  END;CLOSE roots;DEALLOCATE roots;
  DECLARE cols CURSOR LOCAL FAST_FORWARD FOR SELECT table_name,column_name,root_name,nullable FROM #columns WHERE NOT(column_name='id' AND table_name=root_name) ORDER BY table_name,column_name;
  OPEN cols;FETCH NEXT FROM cols INTO @t,@c,@r,@nullable;
  WHILE @@FETCH_STATUS=0 BEGIN
   SET @sql='ALTER TABLE dbo.'+QUOTENAME(@t)+' ADD '+QUOTENAME('__n_'+@c)+' bigint NULL;';EXEC sp_executesql @sql; SET @sql='UPDATE a SET '+QUOTENAME('__n_'+@c)+'=m.numeric_id FROM dbo.'+QUOTENAME(@t)+' a JOIN dbo.legacy_id_mappings m ON m.entity_name='''+@r+''' AND m.legacy_id=CONVERT(varchar(64),a.'+QUOTENAME(@c)+'); IF EXISTS(SELECT 1 FROM dbo.'+QUOTENAME(@t)+' WHERE '+QUOTENAME(@c)+' IS NOT NULL AND '+QUOTENAME('__n_'+@c)+' IS NULL) THROW 51000,''Unmapped non-null reference.'',1;';EXEC sp_executesql @sql;
   FETCH NEXT FROM cols INTO @t,@c,@r,@nullable;
  END;CLOSE cols;DEALLOCATE cols;
  DECLARE drops CURSOR LOCAL FAST_FORWARD FOR SELECT drop_sql FROM #ddl ORDER BY priority DESC,seq;
  OPEN drops;FETCH NEXT FROM drops INTO @drop;WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @drop;FETCH NEXT FROM drops INTO @drop;END;CLOSE drops;DEALLOCATE drops;
  -- Drop defaults/statistics depending on old ID columns before replacing them.
  DECLARE defs CURSOR LOCAL FAST_FORWARD FOR SELECT 'ALTER TABLE dbo.'+QUOTENAME(t.name)+' DROP CONSTRAINT '+QUOTENAME(d.name) FROM sys.default_constraints d JOIN sys.tables t ON t.object_id=d.parent_object_id JOIN #columns x ON x.table_name=t.name AND x.column_name=COL_NAME(d.parent_object_id,d.parent_column_id);
  OPEN defs;FETCH NEXT FROM defs INTO @sql;WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM defs INTO @sql;END;CLOSE defs;DEALLOCATE defs;
  DECLARE stats CURSOR LOCAL FAST_FORWARD FOR SELECT DISTINCT 'DROP STATISTICS dbo.'+QUOTENAME(t.name)+'.'+QUOTENAME(s.name) FROM sys.stats s JOIN sys.tables t ON t.object_id=s.object_id JOIN sys.stats_columns sc ON sc.object_id=s.object_id AND sc.stats_id=s.stats_id JOIN #columns x ON x.table_name=t.name AND x.column_name=COL_NAME(sc.object_id,sc.column_id) WHERE s.user_created=1;
  OPEN stats;FETCH NEXT FROM stats INTO @sql;WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @sql;FETCH NEXT FROM stats INTO @sql;END;CLOSE stats;DEALLOCATE stats;
  DECLARE replacecols CURSOR LOCAL FAST_FORWARD FOR SELECT table_name,column_name,root_name,nullable FROM #columns ORDER BY table_name,column_name;
  OPEN replacecols;FETCH NEXT FROM replacecols INTO @t,@c,@r,@nullable;
  WHILE @@FETCH_STATUS=0 BEGIN
   SET @sql='ALTER TABLE dbo.'+QUOTENAME(@t)+' DROP COLUMN '+QUOTENAME(@c)+';';EXEC sp_executesql @sql;
   DECLARE @old nvarchar(776)='dbo.'+QUOTENAME(@t)+'.'+QUOTENAME(CASE WHEN @c='id' AND @t=@r THEN '__numeric_id' ELSE '__n_'+@c END);
   EXEC sp_rename @old,@c,'COLUMN';
   IF NOT(@c='id' AND @t=@r) BEGIN SET @sql='ALTER TABLE dbo.'+QUOTENAME(@t)+' ALTER COLUMN '+QUOTENAME(@c)+' bigint '+CASE WHEN @nullable=1 THEN 'NULL' ELSE 'NOT NULL' END;EXEC sp_executesql @sql;END;
   FETCH NEXT FROM replacecols INTO @t,@c,@r,@nullable;
  END;CLOSE replacecols;DEALLOCATE replacecols;
  DECLARE creates CURSOR LOCAL FAST_FORWARD FOR SELECT create_sql FROM #ddl ORDER BY priority,seq;
  OPEN creates;FETCH NEXT FROM creates INTO @create;WHILE @@FETCH_STATUS=0 BEGIN EXEC sp_executesql @create;FETCH NEXT FROM creates INTO @create;END;CLOSE creates;DEALLOCATE creates;
  -- ID phiên đã đổi: giữ lịch sử nhưng bắt đăng nhập lại, không để JWT/OTP cũ bị hiểu sai.
  UPDATE dbo.auth_sessions SET revoked_at=COALESCE(revoked_at,SYSUTCDATETIME());
  UPDATE dbo.email_change_challenges SET invalidated_at=COALESCE(invalidated_at,SYSUTCDATETIME()) WHERE used_at IS NULL;
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH;
END;
GO
