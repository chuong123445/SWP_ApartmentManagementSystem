# TECH-01 — Tách nghiệp vụ bảo trì

Nhánh `feat/maintenance-ai-search-precheck`, từ `6f7df77`.

`MaintenanceController` và `MaintenanceImageController` chỉ nhận request, gọi service và đóng gói HTTP. Chuyển DTO sang `dto/maintenance/MaintenanceDtos`, nghiệp vụ sang `service/maintenance/MaintenanceService` và `MaintenanceImageService`. Service giữ transaction, kiểm tra quan hệ thuê/Owner, khóa/version, chuyển trạng thái, phân bổ chi phí, audit và kiểm tra ảnh riêng tư. API, validation và điều kiện nghiệm thu/mở lại giữ nguyên; không đổi frontend hoặc schema.

Kiểm tra: `MaintenanceIntegrationTests` 2/2 PASS trên SQL Server test `ancu_settlement_test_20261103`, exit 0. Hai kịch bản bao phủ tạo/từ chối truy cập chéo, Owner/Customer list, thuê ACTIVE/OCCUPIED, ảnh lỗi/riêng tư, ACCEPT/ASSIGN/READY/REOPEN/CONFIRM và version cũ; log ngoài Git `tmp/tech01-backend.log`. `git diff --check` PASS. Không chạy trình duyệt cho unit backend giữ nguyên giao diện này. Context7 Spring Data JPA 4.1.0 (gần nhất với managed 4.1.1) xác nhận service transaction boundary. Không gọi provider hoặc sửa database ứng dụng.
