# Xác nhận chữ ký qua email và quên mật khẩu

## Phạm vi

- Mỗi bên vẽ chữ ký và đồng ý nội dung, gửi mã tới email tài khoản rồi nhập OTP để lưu chữ ký hợp đồng hoặc biên bản bàn giao.
- OTP gắn với người ký, loại văn bản, hợp đồng, phiên bản, mã nội dung và chữ ký đã vẽ. Thay đổi dữ liệu cần xác nhận lại.
- Quên mật khẩu tại `/forgot-password`, truy cập từ đăng nhập. Nhập email, xác nhận OTP rồi nhập mật khẩu mới và xác nhận.
- Đặt lại mật khẩu thành công thu hồi mọi phiên đăng nhập của tài khoản.

## Triển khai

- Migration V64 tạo `action_otp_challenges`, được đăng ký trong cấu hình SQL init hiện có.
- Lưu HMAC của mã và bằng chứng đặt lại mật khẩu, ràng buộc email/phiên bản tài khoản. OTP dùng một lần, hiệu lực 10 phút, tối đa 5 lần sai. Gửi cách nhau 60 giây, tối đa 3 mã mỗi mục đích/tài khoản trong 15 phút.
- Bằng chứng sau xác nhận OTP đặt lại mật khẩu có hiệu lực 10 phút, giữ trong bộ nhớ trang và được tiêu thụ trong transaction đổi mật khẩu.
- Mật khẩu tối thiểu 12 ký tự, tối đa 72 byte UTF-8, xác nhận phải khớp và khác mật khẩu hiện tại.
- Gửi thư dùng `EmailOtpSender` hiện có, tiêu đề theo mục đích. Lỗi gửi thư được trả về cho người dùng.
- Recovery chỉ áp dụng tài khoản có mật khẩu cục bộ và trạng thái khả dụng. Tài khoản bị khóa, vô hiệu hóa, đã xoá hoặc chỉ dùng đăng nhập ngoài nhận phản hồi yêu cầu chung.

## Kiểm tra

- 84 kiểm thử SQL tích hợp đạt trong database riêng `ancu_contract_pdf_20261103`. Bao gồm mã sai, hết hạn, dùng lại, ràng buộc nội dung/mục đích, xác nhận mật khẩu, thu hồi phiên và hai luồng ký.
- SMTP trong kiểm thử được giả lập. Chưa xác nhận email OTP thật tới hộp thư người dùng.
- Cần khởi động lại backend để chạy V64 và nạp frontend mới.

## API

- `POST /api/v1/contracts/{id}/signature-otp` rồi `POST /api/v1/contracts/{id}/signatures` có `challengeId`, `code`.
- `POST /api/v1/contracts/{id}/exit/signature-otp` rồi `POST /api/v1/contracts/{id}/exit/sign` có `challengeId`, `code`.
- `POST /api/v1/auth/password-recovery`, `/verify`, `/reset`. Cả ba yêu cầu CSRF.
