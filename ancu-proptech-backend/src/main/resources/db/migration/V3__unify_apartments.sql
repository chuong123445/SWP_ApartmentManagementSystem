-- Apartment is the only active inventory. Preserve the retired inventory as an archive.
IF COL_LENGTH('dbo.rental_apartments', 'room_number') IS NULL
BEGIN
    ALTER TABLE dbo.rental_apartments ADD room_number nvarchar(20) NULL,
        floor int NULL, deposit decimal(15,2) NULL,
        electricity_index int NULL, water_index int NULL, max_occupants int NULL;
END;
GO
UPDATE dbo.rental_apartments
SET room_number = CASE WHEN CHARINDEX(N' — ', title) > 0
    THEN LEFT(LTRIM(RTRIM(SUBSTRING(title, CHARINDEX(N' — ', title) + 3, 150))), 20)
    ELSE CONCAT('APT-', LEFT(CONVERT(varchar(36), id), 8)) END
WHERE room_number IS NULL;
GO
UPDATE dbo.rental_apartments SET floor = CONVERT(int, SUBSTRING(room_number, 3, 1))
WHERE floor IS NULL AND room_number LIKE '[AB].[0-9][0-9][0-9]';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.rental_apartments') AND name = 'ux_apartment_property_number')
    CREATE UNIQUE INDEX ux_apartment_property_number ON dbo.rental_apartments(property_id, room_number) WHERE room_number IS NOT NULL;
GO
IF OBJECT_ID('dbo.rooms', 'U') IS NOT NULL
BEGIN
    IF OBJECT_ID('dbo.legacy_rooms_archive', 'U') IS NOT NULL
        THROW 51000, 'Both rooms and legacy_rooms_archive exist; resolve the archive conflict without losing data.', 1;
    EXEC sys.sp_rename 'dbo.rooms', 'legacy_rooms_archive';
END;
GO
IF OBJECT_ID('dbo.room_amenities', 'U') IS NOT NULL
BEGIN
    IF OBJECT_ID('dbo.legacy_room_amenities_archive', 'U') IS NOT NULL
        THROW 51000, 'Both room_amenities and its archive exist; resolve without losing data.', 1;
    EXEC sys.sp_rename 'dbo.room_amenities', 'legacy_room_amenities_archive';
END;
GO
