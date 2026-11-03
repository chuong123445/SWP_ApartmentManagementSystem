-- Independent of V43/V44 (separate billing-view unit). Additive and rerunnable.
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.rental_apartments') AND name='uq_apartment_source_scope')
    ALTER TABLE dbo.rental_apartments ADD CONSTRAINT uq_apartment_source_scope UNIQUE(id,property_id);
GO
IF OBJECT_ID(N'dbo.property_source_import_batches',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_source_import_batches(
        id bigint IDENTITY NOT NULL PRIMARY KEY,
        property_id bigint NOT NULL REFERENCES dbo.property_external_imports(property_id),
        source_version varchar(64) NOT NULL,
        source_snapshot nvarchar(max) NOT NULL,
        imported_at datetime2(6) NOT NULL,
        legacy bit NOT NULL CONSTRAINT df_source_batch_legacy DEFAULT 0,
        CONSTRAINT uq_source_batch_scope UNIQUE(id,property_id)
    );
    CREATE UNIQUE INDEX uq_source_batch_legacy ON dbo.property_source_import_batches(property_id) WHERE legacy=1;
END;
GO
IF OBJECT_ID(N'dbo.property_source_units',N'U') IS NULL
BEGIN
    CREATE TABLE dbo.property_source_units(
        apartment_id bigint NOT NULL PRIMARY KEY,
        property_id bigint NOT NULL REFERENCES dbo.property_external_imports(property_id),
        external_unit_id nvarchar(100) COLLATE Latin1_General_100_BIN2 NOT NULL,
        batch_id bigint NOT NULL,
        imported_at datetime2(6) NOT NULL,
        CONSTRAINT uq_property_source_unit UNIQUE(property_id,external_unit_id),
        CONSTRAINT fk_source_unit_apartment_scope FOREIGN KEY(apartment_id,property_id) REFERENCES dbo.rental_apartments(id,property_id),
        CONSTRAINT fk_source_unit_batch_scope FOREIGN KEY(batch_id,property_id) REFERENCES dbo.property_source_import_batches(id,property_id)
    );
END;
GO
-- Reconcile only entire legacy properties whose saved snapshot matches every
-- existing apartment exactly. Ambiguous/unmatched properties remain blocked;
-- no business rows or snapshots are changed and no live Auth0 call is made.
DECLARE @matches TABLE(property_id bigint,apartment_id bigint,external_unit_id nvarchar(100));
INSERT INTO @matches
SELECT e.property_id,a.id,s.external_unit_id
FROM dbo.property_external_imports e
CROSS APPLY OPENJSON(CASE WHEN ISJSON(e.source_snapshot)=1 THEN e.source_snapshot ELSE N'{}' END,'$.units')
WITH(external_unit_id nvarchar(max) '$.externalUnitId',code nvarchar(max) '$.code',area_m2 nvarchar(100) '$.areaM2',bedrooms int '$.bedrooms',bathrooms int '$.bathrooms') s
JOIN dbo.rental_apartments a ON a.property_id=e.property_id
    AND a.room_number COLLATE Latin1_General_100_BIN2=LTRIM(RTRIM(s.code)) COLLATE Latin1_General_100_BIN2
    AND a.area_m2=TRY_CONVERT(decimal(12,2),s.area_m2) AND (a.bedrooms=s.bedrooms OR (a.bedrooms IS NULL AND s.bedrooms IS NULL))
    AND (a.bathrooms=s.bathrooms OR (a.bathrooms IS NULL AND s.bathrooms IS NULL))
WHERE LEN(s.external_unit_id) BETWEEN 1 AND 100;
DECLARE @safe TABLE(property_id bigint PRIMARY KEY);
INSERT INTO @safe
SELECT m.property_id FROM @matches m
WHERE NOT EXISTS(SELECT 1 FROM dbo.property_source_units x WHERE x.property_id=m.property_id)
GROUP BY m.property_id
HAVING COUNT(*)=COUNT(DISTINCT m.apartment_id) AND COUNT(*)=COUNT(DISTINCT m.external_unit_id COLLATE Latin1_General_100_BIN2)
AND COUNT(*)=(SELECT COUNT(*) FROM dbo.rental_apartments a WHERE a.property_id=m.property_id)
AND COUNT(*)=(SELECT COUNT(*) FROM dbo.property_external_imports e CROSS APPLY OPENJSON(CASE WHEN ISJSON(e.source_snapshot)=1 THEN e.source_snapshot ELSE N'{}' END,'$.units') s WHERE e.property_id=m.property_id);
INSERT INTO dbo.property_source_import_batches(property_id,source_version,source_snapshot,imported_at,legacy)
SELECT e.property_id,e.source_version,e.source_snapshot,e.imported_at,1 FROM dbo.property_external_imports e JOIN @safe s ON s.property_id=e.property_id
WHERE NOT EXISTS(SELECT 1 FROM dbo.property_source_import_batches b WHERE b.property_id=e.property_id AND b.legacy=1);
INSERT INTO dbo.property_source_units(apartment_id,property_id,external_unit_id,batch_id,imported_at)
SELECT m.apartment_id,m.property_id,m.external_unit_id,b.id,b.imported_at FROM @matches m
JOIN @safe s ON s.property_id=m.property_id
JOIN dbo.property_source_import_batches b ON b.property_id=m.property_id AND b.legacy=1
WHERE NOT EXISTS(SELECT 1 FROM dbo.property_source_units x WHERE x.apartment_id=m.apartment_id);
GO
