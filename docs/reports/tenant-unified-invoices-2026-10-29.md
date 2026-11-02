# Hóa đơn đã gửi chưa hiện cho Tenant — 29/10/2026

## Kết quả kiểm tra và thay đổi

Đọc trực tiếp database ứng dụng theo chế độ chỉ đọc: khoản #4, 2.000đ đã gán tenant1/contract1; khoản #3, 2.000đ đã gán tenant2/contract3; cả hai chưa thanh toán. Hai khoản cũ #1/#2 không có recipient, vẫn owner-only. Không in mật khẩu/API Key/token và không sửa dữ liệu.

Nguyên nhân giao diện: MyInvoices chỉ đọc rental_invoices và đặt link đến danh sách phiếu thử riêng. Vì vậy dữ liệu gửi thành công nhưng trang hóa đơn chính không có thẻ, còn có thể báo chưa có hóa đơn. User yêu cầu xem khoản thu như hóa đơn bình thường.

- MyInvoices hiển thị ngay khoản thu của người nhận bằng cùng kiểu thẻ giá/trạng thái/Xem chi tiết trên trang hóa đơn; không cần mở mục phiếu thử riêng. Không hiện thông báo trống nếu đã có khoản thu. Nút Làm mới tải cả hai nguồn; polling/focus cập nhật nguồn nhận, abort khi rời trang.
- Reuse InvoiceDetailPage và InvoicePaymentPanel cho khoản thu tùy nhập: `/my/invoices/additional/{id}`. Cùng tiêu đề chi tiết/QR/server-paid/trạng thái; không nhập tiền hoặc tự đánh dấu trả từ tenant.
- Backend GET `/api/v1/me/payments/sepay/test-payments/{id}` đọc exact persisted recipient, 404 cho người khác kể cả Owner không phải người nhận; 401 chưa đăng nhập; no-store. Không phụ thuộc giới hạn danh sách20 và không dùng số tiền phía client.
- Whitelist điều hướng sau login thêm numeric route, giữ BIGINT dưới dạng chuỗi. Bảng dữ liệu/giá hợp đồng/billing chain/phiếu đã gửi không đổi, không cần migration hay gửi lại khoản đã có.

## Kiểm tra thực tế

| Phần | Kết quả |
|---|---|
| Backend SQL clone | 32 PASS,86 giây (18 SePay integration có bổ sung exact detail/foreign404/no-session401;5client;9billing) |
| Frontend | Lint PASS,46 unit PASS,build PASS; Vite config/bundle warnings có từ trước |
| Playwright CLI Edge | 14 PASS,19,8 giây:10SePay +4numeric-redirect; desktop1440/mobile390; MyInvoices card, không empty giả, detail QR/server PAID/reload/no edits, redirect exact BIGINT |
| Trực quan | Đã xem mobile danh sách hóa đơn và chi tiết QR, không tràn ngang; console/network/pageerrors trong fixtures được kiểm tra |
| API | SePay OpenAPI JSON và local refs đã kiểm tra |

Lượt browser đầu11/13: hai kỳ vọng exact text PAID thiếu timestamp của panel dùng chung. Snapshot xác nhận UI đã PAID; sửa locator nhận trạng thái kèm timestamp, lượt cuối14/14 PASS. Không đổi code thanh toán để ép test.

MCP mở được trang và chuyển về login vì không có phiên; các luồng authenticated/browser dùng API/auth/QR fixtures. SQL ứng dụng chỉ đọc để chẩn đoán; tests ghi/rollback trên clone. Chưa xác minh đăng nhập/QR qua phiên live, không chuyển tiền thật hoặc gọi SePay/thay khóa.

## Áp dụng và commit

Khởi động lại Backend, tải lại Frontend, đăng nhập đúng tenant được gửi và vào Hóa đơn của tôi. Giữ nguyên khoản #3/#4, webhook/ngrok/API Key. Không reset DB/migration/phiếu/credentials.

- Backend `5c9f01c` — exact-recipient detail endpoint và kiểm thử/API.
- Commit UI xem WORK_PROGRESS.md. Nhánh feature/sepay-payments, không push, chuong giữ nguyên.
