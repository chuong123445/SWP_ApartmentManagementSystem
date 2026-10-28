# Owner dùng căn cước đã xác thực — 27/10/2026

User báo nâng cấp Owner thành công nhưng khi thêm tài sản lại bị yêu cầu nhập CCCD/ảnh theo luồng cũ. Screenshot đã hiển thị evidence VNeID VERIFIED. Đây là kết quả user báo; agent không đăng nhập lại Auth0 hoặc nâng cấp tài khoản thật trong task này.

## Nguyên nhân và sửa

WorkspaceModals chỉ lấy /me/identity (hồ sơ ảnh tự khai), kiểm tra documentNumber và coi mọi lỗi tải là thiếu hồ sơ. Nó không đọc /me/verifications nên Owner đã được Auth0 xác thực vẫn bị chặn. IdentityPage luôn hiển thị cả panel VERIFIED và form tự khai bắt buộc bên dưới.

Commit dc98d47 thêm AddPropertyIdentityGate: khi mở form, đọc trạng thái Backend; VNeID VERIFIED mở form tài sản ngay, không gọi hồ sơ/ảnh tự khai. Nếu chưa VERIFIED mới dùng hồ sơ cũ. Lỗi nguồn có trạng thái tải/thử lại, không kết luận thiếu CCCD hoặc mở form. Abort khi đóng, mount lại khi mở và key theo account/version để không dùng kết quả cũ giữa tài khoản.

IdentityPage dùng cùng một kết quả trạng thái cho panel và chọn luồng: VERIFIED chỉ hiện thông tin read-only, không gọi /me/identity/ảnh, không yêu cầu nhập/tải lại. Tài khoản chưa xác thực vẫn có luồng hồ sơ tự khai với validation và ảnh cũ. Dữ liệu cũ không bị xóa/ghi đè. Modal thiếu CCCD bỏ nội dung khẳng định hồ sơ tự khai chứng minh pháp lý hoặc tự đồng bộ hồ sơ tài sản.

Đã đọc OwnerPropertyService.create và AccountAccessService/policy: Backend tạo tài sản chỉ yêu cầu Owner ACTIVE/đủ policy; VNeID VERIFIED đã được policy chấp nhận, không có gate bắt lưu hồ sơ ảnh tự khai. Không thay Backend/API/schema, không cần sửa quyền để giải quyết lỗi này. Property vẫn DRAFT, Admin review và publication hiện có giữ nguyên. Không thay metadata Auth0, nhập tài sản, fixtures, contract snapshots hoặc credentials. Chưa thay đổi các luồng hồ sơ khác ngoài Owner add-property và identity page.

## Kiểm chứng

- Context7 React v19.3.0 đối chiếu installed React19.3; không thêm dependency.
- npm run lint/TypeScript PASS; 44 unit PASS; build PASS, cảnh báo Vite native config/large bundle có sẵn.
- Playwright CLI: 17 PASS/23.9s, gồm 7 owner-identity-gate mới, 4 verification-status, 6 owner-upgrade regression. API kiểm soát, không mutation SQL/Auth0. Verified Owner desktop1440/mobile390 gửi tạo nháp không hồ sơ thủ công; read-only identity mobile/reload; missing/manual identity; verification503/identity503 retry; kiểm tra không overflow/page errors/network failures hoặc console ngoài 503 dự kiến và favicon404 có sẵn. Đã xem ảnh owner-verified-identity-mobile.png.
- Lượt đầu 15 PASS/2 FAIL do test kỳ vọng CSRF header cho API tạo tài sản, trong khi hợp đồng hiện tại dùng internal Bearer. Đã đối chiếu client/SecurityConfig, sửa riêng kỳ vọng test, không sửa security để chiều test; rerun toàn bộ17 đạt.
- Backend suite không chạy lại vì không đổi Backend. Không khẳng định đã kiểm thử lại provider thật hoặc tạo tài sản thật; POST được mock trong browser suite.

Dedicated Vite3002 PID30148 đã xác minh command line và dừng; không dừng server của user8080/3000. Root API/plan/progress và bản copy report cập nhật; không sửa RDS/diagrams. Local commit, không push. Resume: reload React, vào quản lý → Thêm tài sản; Owner có VNeID VERIFIED không cần hoàn tất form CCCD cũ.
