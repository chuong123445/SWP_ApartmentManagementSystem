-- Explicit user decision: transfer the archived rooms to owner@ancu.local as drafts.
-- Preserve room UUIDs so existing room references are not changed.
IF OBJECT_ID('dbo.legacy_rooms_archive', 'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.legacy_rooms_archive r WHERE NOT EXISTS
        (SELECT 1 FROM dbo.rental_apartments a WHERE a.id = TRY_CONVERT(uniqueidentifier, r.id)))
    BEGIN
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        BEGIN TRY
        DECLARE @ownerId uniqueidentifier = (SELECT id FROM dbo.auth_accounts WHERE email = 'owner@ancu.local' AND role = 'OWNER');
        IF @ownerId IS NULL THROW 51000, 'Confirmed legacy owner account is missing; no import was performed.', 1;
        IF EXISTS (SELECT 1 FROM dbo.legacy_rooms_archive WHERE TRY_CONVERT(uniqueidentifier, id) IS NULL
            OR area IS NULL OR area <= 0 OR price IS NULL OR price < 0
            OR status NOT IN ('AVAILABLE', 'RENTED', 'OVERDUE', 'EXPIRING', 'MAINTENANCE'))
            THROW 51000, 'Legacy room data needs review before import; archive remains intact.', 1;
        DECLARE @propertyId uniqueidentifier = (SELECT TOP (1) id FROM dbo.rental_properties
            WHERE owner_id = @ownerId AND name = N'Phòng chuyển đổi từ dữ liệu cũ' ORDER BY id);
        IF @propertyId IS NULL
        BEGIN
            SET @propertyId = NEWID();
            INSERT dbo.rental_properties (id, owner_id, name, address, city, district, approval_status, version)
            VALUES (@propertyId, @ownerId, N'Phòng chuyển đổi từ dữ liệu cũ', N'Chưa cập nhật địa chỉ',
                N'Chưa cập nhật', N'Chưa cập nhật', 'PENDING_APPROVAL', 0);
        END;
        INSERT dbo.rental_apartments (id, property_id, room_number, title, description, floor,
            area_m2, advertised_monthly_rent, deposit, electricity_index, water_index, max_occupants,
            bedrooms, bathrooms, cover_image_path, publication_status, availability, created_at, version)
        SELECT CONVERT(uniqueidentifier, r.id), @propertyId, r.room_number, CONCAT(N'Căn hộ ', r.room_number),
            COALESCE(r.description, N''), r.floor, CONVERT(decimal(12,2), r.area), r.price,
            r.deposit, r.electricity_index, r.water_index, r.max_occupants, r.bedrooms, r.bathrooms,
            CASE (ABS(CHECKSUM(r.id)) % 5)
                WHEN 0 THEN '/apartment/images/apartment1.jpg'
                WHEN 1 THEN '/apartment/images/department2.jpg'
                WHEN 2 THEN '/apartment/images/apartment3.jpg'
                WHEN 3 THEN '/apartment/images/apartment4.jpg'
                ELSE '/apartment/images/department5.webp'
            END, 'DRAFT',
            CASE r.status WHEN 'AVAILABLE' THEN 'VACANT' WHEN 'MAINTENANCE' THEN 'MAINTENANCE' ELSE 'OCCUPIED' END,
            SYSUTCDATETIME(), 0
        FROM dbo.legacy_rooms_archive r
        WHERE NOT EXISTS (SELECT 1 FROM dbo.rental_apartments a WHERE a.id = CONVERT(uniqueidentifier, r.id));
        IF OBJECT_ID('dbo.legacy_room_amenities_archive', 'U') IS NOT NULL
            INSERT dbo.rental_apartment_amenities (apartment_id, amenity)
            SELECT CONVERT(uniqueidentifier, old.room_id), old.amenities
            FROM dbo.legacy_room_amenities_archive old
            JOIN dbo.rental_apartments a ON a.id = TRY_CONVERT(uniqueidentifier, old.room_id) AND a.property_id = @propertyId
            WHERE NOT EXISTS (SELECT 1 FROM dbo.rental_apartment_amenities n
                WHERE n.apartment_id = a.id AND n.amenity = old.amenities);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
END;
GO
