# Thiết lập SePay cho ứng dụng An Cư

## 1. Ngân hàng và API Token

Chủ nhà tự đăng ký SePay và liên kết ngân hàng tại đó. Mỗi chủ nhà dùng API Token của tài khoản SePay của mình. Một token có thể đọc nhiều ngân hàng đã liên kết, không phải một URL API riêng cho mỗi ngân hàng.

SePay → Cấu hình Công ty → API Access → tạo token Hoạt động. Không gửi token/mật khẩu ngân hàng vào chat hoặc commit Git. Token SePay hiện toàn quyền; ứng dụng chỉ dùng để đọc khi thiết lập và không lưu lâu dài.

Trong ứng dụng: Cài đặt tài khoản → Thanh toán và nhận tiền → Thiết lập thanh toán SePay. Nhập token, bấm Lấy tài khoản từ SePay. Chỉ có một tài khoản ở trang đầu và không còn trang sau thì tự chọn; có nhiều tài khoản thì chọn tài khoản nhận tiền thuê. Có nút trang trước/sau cho danh sách lớn.

Nếu ngân hàng cần VA, bấm Lấy VA đã tạo trên SePay và chọn VA chính thức, tĩnh, đang hoạt động. Không tự thêm tiền tố 96247 vào tài khoản gốc. Ứng dụng đọc lại tài khoản/VA bằng API khi lưu, không bắt nhập tên/số ngân hàng thủ công. Hiện BIDV được cấu hình qua VA; BIDV doanh nghiệp dùng số gốc/VA động/TKP chưa mở riêng.

## 2. URL HTTPS công khai là gì?

`localhost:8080` chỉ ứng dụng trên máy bạn gọi được. Máy chủ SePay cần địa chỉ Internet HTTPS dẫn tới Backend. Đây không phải URL Auth0 và không phải URL Frontend cổng 3000.

Khi thử trên máy cá nhân, có thể dùng Cloudflare Quick Tunnel:

```powershell
winget install --id Cloudflare.cloudflared -e
cloudflared tunnel --url http://localhost:8080
```

Lệnh sẽ in URL dạng `https://ten-ngau-nhien.trycloudflare.com`. Không bật chặn email tương tác trên đường webhook vì SePay không thể đăng nhập kiểu trình duyệt. Tunnel làm Backend truy cập được từ Internet; các API nghiệp vụ vẫn yêu cầu JWT, webhook yêu cầu key. Dừng tunnel thì URL ngừng hoạt động, mở lại có thể đổi URL. Dùng tên miền HTTPS ổn định khi triển khai thật.

Trong file `.env.local` của Backend (đã gitignore), đặt:

```properties
APP_PUBLIC_BASE_URL=https://ten-ngau-nhien.trycloudflare.com
SEPAY_MODE=live
```

Đây là ví dụ, không phải URL đang chạy. Khởi động lại Backend rồi tải lại trang SePay. Ứng dụng hiển thị URL đầy đủ `/api/v1/payments/sepay/webhooks/<ownerId>`. Không cần thêm URL này vào Allowed Callback URLs của Auth0. Chưa có public URL thì vẫn lưu cấu hình được, nhưng chưa cấp QR mới.

Test mode: dùng `SEPAY_MODE=sandbox`, token Test mode và database kiểm thử riêng; API sẽ gọi userapi-sandbox.sepay.vn. Không dùng thông báo mô phỏng để xác nhận hóa đơn của dữ liệu thật.

## 3. Webhook trên SePay

Sau khi lưu lần đầu, sao chép khóa webhook ngay. GET/tải lại trang không trả khóa; nếu mất thì chọn Đổi khóa webhook, xác nhận và cập nhật trên SePay. Chỉ hash lưu trong DB.

SePay → Webhooks → Thêm webhook:

1. Sự kiện Có tiền vào.
2. Đúng tài khoản ngân hàng và VA đã chọn (nếu có).
3. Dán URL từ ứng dụng.
4. Kiểu bảo mật API Key; dán khóa webhook ứng dụng cấp. SePay gửi `Authorization: Apikey <key>`.
5. Payload JSON; lưu cấu hình.

Mã hóa đơn do ứng dụng sinh dài 28 ký tự bắt đầu ANCU. Backend đọc mã đầy đủ trong content. Nếu bật bóc tách code trên SePay, cấu hình để giữ đủ mã; code bị cắt hoặc mâu thuẫn sẽ không tự khớp.

## 4. Kiểm tra

- Dùng Gửi thử trên SePay với mã giả, không dùng mã hóa đơn thật: xem Đã nhận webhook gần nhất và lịch sử UNMATCHED. Gửi thử không chứng minh giao dịch ngân hàng thật.
- Mở hóa đơn SENT thuộc đúng người thuê → Hiển thị QR thanh toán SePay. Số tiền và nội dung được server cấp, không tự tạo QR hàng tháng.
- Kiểm tra một giao dịch thật vào đúng tài khoản/VA, đúng toàn bộ số tiền và giữ nội dung. Ứng dụng cập nhật khi nhận webhook (trang chi tiết tự kiểm tra mỗi 10 giây khi đang mở, hoặc bấm Kiểm tra trạng thái).
- Webhook retry cùng transaction ID không ghi nhận lần hai. Chuyển thiếu/thừa, sai VA/ngân hàng hoặc mã không khớp nằm trong lịch sử để đối soát, chưa có nút tự xác nhận/hoàn tiền.
- Chủ nhà xem trạng thái ở chi tiết/danh sách hóa đơn; người thuê xem hóa đơn của mình. Nháp không có QR.

## 5. Áp dụng mã nguồn

Nhánh feature/sepay-payments. Khởi động lại Spring Boot và Vite. Có V23/V24 additive cho ba bảng và khóa chống trùng theo chủ nhà; không xóa/tạo lại database. Local Hibernate update tạo bảng từ entity; với schema quản lý thủ công chạy `src/main/resources/db/migration/V23__sepay_invoice_payments.sql` theo quy trình của môi trường. Chạy tiếp `V24__sepay_owner_event_dedup.sql` để bảo đảm transaction ID được chống trùng theo từng chủ nhà. Các script chạy lặp được và bổ sung FK; không có lệnh reset.

## Nguồn chính thức đã đối chiếu

- [SePay API Token](https://developer.sepay.vn/vi/sepay-api/v2/tao-api-token)
- [Danh sách ngân hàng v2](https://developer.sepay.vn/vi/sepay-api/v2/tai-khoan-ngan-hang/danh-sach)
- [Danh sách VA v2](https://developer.sepay.vn/vi/sepay-api/v2/tai-khoan-ao/danh-sach)
- [QR và quy tắc ngân hàng](https://developer.sepay.vn/vi/tien-ich-khac/tao-qr-code)
- [Webhook](https://docs.sepay.vn/tich-hop-webhooks.html)
- [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)


Bật/tắt nhận thanh toán: sau khi cấu hình, dùng nút Tạm dừng/Bật lại bằng phiên nội bộ và version, không cần token SePay. Khi tắt, không cấp QR mới hay tự đối soát giao dịch; trạng thái các hóa đơn đã thanh toán vẫn giữ nguyên. Thông báo nhận trong lúc tắt lưu DISABLED, không tự phát lại để thanh toán sau khi bật.
