-- User-authorized retirement of these exact three legacy archives only.
-- Runs after legacy import/ID conversion, before role migrations; back up before deployment.
-- Safe to replay when absent. Preserve tenants, ID mappings and all active tables.
SET XACT_ABORT ON;
IF EXISTS(SELECT 1 FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo') AND name IN
 ('legacy_invoices_archive','legacy_room_amenities_archive','legacy_rooms_archive'))
BEGIN
 BEGIN TRY
  BEGIN TRANSACTION;
  IF EXISTS(SELECT 1 FROM sys.foreign_keys f
   WHERE f.referenced_object_id IN(OBJECT_ID('dbo.legacy_invoices_archive'),OBJECT_ID('dbo.legacy_room_amenities_archive'),OBJECT_ID('dbo.legacy_rooms_archive'))
   AND NOT EXISTS(SELECT 1 FROM sys.tables t WHERE t.object_id=f.parent_object_id AND t.schema_id=SCHEMA_ID('dbo')
    AND t.name IN('legacy_invoices_archive','legacy_room_amenities_archive','legacy_rooms_archive')))
   THROW 51000,'An external table references a retiring archive; preserve it and review.',1;
  IF EXISTS(SELECT 1 FROM sys.sql_expression_dependencies d
   JOIN sys.objects o ON o.object_id=d.referencing_id
   WHERE d.referenced_id IN(OBJECT_ID('dbo.legacy_invoices_archive'),OBJECT_ID('dbo.legacy_room_amenities_archive'),OBJECT_ID('dbo.legacy_rooms_archive'))
   AND NOT EXISTS(SELECT 1 FROM sys.tables t WHERE t.object_id IN(o.object_id,o.parent_object_id) AND t.schema_id=SCHEMA_ID('dbo')
    AND t.name IN('legacy_invoices_archive','legacy_room_amenities_archive','legacy_rooms_archive')))
   THROW 51000,'An external SQL object references a retiring archive; review before retirement.',1;
  -- Child before parent. No CASCADE; tenants/mappings/active data are untouched.
  IF OBJECT_ID('dbo.legacy_room_amenities_archive','U') IS NOT NULL DROP TABLE dbo.legacy_room_amenities_archive;
  IF OBJECT_ID('dbo.legacy_invoices_archive','U') IS NOT NULL DROP TABLE dbo.legacy_invoices_archive;
  IF OBJECT_ID('dbo.legacy_rooms_archive','U') IS NOT NULL DROP TABLE dbo.legacy_rooms_archive;
  COMMIT;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK;
  THROW;
 END CATCH;
END;
GO
