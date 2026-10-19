-- Apply static sample images for apartments with placeholder or missing cover images.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.rental_apartments', N'U') IS NOT NULL
BEGIN
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    ;WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY room_number, id) - 1 AS image_index
        FROM dbo.rental_apartments WITH (UPDLOCK, HOLDLOCK)
        WHERE cover_image_path IS NULL
           OR cover_image_path = '/images/apartment-placeholder.svg'
    ), assigned AS (
        SELECT id, CASE image_index % 5
            WHEN 0 THEN '/apartment/images/apartment1.jpg'
            WHEN 1 THEN '/apartment/images/department2.jpg'
            WHEN 2 THEN '/apartment/images/apartment3.jpg'
            WHEN 3 THEN '/apartment/images/apartment4.jpg'
            ELSE '/apartment/images/department5.webp'
        END AS image_path
        FROM numbered
    )
    UPDATE apartment
    SET cover_image_path = assigned.image_path, version = apartment.version + 1
    FROM dbo.rental_apartments apartment
    JOIN assigned ON assigned.id = apartment.id;

    COMMIT TRANSACTION;
END;
GO
