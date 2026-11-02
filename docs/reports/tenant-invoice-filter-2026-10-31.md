# Bộ lọc hóa đơn của người thuê — 31/10/2026

Trang **Hóa đơn của tôi** mặc định **Chưa thanh toán**. Người thuê chọn **Đã thanh toán** để xem lịch sử hoặc **Tất cả hóa đơn** để xem cả hai. Đổi bộ lọc đưa phân trang hóa đơn thuê về trang đầu; thông báo trống giải thích lựa chọn xem hóa đơn cũ.

## Phạm vi

- `MyInvoicesPage`, `useTenantInvoices`, `useReceivedTestPayments`, `billingService`: gửi bộ lọc cho cả hóa đơn thuê và khoản thu bổ sung; giữ refresh/poll hiện hành và link chi tiết.
- `InvoiceController` → `InvoiceService` → `RentalInvoiceRepository`: `paymentStatus=ALL|UNPAID|PAID`, lọc theo receipt `paidAt` trước khi phân trang/count. Hóa đơn chưa cấp QR hoặc đã cấp QR nhưng chưa nhận tiền đều UNPAID. Chỉ exact customer và hóa đơn SENT.
- `SepayController` → `SepayService` → `TestPaymentRepository`: lọc exact-recipient receipt trước khi lấy 20 khoản bổ sung gần nhất theo bộ lọc, giữ giới hạn hiện hành. Không thay đổi API chi tiết của khoản cũ.
- API mặc định ALL để giữ tương thích client khác; trang khách thuê gửi UNPAID mặc định. Giá trị không hợp lệ trả 400. OpenAPI billing/SePay cập nhật.
- Không migration, không sửa trạng thái/giá tiền/hóa đơn đã lưu hoặc luồng Owner. Không thực hiện giao dịch ngân hàng trong lượt này.

Người dùng xác nhận thanh toán tự động thực tế đã thành công trong cuộc hội thoại ngày 31/10/2026. Đây là xác nhận của người dùng; agent không tự quan sát một giao dịch ngân hàng mới trong lượt chỉnh sửa này.

## Kiểm tra thực tế

- **26 backend tests PASS**: 19 SePay integration (gồm test mới về paid/unpaid, pagination/count, QR chưa trả, history privacy, enum invalid và khoản bổ sung sau webhook) + 7 identity regression. SQL Server clone `ancu_identity_verify_20261027213854`, không chạy trên database ứng dụng; seed/fixtures tắt.
- **85 frontend unit tests PASS**. Cập nhật kỳ vọng URL của billing test để giữ mặc định ALL của API.
- TypeScript `tsc --noEmit` và Vite production build PASS. Cảnh báo bundle lớn hiện hành.
- Playwright MCP: desktop 1440px và mobile 390px, mỗi viewport kiểm tra mặc định unpaid, lịch sử paid, tất cả, reset page, refresh sau settlement, empty state, responsive và console/network. Tất cả đạt; dùng Auth/API fixture, không chứng minh provider thật. Đã xem ảnh mobile.
- Lượt browser đầu dùng locator `Sau` không khớp chữ `Trang sau`; sửa locator kiểm thử, chạy lại toàn bộ hai viewport đạt.
- Context7 React 19.3.0 đúng dependency đã cài. Spring Data JPA thực tế 4.1.1; nguồn Context7 có 4.1.0, đã đối chiếu và xác nhận bằng integration test với dependency thực.
- Node test runner mặc định bị `spawn EPERM`; chạy native TypeScript transform/alias loader tạm và `--test-isolation=none`, không đổi dependency. Vite native loader cần preload `__dirname` tạm; không sửa cấu hình build project.

Lệnh fetch GitHub trong phiên này lỗi kết nối proxy localhost. Kết quả push cuối cùng được báo riêng trong bàn giao; không coi commit local là đã push.
