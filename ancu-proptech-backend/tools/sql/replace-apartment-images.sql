-- One-off, explicitly requested local catalog data update. NOT a startup migration.
-- Snapshot existing id/room_number/cover_image_path/version before applying.
-- Image filenames match src/main/resources/static/apartment/images exactly.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

;WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY room_number, id) - 1 AS image_index
    FROM dbo.rental_apartments WITH (UPDLOCK, HOLDLOCK)
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
JOIN assigned ON assigned.id = apartment.id
WHERE apartment.cover_image_path IS NULL OR apartment.cover_image_path <> assigned.image_path;

SELECT @@ROWCOUNT AS updated_apartments;
COMMIT;
