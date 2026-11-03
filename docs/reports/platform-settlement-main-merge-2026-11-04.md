# Ghép main vào nhánh settlement — 04/11/2026

Đích: PR #44, `feat/platform-sepay-settlement` → `main`. Fetch main tại `7d94109`, merge vào head tính năng `bb4e648`, giữ lịch sử hai nhánh. Không merge PR vào main.

## Quyết định xử lý xung đột

- `AccountAccessService`: dùng `hasRole(ADMIN)` từ mô hình membership của main, giữ kiểm tra ACTIVE và thông báo áp dụng cho toàn bộ chức năng quản trị.
- `application.properties`: giữ danh sách migration của cả hai nhánh; phần cuối là V49 archive retirement, V50 account roles, V51 settlement, V52 role catalog, V53 admin accounts. Không thay nội dung migration của main.
- `AccountMenu`: giữ menu không gian làm việc theo membership, tránh lặp liên kết Admin; giữ quy tắc ẩn hồ sơ/cài đặt cá nhân cho Admin.
- `AccountSettingsPage`: giữ điều kiện CUSTOMER chưa có OWNER cho lời mời mở quyền cho thuê; Owner dùng Số dư và rút tiền thay cho cấu hình SePay cá nhân.

Rà soát các điểm tương thích ngoài conflict: AdminAccountService bảo vệ tài khoản Admin theo membership, DTO danh sách/chi tiết trả mảng `roles`, giao diện hiển thị đầy đủ Owner + Customer. Không dùng cột `auth_accounts.role` cũ để quyết định quyền. Xóa cứng dọn membership tài khoản đích, giữ catalog dùng chung; khóa/xóa mềm giữ membership. OpenAPI và ADR Admin đã đồng bộ.

## Kiểm tra thực tế trên kết quả ghép

- 50 kiểm thử backend đạt trên database riêng `ancu_settlement_test_20261103`: Admin 8, Auth 13, SePay 22, Bank client 5, Owner QR 2. Maven exit 0, không failure/error/skipped.
- Bao gồm kiểm thử cố tình làm lệch cột role cũ với membership: không cấp quyền Admin cho Customer, vẫn bảo vệ Admin, quản lý đúng Customer; hard delete tài khoản Owner+Customer giữ đủ 3 catalog roles. Cleanup kiểm thử cạnh tranh đã bổ sung xóa join rows.
- 109 kiểm thử frontend đạt; TypeScript và production build đạt. Giữ cảnh báo bundle lớn và cấu hình `__dirname` sẵn có của Vite.
- 16 lượt Playwright MCP với API mô phỏng: Admin và settlement ở 1440/390px, cùng 6 kịch bản workspace ở mỗi kích thước (dual, thứ tự role đảo, tenant theo hợp đồng, customer, admin, thu hồi OWNER). Kiểm tra trang tài khoản riêng, phân trang, reload/Back/Forward, thao tác Admin, QR, rút tiền, menu và cài đặt Owner. Không tràn ngang, lỗi trang hoặc lỗi API bất ngờ; 409 stale-version là tình huống được kiểm tra có chủ đích.
- Không còn entry unmerged hoặc conflict marker; staged diff check đạt trước commit.

Context7 đối chiếu Hibernate ManyToMany/no REMOVE cascade trên catalog 7.4.13; BOM cục bộ dùng Hibernate 7.4.5.Final (không có mục đúng patch trong catalog). Không đổi mapping shared catalog của main hoặc thêm dependency.

Không ghi database ứng dụng, gọi provider hay thử chuyển tiền thật. Ba file VNeID diagnostics untracked có sẵn được giữ ngoài merge commit. Backend kiểm thử kết thúc; Vite kiểm thử được dừng trước bàn giao.
