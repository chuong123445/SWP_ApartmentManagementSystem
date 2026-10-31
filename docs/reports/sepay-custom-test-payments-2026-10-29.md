# Phiếu thanh toán thử SePay — 29/10/2026

## Đã thực hiện

- Thêm nút **Tạo phiếu thanh toán thử** trong trang Hóa đơn của Owner và cài đặt SePay; mở trang riêng `/account/settings/payments/test` dùng bố cục tài khoản hiện tại.
- Nhập số tiền nguyên 1..999.999.999 đồng, mặc định 1.000 đồng; tạo QR, mã phiếu, hiển thị người nhận và nhãn tiền thật. Chặn bấm lặp khi đang tạo. Mỗi lần tạo thành công là một phiếu mới.
- Lưu 20 phiếu gần nhất để chọn/xem lại sau tải trang. Tự tải trạng thái mỗi 10 giây khi trang đang hiển thị; có nút tải lại. Phiếu đã trả không hiển thị QR.
- Backend chỉ cho Owner đủ điều kiện tạo/xem phiếu của mình, cần cấu hình SePay đang bật và public HTTPS. Snapshot người nhận/số tiền/mã bất biến.
- Mã `ANCUTEST` + 24 ký tự hex phân biệt với hóa đơn thuê. Webhook kiểm tra khóa, owner, mã duy nhất, ngân hàng/tài khoản/VA, chiều tiền vào và số tiền chính xác. Giữ dedup owner+transaction và lock connection. `id=0` chỉ xác nhận kết nối, không trả phiếu.
- Bảng mới `sepay_test_payments`: IDENTITY, owner, snapshot tài khoản nhận, mã, số tiền, thời điểm tạo/đã thanh toán. Bảng `sepay_events` bổ sung `test_payment_id`; lịch sử phân biệt phiếu thử và hóa đơn thuê. Không sửa RentalInvoice, hợp đồng, công nợ hay doanh thu hóa đơn thuê.
- API GET/POST `/api/v1/owner/payments/sepay/test-payments`, no-store; OpenAPI/ADR/hướng dẫn đồng bộ. V25 additive giữ toàn bộ dữ liệu, không thêm secret hoặc env mới.

## Kiểm tra đã chạy

| Phần | Kết quả |
|---|---|
| Backend/SQL clone | 30 PASS: 16 SePay integration (3 bài mới), 5 HTTP adapter, 9 billing; 1 phút 25 giây |
| Phạm vi mới | 1.000 đồng, trả đúng một lần, số tiền sai/id0/khóa sai/tài khoản sai/tiền ra/khác owner/disabled không trả; số tiền sai bị từ chối, Owner-only/private; không trả hóa đơn thật |
| V25 | Chạy 2 lần PASS trên clone `ancu_identity_verify_20261027213854`; không chạy trên database ứng dụng |
| Frontend | TypeScript lint PASS, 46 unit PASS, build PASS; cảnh báo Vite native config và bundle lớn có từ trước |
| Playwright Edge | 8 PASS/15,8 giây, desktop 1440/mobile 390; gồm 2 luồng mới tạo/tải lại QR 1.000 đồng/server PAID; không tràn ngang; kiểm tra console/page/network với fixtures |
| Trực quan | Đã xem PNG mobile `test-results/visual/sepay-test-payment-390.png` |

Playwright MCP mở được ứng dụng và bị chuyển về login vì không có phiên đăng nhập; có lỗi mạng của môi trường khách. Kiểm tra chức năng đăng nhập Owner và API/provider ở Playwright CLI dùng fixtures, không khẳng định phiên Owner thật đã được kiểm tra. Không gọi chuyển khoản, không replay khóa thật, chưa xác minh thanh toán thật trên SePay.

## Áp dụng

Khởi động lại Backend và tải lại Frontend. Local đang dùng `ddl-auto=update` sẽ bổ sung entity/cột. Với môi trường quản lý schema thủ công chạy V25 sau V23/V24. Giữ ngrok trỏ Backend và webhook/API Key đang dùng; không cần tạo webhook mới. Bấm tạo phiếu thử, dùng QR chuyển đúng 1.000 đồng và nguyên mã; chờ webhook để thấy trạng thái. Đây là chuyển tiền thật, không tự hoàn tiền.

## Commit

- `31b5047` — Backend phiếu thử + V25 + kiểm thử/API/ADR.
- Commit giao diện riêng ghi ở WORK_PROGRESS.md. Không push; nhánh `chuong` được giữ nguyên.
