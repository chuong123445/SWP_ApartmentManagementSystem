# Đăng nhập bằng Google

1. Mở https://console.cloud.google.com/auth/clients và chọn/tạo project.
2. Cấu hình Google Auth Platform: Branding, Audience (External; thêm tài khoản thử nghiệm nếu đang Testing).
3. Tạo OAuth client loại **Web application**. Trong Authorized JavaScript origins, thêm `http://localhost:3000` (và từng origin thực tế, ví dụ `http://localhost:3001`). Khi triển khai, thêm origin HTTPS của web. Luồng này dùng Google Identity Services popup, không cần redirect URI hoặc client secret.
4. Chép Client ID vào `GOOGLE_CLIENT_ID` trong `ancu-proptech-backend/.env.local` và `VITE_GOOGLE_CLIENT_ID` trong `.env.local` của frontend. Hai giá trị phải giống nhau. Backend local đã import `.env.local`; production cần đặt biến môi trường `GOOGLE_CLIENT_ID`.
5. Khởi động lại backend và Vite; mở trang đăng nhập, chọn Google và tài khoản.

Profile local có Client ID công khai của dự án trong `application-local.properties` để IDE vẫn đọc được khi thư mục chạy khác với thư mục backend. `GOOGLE_CLIENT_ID` có thể ghi đè giá trị này. Sau khi đổi cấu hình phải Stop/Run backend; tải lại trình duyệt không nạp lại cấu hình Spring. Nếu sau khi xác nhận Google báo “Đăng nhập Google chưa được cấu hình”, backend đang chạy chưa nhận Client ID; cần khởi động lại đúng bản backend đã cập nhật.

Backend kiểm tra chữ ký Google, issuer, audience, thời hạn và email_verified trước khi cấp JWT/cookie hiện có. Tài khoản mới là CUSTOMER và ACTIVE theo chính sách xác minh email hiện tại, không có quyền OWNER/ADMIN. Google subject được lưu để đăng nhập ổn định khi email Google thay đổi. Email trùng tài khoản mật khẩu không được tự động liên kết; người dùng cần dùng mật khẩu hiện tại. Tài khoản bị khóa/ngừng hoạt động không thể đăng nhập Google.

Ứng dụng hiện dùng Hibernate ddl-auto=update, tự thêm cột googleSubject khi khởi động. Nếu production dùng schema thủ công, cần thêm cột google_subject NVARCHAR(255) NULL vào auth_accounts trước khi triển khai.

Tài liệu: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
