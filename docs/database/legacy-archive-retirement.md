# Xoá ba bảng legacy khi cập nhật ứng dụng

Theo quyết định của người dùng, V49 chỉ xoá:

- `legacy_invoices_archive`: hoá đơn thuộc mô hình cũ; ứng dụng dùng `rental_invoices`.
- `legacy_room_amenities_archive`: tiện nghi gắn với phòng cũ; ứng dụng dùng `rental_apartment_amenities`.
- `legacy_rooms_archive`: danh sách phòng cũ; ứng dụng dùng `rental_apartments`.

Giữ `legacy_tenants_archive`, `legacy_id_mappings` và các bảng nghiệp vụ khác. Migration này không bổ sung FK cho các miền khác và không phụ thuộc V46–V48 ở nhánh dọn diagram.

## Cách triển khai

Merge chỉ cập nhật code trên GitHub. Sao lưu database trước khi triển khai vì dữ liệu trong ba bảng archive sẽ bị xoá. Dừng backend cũ, lấy code main đã merge, build và chạy backend mới với database đích. Cấu hình `spring.sql.init.schema-locations` chạy V49 sau các bước chuyển đổi dữ liệu cũ và trước V50/V52.

- Database đã xoá ba bảng: không làm gì; chạy lại an toàn.
- Database còn một hoặc cả ba bảng archive: xoá các bảng hiện có, bảng con trước bảng cha, trong transaction.
- Database còn tên cũ `rooms`, `room_amenities`, `invoices`: V3/V5 đổi tên trước; V49 dọn archive sau đó. Các điều kiện kiểm tra/chuyển đổi dữ liệu của migration cũ vẫn áp dụng; database UUID có dữ liệu vẫn cần quy trình chuyển ID V19 đã có.
- Nếu bảng hoặc SQL object bên ngoài đang tham chiếu đến archive, migration báo lỗi và rollback, không tự xoá FK hay object đó. Cần xem xét tham chiếu trước khi triển khai lại. Không tự phục hồi archive khi rollback phiên bản ứng dụng; dùng bản sao lưu nếu cần khôi phục dữ liệu đã xoá.

## Kiểm tra

Chạy `ancu-proptech-backend/tools/verify-legacy-archive-retirement.ps1` trên database kiểm thử `ancu_account_roles_20261103` đang có. Công cụ không tạo database mới hoặc chạy trên database ứng dụng. Fixture, DROP và các lỗi phụ thuộc đều nằm trong transaction được rollback. So sánh fingerprint dữ liệu của tất cả bảng cùng metadata object/cột trước và sau; kiểm tra bảng vắng, chạy lại, ba bảng có dữ liệu/FK nội bộ, một bảng còn lại, FK và view bên ngoài.

Kết quả 03/11/2026: PASS thứ tự cấu hình startup, bảng vắng/replay, ba bảng có dữ liệu, chạy các batch đổi tên thật từ V3/V5 rồi V49, một archive còn lại, FK/view bên ngoài chặn và rollback nguyên tử; fingerprint tất cả bảng khác giữ nguyên. Dùng lại database test trên, không tạo database mới và không ghi database ứng dụng. Đây là kiểm tra SQL migration và cấu hình startup; không chạy lại toàn bộ backend hoặc giao diện vì không thay đổi Java/API/UI.
