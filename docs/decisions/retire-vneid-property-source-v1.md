# Ngừng lấy tài sản từ VNeID/Auth0

24/11/2026 — người dùng bác bỏ logic lấy tài sản mô phỏng, áp dụng cả tài khoản Auth0 và tài khoản thường. Auth0/VNeID giữ vai trò đăng nhập và xác minh căn cước tài khoản; không chứng minh quyền sở hữu căn hộ và không cấp quyền công khai tài sản.

Tất cả hình thức chính chủ/ủy quyền/thuê lại dùng luồng nhập thông tin và hồ sơ quyền cho thuê, kiểm duyệt Admin. Chính chủ mở trực tiếp PropertyListingWizard cho mọi nguồn xác minh; không có lựa chọn đọc nguồn, consent hay bổ sung phòng từ Auth0. Giữ các điều kiện xác minh căn cước hiện có, bao gồm xác minh qua hồ sơ/Admin; không biến email OTP thành chứng minh quyền sở hữu.

VneidPropertyImportService thay bằng biên tương thích trả 410 PROPERTY_SOURCE_RETIRED cho list/import/append. Không giữ bộ đọc/provider/network call trong service này. Consent POST cũng 410; GET chỉ báo consented=false/assetServiceAvailable=false. Owner-upgrade context báo assetServiceAvailable=false và không phụ thuộc bộ đọc tài sản. Không tự cấp Owner/APPROVED/PUBLISHED qua nguồn; hồ sơ manual tiếp tục cơ chế Admin duyệt đã có. Route còn yêu cầu xác thực và validation/CSRF như trước.

Không xóa hoặc sửa lại tài sản/approval/hợp đồng đã lưu. Metadata nguồn cũ chỉ là lịch sử; giao diện bỏ lời khẳng định VNeID xác thực tài sản/miễn Admin. Tài sản cũ nhiều phòng đã được phép quản lý có thể thêm phòng theo luồng nhập thủ công thông thường, giữ mọi kiểm tra Owner/quyền/ảnh/giá/phê duyệt. Snapshot lịch sử không bị ghi lại. Chưa thực hiện rà duyệt hồi tố tài sản nguồn cũ.

Bằng chứng: 24 backend integration đạt (2 nguồn bị ngừng, 8 OwnerUpgrade, 9 hồ sơ manual, 5 OwnerApartment), thêm 18 Auth0/VNeID authentication integration đạt; kiểm tra bổ sung phòng thủ công trên tài sản nguồn cũ ghi riêng trong WORK_PROGRESS; 170 frontend/TypeScript/build đạt, 8 Playwright desktop/mobile x OWNER/CUSTOMER x nguồn xác minh AUTH0/ADMIN_REVIEW đạt. Browser dùng API fixtures, không ghi ứng dụng/Auth0 thật; kiểm tra tạo một nháp thủ công, không gọi route nguồn, không console/page/network500/tràn ngang. Ảnh mobile đã xem. Xem WORK_PROGRESS cho log, giới hạn và commit.
