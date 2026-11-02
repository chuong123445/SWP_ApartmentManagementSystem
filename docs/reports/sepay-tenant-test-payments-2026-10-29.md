# Gửi phiếu thử SePay cho Tenant — 29/10/2026

## Luồng đã bổ sung

1. Owner vào **Hóa đơn → Tạo phiếu thanh toán thử**.
2. Chọn **Gửi đến người thuê** theo tên/căn hộ/hợp đồng đang hoạt động. Nhập 1.000 đồng rồi bấm **Tạo và gửi phiếu thử**.
3. Tenant đăng nhập, vào **Hóa đơn của tôi → Phiếu thanh toán thử** (`/my/test-payments`), xem QR và thông tin người nhận.
4. Tenant dùng ngân hàng chuyển đúng số tiền/mã. Webhook hợp lệ cập nhật trạng thái trên cả hai tài khoản; trang kiểm tra mỗi 10 giây hoặc nút tải lại.

Gửi nghĩa là phiếu xuất hiện trong tài khoản người nhận, không gửi email/SMS. Đây là chuyển tiền thật; không cộng vào hóa đơn/công nợ thuê nhà.

## Các đầu việc

- Backend trả danh sách người thuê từ hợp đồng ACTIVE thuộc exact Owner, không chọn tài khoản bất kỳ. Khi tạo khóa connection→contract, xác minh owner/status, suy ra customerId từ server; không tin customerId do trình duyệt gửi.
- API GET `/api/v1/owner/payments/sepay/test-recipients`; bổ sung optional `contractId` cho POST test-payments. Không truyền contractId giữ chế độ tự thử Owner cũ.
- API GET `/api/v1/me/payments/sepay/test-payments` chỉ trả 20 phiếu của đúng recipient; CUSTOMER/OWNER với chức năng thuê có thể dùng. Không mở API tạo/sửa tiền/mark-paid cho tenant.
- V26 thêm `customer_id`/`contract_id` nullable, FK/index. Các phiếu cũ giữ owner-only, không gán người nhận hoặc viết lại dữ liệu. Người nhận đã ghi nhận không tự thay đổi khi hợp đồng hết hiệu lực.
- UI Owner thêm select, trạng thái tải/lỗi/danh sách trống, nhãn người nhận; UI Tenant có trang QR/danh sách/trạng thái, không có form tạo phiếu hoặc điều khiển Owner. Chặn bấm tạo khi danh sách người nhận chưa tải/đang lỗi; có tải lại.
- OpenAPI/ADR/setup đồng bộ. Không thêm cấu hình webhook/ngrok/key hoặc biến môi trường mới, không thay đổi billing chain/contract price/snapshot.

## Kiểm tra

| Phạm vi | Kết quả thực tế |
|---|---|
| Backend SQL clone | 32 PASS, 68 giây: 18 SePay integration + 5 adapter + 9 billing |
| Bài mới | Gửi đúng tenant; tenant khác/owner khác không thấy; wrong amount không trả; webhook đúng trả cả hai view, retries không ghi trùng, hóa đơn thật vẫn chưa trả. Chặn hợp đồng foreign/missing/non-ACTIVE/ID không hợp lệ/tenant POST. customerId giả từ client không đổi recipient |
| V26 | 2 lần PASS trên clone `ancu_identity_verify_20261027213854`; chưa áp dụng trên DB ứng dụng |
| Frontend | Lint PASS; 46 unit PASS; build PASS, cảnh báo Vite config/bundle lớn có từ trước |
| Playwright CLI Edge | 10 PASS, 21,4 giây, desktop1440/mobile390. Hai luồng mới Owner tạo/gửi → chuyển phiên Tenant → mở từ My invoices → QR/tải lại → server PAID; giữ 8 regression cũ |
| UI chất lượng | Không tràn ngang; không lỗi console/page/network trong fixtures. Đã xem screenshot mobile `sepay-tenant-test-payment-390.png` |

Lượt Backend đầu 31/32: test giả định trường JSON customerId thừa phải bị từ chối, trong khi cấu hình hiện tại bỏ qua trường thừa. Đã sửa bài kiểm tra để chứng minh trường giả không ảnh hưởng recipient server; không nới quyền hay sửa code để bỏ kiểm tra. Lượt cuối 32/32 PASS.

Playwright MCP mở trang được và chuyển về login vì không có phiên; lỗi mạng/GSI của môi trường guest không là bằng chứng luồng authenticated. CLI dùng fixtures cho auth/API/QR; Backend dùng SQL clone và bank adapter giả. Không chuyển tiền thật, không gọi SePay thật, không replay khóa hoặc sửa dữ liệu/tài khoản ứng dụng.

## Cách áp dụng

Khởi động lại Backend, tải lại Frontend. Local `ddl-auto=update` thêm cột; môi trường schema thủ công chạy V26 sau V25. Giữ nguyên webhook và ngrok. Nếu select không có tenant, cần hợp đồng ACTIVE của chính Owner; tính năng không tự kích hoạt hợp đồng/tạo fixtures. Các phiếu cũ không gửi lại: tạo phiếu mới và chọn người nhận.

## Commit

- `53f0863` — Backend recipient authorization/API/V26/kiểm thử và API/ADR.
- Commit giao diện và hướng dẫn ghi trong WORK_PROGRESS.md. Nhánh feature/sepay-payments; không push, không thay đổi chuong.
