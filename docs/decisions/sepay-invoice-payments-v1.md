# SePay — nhận tiền hóa đơn theo chủ nhà

Ngày 28/10/2026. Nhánh `feature/sepay-payments`, xuất phát `chuong` tại fcb37ca. User yêu cầu ngân hàng liên kết trên SePay, ứng dụng gọi API theo token của từng chủ nhà; không giới hạn BIDV.

## Luồng được triển khai

OWNER ACTIVE/đã xác thực → Cài đặt tài khoản → Thanh toán SePay → API Token của chính tài khoản SePay → Backend đọc SePay API v2 → chọn tài khoản (tự chọn nếu duy nhất), chọn VA nếu cần → Backend đọc lại chi tiết từ SePay khi lưu, không tin tên/số tài khoản từ Frontend → lưu thông tin người nhận + SHA256 khóa webhook ngẫu nhiên → sao chép URL HTTPS và khóa hiển thị một lần → chủ nhà tự cấu hình webhook trên SePay.

Token API SePay và khóa webhook khác nhau. Token chỉ dùng cho request thiết lập; không lưu database, localStorage/cookie hoặc log. Không yêu cầu mật khẩu ngân hàng. Token v2 hiện toàn quyền theo tài liệu SePay, do đó chưa triển khai việc giữ token dài hạn; OAuth là mở rộng riêng. Ứng dụng chỉ gọi API đọc tài khoản/VA, không tạo tài khoản ngân hàng, hoàn tiền hoặc chuyển tiền ra.

## Đối soát

- Chỉ exact Owner hoặc exact Customer của hóa đơn SENT được lấy trạng thái/cấp QR; khách không xem hóa đơn nháp. Owner vẫn giữ chức năng thuê nhà.
- InvoicePayment là snapshot nhận tiền/số tiền/mã ngẫu nhiên ANCU + 24 ký tự hex. Local PK vẫn BIGINT IDENTITY; UUID tài khoản SePay là external ID, không thay PK nội bộ.
- VND nguyên được lấy từ tổng hóa đơn server. Không tin số tiền frontend; không tự làm tròn số lẻ VND. QR dùng tài khoản gốc hoặc VA chính thức tĩnh lấy từ SePay. VietinBank thêm SEVQR.
- BIDV/OCB/MSB/KienLongBank yêu cầu chọn VA trong phiên bản này. VA động và VA theo nội dung TKP chưa hỗ trợ. Các ngân hàng khác có thể dùng tài khoản gốc hoặc VA chính thức tĩnh mà API cung cấp. BIDV doanh nghiệp dùng tài khoản gốc chưa mở riêng; không khẳng định mọi biến thể ngân hàng đã được thử thật.
- Config một tài khoản nhận mặc định cho mỗi Owner, phục vụ nhiều căn hộ/hóa đơn. Đổi cấu hình không sửa snapshot/QR đã cấp, không sửa ngân hàng trong hợp đồng đã lưu. Cần đối chiếu với người thuê khi đổi ngân hàng.
- Webhook POST JSON có `Authorization: Apikey <key>`. Chain riêng chỉ cho đường webhook, không dùng cookie/JWT/CSRF; các API người dùng vẫn dùng Security/JWT và AccountAccessService.
- Secret random 32 byte, so sánh hash constant-time, hiển thị khi tạo/rotate; GET không trả secret/hash. Rotate có version và vô hiệu khóa cũ. URL được tạo từ APP_PUBLIC_BASE_URL, không lấy Host header.
- Transaction khóa connection → contract; webhook cùng Owner được tuần tự hóa. transaction_id UNIQUE toàn hệ thống; invoice_id/payment_code UNIQUE. Nhận lại cùng event trả success, không ghi nhận lại. DB foreign keys giữ tham chiếu; server không cần queue/network trong webhook.
- Đúng bank + account/VA snapshot, đúng một mã hóa đơn và đúng toàn bộ số tiền, transferType=in, invoice SENT → paidAt. Không sửa SENT thành PAID: paymentStatus riêng để giữ chuỗi chỉ số/thời kỳ hóa đơn.
- Sai tài khoản/số tiền, tiền ra, mã không khớp/mơ hồ, hóa đơn đã trả hoặc connection tắt: lưu kết quả đối soát, trả success sau commit để không retry vô ích; không tự cộng dồn/hoàn tiền/đánh dấu đã trả. Lỗi xác thực 401; lỗi server thực sự không ack để SePay retry.
- Khóa webhook là credential tin cậy; chủ nhà không được gửi thử bằng mã hóa đơn thật. `lastWebhookAt` chỉ chứng minh đã nhận thông báo hợp lệ, không xác minh pháp lý tài khoản ngân hàng hoặc khẳng định giao dịch thật.

## Database

V23 thêm sepay_connections (người nhận + hash key + trạng thái/version), invoice_payments (snapshot QR + paidAt), sepay_events (external transaction ID + kết quả/amount/time). Không lưu raw payload/số dư/người chuyển. 20 events mới nhất chỉ Owner đó xem. Migration additive/idempotent, không reset dữ liệu. Project hiện Hibernate ddl-auto=update ở local; script V23 dùng để quản lý schema rõ ràng, chưa cài Flyway mới.

## Ngoài phạm vi

Escrow/đặt cọc, hoàn tiền, thanh toán một phần/gộp, đối soát thủ công thay trạng thái, tự đăng ký webhook qua API, OAuth SePay, hỗ trợ toàn bộ loại VA/ngân hàng, xác nhận giao dịch thật và triển khai tunnel thật. Chưa gọi SePay bằng token thật; URL/provider acceptance vẫn cần người vận hành.
