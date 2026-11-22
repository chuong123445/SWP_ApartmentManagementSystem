# Ký không OTP để kiểm thử cục bộ — 22/11/2026

Theo yêu cầu người dùng, hợp đồng và biên bản bàn giao có thể ký trực tiếp sau khi vẽ chữ ký và đồng ý nội dung. Backend trả `signing.otpRequired`; giao diện thiếu trường này mặc định vẫn yêu cầu OTP.

- `app.signing-otp.enabled` đọc từ `APP_SIGNING_OTP_ENABLED`.
- Profile `local` mặc định **false**: không gửi/tiêu thụ OTP ký. Khởi động lại backend và tải lại frontend để áp dụng.
- Đặt `APP_SIGNING_OTP_ENABLED=true` để bật lại OTP trong local.
- Profile `test` mặc định true; có thể đặt false cho kiểm thử.
- Chỉ được bỏ OTP nếu **tất cả** profile hiệu lực thuộc `local`/`test`. Profile production, staging, không nhận diện hoặc tổ hợp có profile khác luôn bắt buộc OTP, kể cả cấu hình false. Không có API/client flag để tắt.
- API phát OTP ký trả 409 `SIGNING_OTP_DISABLED` khi tắt. API ký cho phép thiếu challenge/code chỉ ở chế độ này.

OTP đăng ký/xác minh email/khôi phục mật khẩu giữ nguyên. Quyền đúng hai bên, trạng thái tài khoản, chữ ký PNG, đồng ý nội dung, hash/version/ngày bắt đầu, khóa giao dịch và quy tắc ký đủ hai bên vẫn áp dụng. Hợp đồng tương lai ký đủ vẫn chờ hiệu lực; bàn giao một chữ ký vẫn giữ ACTIVE/OCCUPIED. Trường otpRequired phản ánh chính sách hiện tại, không xác nhận lịch sử từng chữ ký có OTP. Không thêm nhà cung cấp chữ ký số hoặc tuyên bố chữ ký có chứng thư.

## Bằng chứng kiểm tra

- 106 backend đạt: ContractDraft 61, ContractExit 19, SigningOtpPolicy 14, PasswordRecovery 8, ContractPdf 3, HandoverPdf 1; không skipped. SQL dùng database kiểm thử riêng, sender mock.
- TypeScript, 162 frontend tests và production build đạt. Cảnh báo chunk lớn và Vite configLoader có sẵn.
- 16 ca Playwright với API fixture trên desktop 1440/mobile 390: 8 ký trực tiếp Owner/Customer × hợp đồng/bàn giao; 4 bàn giao OTP bật; 4 hợp đồng với server cũ thiếu flag vẫn đi qua OTP và hiển thị lỗi ngày quá khứ. Kiểm tra consent, request/sign count, payload, console/network và tràn ngang. Ảnh mobile đã xem.
- Browser dùng fixture, không phải xác nhận gửi email thật. Không sửa dữ liệu ứng dụng, tài khoản hay lịch sử chữ ký.

## Phạm vi xuất bản

Chỉ đẩy thay đổi OTP và tài liệu đã có trên Duy/all. Các commit local về điều kiện công khai căn hộ và chống thêm căn ngoài wizard (`9c6f1c92`, `c5e732b7`) không nằm trong nhánh được đẩy. Không merge main.
