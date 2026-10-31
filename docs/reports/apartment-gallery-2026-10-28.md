# Bộ xem ảnh căn hộ — 28/10/2026

- Trang chi tiết chung dùng ApartmentGallery: một ảnh lớn, nút trước/sau ở hai bên, bộ đếm và chấm chọn trực tiếp.
- Điều hướng vòng giữa tất cả ảnh API cung cấp; hỗ trợ phím mũi tên khi focus bộ ảnh. Chuyển căn hộ/thay danh sách ảnh thì về ảnh đầu.
- Một ảnh không hiện nút điều hướng; danh sách rỗng dùng placeholder và thông báo rõ ràng. Ảnh object-contain để xem đầy đủ nội dung.
- Tiếp tục dùng ApartmentImage: ảnh riêng đọc bằng Bearer/object URL, không đưa token vào URL hoặc storage. Không thay Backend/database hoặc tự tạo ảnh còn thiếu trong dữ liệu.
- PASS15Playwright22.3s:5gallery (4ảnh desktop/mobile,0/1ảnh, privateBearer/reset sau xóa) +10hồi quy quản lý tài sản. API/ảnh dùng fixture, không truy cập tài khoản/provider thật.
- PASS46frontend unit, TypeScript, build. Giữ cảnh báo bundle/native config đã có. Không chạy Backend tests vì không sửa Backend.
- Đã xem screenshot mobile test-results/visual/apartment-gallery-390.png, không tràn ngang; console/network chỉ chấp nhận guest401/favicon404 dự kiến. Playwright MCP truy cập được trang, tương tác chính bằng CLI Edge.
- Đã dừng Vite kiểm thử riêng3002,0listener; server người dùng giữ nguyên. Restart Vite rồi tải lại trang để áp dụng nếu cấu hình đang tắt theo dõi file.
- Chỉ commit local, chưa push. Commit xem WORK_PROGRESS.
