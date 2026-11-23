# Xóa nháp và rút hồ sơ tài sản

22/11/2026. Người dùng cần bỏ hồ sơ tạo nhầm và hồ sơ ban đầu đang chờ duyệt khỏi danh sách.

Người nộp chọn Xóa bản nháp hoặc Rút hồ sơ chờ duyệt, xác nhận rồi POST /api/v1/me/rental-properties/{id}/withdraw với version tài sản. Không xóa tài sản đã duyệt/nguồn hoặc có lịch sử thuê/đăng tin qua đường này. Gia hạn quyền của tài sản đã duyệt giữ luồng riêng, không rút cả tài sản để mất quyền cũ.

Backend khóa account → property → dossiers cùng thứ tự Admin. Property chuyển WITHDRAWN và lưu withdrawnAt (V71); pending dossiers chuyển WITHDRAWN, giữ submittedAt/files và không gán Admin reviewer. Listing draft hoàn tất để không chiếm giới hạn20nháp. Các danh sách tài sản/căn hộ/báo cáo inventory loại bản rút; chứng cứ và lịch sử riêng tư được giữ. Không tuyên bố đã xóa vật lý giấy tờ. API sửa/hoàn tất/tạo căn không khôi phục bản đã rút. RequestKey cũ trả409 LISTING_WITHDRAWN, người dùng bắt đầu hồ sơ mới.

Admin đang mở bản cũ không thể duyệt sau khi đã rút; nếu Admin duyệt trước thì rút bị chặn. Retry của đúng người nộp trả204; không tiết lộ tài sản người khác. Source/published/hidden/occupied/rental-history safeguards giữ nguyên, không tự thay quyền tài khoản.

Kiểm tra: PropertyListing9 +Dossier18 +FinancialSummary7 đạt; OwnerApartment5 đạt sau guard, tổng39backendPASS. TypeScript/170frontend và8Playwright desktop1440/mobile390 trên hai trang tài sản/hồ sơ, nháp/chờduyệt, hủyconfirm không gửi, lỗi409 không giấu hồ sơ, reload+retry đúngversion đạt. APIfixture, không DBứngdụng/provider; ảnh mobile đã xem. Xem WORK_PROGRESS cho kết quả/hash cuối.
