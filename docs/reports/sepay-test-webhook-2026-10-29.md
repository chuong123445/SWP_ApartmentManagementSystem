# Sửa SePay Gửi thử HTTP 400 — 29/10/2026

## Bằng chứng thực tế

- Đọc ngrok inspector trên máy, chỉ xuất kiểu/độ dài dữ liệu và sự hiện diện kiểu header; không xuất API Key hoặc số tài khoản.
- Hai POST JSON từ SePay vào webhook Owner có id=0, header kiểu Apikey, số tiền dương và các trường bắt buộc hợp lệ; cả hai trả 400.
- DTO trước đây dùng @Positive cho id, nên loại bản tin thử trước khi vào service.
- Probe công khai không kèm khóa trả 401 WEBHOOK_UNAUTHORIZED; URL ngrok đã đến đúng Backend. Mở URL gốc bằng GET nhận UNAUTHENTICATED là bình thường.

## Thay đổi

- Chuyển id sang @NotNull @PositiveOrZero.
- Nhánh id=0 chỉ chạy sau xác thực khóa: cập nhật lastWebhookAt và ack success.
- Không lưu event ID 0, không tìm/đối soát mã hóa đơn, không ghi nhận tiền hoặc paidAt từ bản tin thử, kể cả khi payload trùng đúng mã/số tiền/tài khoản của hóa đơn thật.
- ID âm/missing và các ràng buộc payload còn lại vẫn bị từ chối; ID dương giữ nguyên xử lý giao dịch và chống trùng.
- Đồng bộ OpenAPI, ADR và hướng dẫn thiết lập; không đổi schema, UI hoặc mở quyền truy cập API.

## Kiểm tra

27 Backend tests PASS, khoảng 71 giây: 13 SePay integration (2 mới) + 5 adapter + 9 billing regression, SQL Server clone ancu_identity_verify_20261027213854. Có test bản tin 0 lặp lại không tạo event/paidAt, sai khóa vẫn 401, ID âm vẫn 400. Context7 đối chiếu PositiveOrZero/NotNull theo tài liệu Hibernate Validator chung; hành vi đã được kiểm tra bằng dependency thực của Boot 4.1.1.

Không replay bản tin có khóa thật, không chuyển tiền/ngân hàng/ghi giao dịch thật, không restart server của người dùng. Ngrok inspector được đọc, không sửa. Sau sửa cần Stop/Run Spring Boot rồi Gửi thử lại và xem lastWebhookAt trên ứng dụng. Chưa khẳng định SePay live test đã thành công sau sửa vì Backend người dùng chưa khởi động lại.
