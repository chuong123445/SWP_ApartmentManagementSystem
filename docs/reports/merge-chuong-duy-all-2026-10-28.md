# Hợp nhất chuong và Duy/all — 28/10/2026

## Phạm vi

Tiếp tục lượt merge có sẵn của người dùng trên `chuong`: HEAD trước merge `8d54952`, nguồn `Duy/all` / MERGE_HEAD `cd9396b`. Có 31 đường dẫn đã stage hoặc conflict, trong đó 5 file conflict. Không abort/reset/rebase, không thay lịch sử hai nhánh và không push.

## Cách xử lý conflict

| File | Kết quả |
|---|---|
| `AuthAccount.java` | Giữ Long/IDENTITY, các cờ xác thực và passwordHash nullable của VNeID; thêm googleSubject của Duy/all. Không đưa lại UUID hoặc bắt buộc mật khẩu cho tài khoản Auth0. |
| `types/auth.ts` | Giữ cả loginVneid và loginWithGoogle trong AuthContextValue. |
| `providers/AuthProvider.tsx` | Cung cấp đồng thời hai hàm đăng nhập, giữ JWT trong bộ nhớ và refresh/logout hiện tại. |
| `pages/auth/LoginPage.tsx` | Giữ form mật khẩu, nút VNeID và nút Google cùng cách điều hướng theo tài khoản server. |
| `hooks/useRentalWorkspace.ts` | Giữ handlePrices, publication và dữ liệu API; nhận phần bỏ thao tác audit/escrow demo của nhánh Duy. |

Các thay đổi tự ghép của Duy/all được giữ: endpoint/service Google, cấu hình Client ID, các test Google, trang chủ nhúng trong quản lý và dọn giao diện TrustGuard. Các luồng VNeID, tài sản nguồn, hồ sơ ủy quyền/thuê lại, ảnh và giá của chuong được giữ.

## Kiểm chứng thực tế

| Nhóm | Kết quả |
|---|---|
| Backend unit/config | 26 đạt: Google service 5, Google config 2, VNeID verifier 11, Auth0 asset reader 6, sample profiles 2. Log `ancu-proptech-backend/target/merge-duy-auth-tests-final.log`. |
| Backend SQL integration | 31 đạt: Auth 8, Registration 9, VNeID 14; chạy trên clone `ancu_identity_verify_20261027213854`, tắt seed/billing fixture/mail/scheduler. Bao gồm tạo tài khoản Auth0 với passwordHash null, session, CSRF và chặn trùng danh tính. Log `target/merge-duy-auth-integration.log`. |
| Frontend | 44 unit đạt, TypeScript/lint và production build đạt; cảnh báo native Vite config/bundle lớn đã có trước. TypeScript được chạy lại sau khi thêm E2E. |
| Playwright | 16 ca riêng biệt đạt qua các lượt: 8 tạo tài sản/ảnh/giá, 5 VNeID và 3 Google. Không cộng lặp các ca chạy lại. |
| UI mới được kiểm tra | Google và VNeID cùng hiển thị, Google login/reload/logout desktop1440/mobile390, lỗi email trùng không làm mất lựa chọn đăng nhập khác; kiểm tra CSRF, JWT không lưu trong localStorage/sessionStorage và không tràn ngang. Đã xem ảnh login mobile. |

Browser dùng SDK Auth0 thật với HTTP provider giả lập; Google Identity Services và API nghiệp vụ được giả lập. Không đăng nhập Google/Auth0 thật, không gửi email hoặc tạo tài sản trong database chính. Bộ kiểm tra Google mới gồm `e2e/merged-auth.spec.ts` và `e2e/support/google-identity.ts`; bộ VNeID được bổ sung route CSRF/guest/catalog để không phụ thuộc Backend đang chạy.

Lượt đầu gặp lỗi sandbox Mockito/Edge và Vite không truy cập được từ ngoài sandbox; đã dừng đúng các tiến trình test rồi chạy lại với quyền phù hợp. Playwright MCP báo ERR_CONNECTION_TIMED_OUT, dùng CLI thay thế. Các lỗi fixture được sửa: response phân trang dùng items/page, menu nhận diện tài khoản bằng email, logout từ Home giữ trang chủ với trạng thái khách. Không đổi code nghiệp vụ để đáp ứng các giả định sai của test.

Context7 đối chiếu Spring Security7.1.1 và React19.3.0 với thư viện dự án. Không thêm dependency.

## Cấu hình và database

- Không chạy migration IDENTITY lại, không reset dữ liệu hoặc sửa `.env.local`/secret. SQL integration chỉ sử dụng clone kiểm thử.
- Google dùng GOOGLE_CLIENT_ID ở Backend và VITE_GOOGLE_CLIENT_ID ở frontend; hai giá trị cần trùng nhau, xem `GOOGLE_LOGIN.md`.
- Nhận thêm googleSubject từ Duy/all; cấu hình hiện có `ddl-auto=update` thêm cột `google_subject` khi khởi động. Môi trường quản lý schema thủ công cần thêm cột theo hướng dẫn Google. Các migration V1–V19 hiện có được giữ nguyên.
- Cấu hình/giá trị mặc định ngoài phần conflict của Duy/all được giữ theo nhánh nguồn; không tuyên bố đã kiểm tra toàn bộ tính năng hoặc bảo mật của nhánh đó.
- Server Vite test3002 được dừng sau kiểm tra; không khởi động Backend trên database chính hoặc thay đổi server người dùng.

Kết quả được lưu bằng merge commit local; hash thực tế ghi tại WORK_PROGRESS. Chỉ push `chuong` khi người dùng chủ động thực hiện hoặc yêu cầu.
