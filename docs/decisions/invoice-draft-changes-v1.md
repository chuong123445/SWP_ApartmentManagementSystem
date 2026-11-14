# Sửa và hủy hóa đơn nháp — FIX-08

## Phạm vi đã triển khai

Owner của đúng tài sản được sửa hóa đơn `DRAFT`: chỉ số điện/nước cuối kỳ, hạn đóng và lý do bắt buộc (tối đa 1.000 ký tự). Không đổi hợp đồng, người thuê, kỳ, chỉ số đầu, tiền thuê, đơn giá, số người hoặc phí trong snapshot. Máy chủ tính lại bằng `BigDecimal`; nước theo người giữ số người và chỉ số nước đã chốt. Hạn đóng không trước ngày đầu kỳ, chỉ số cuối không giảm.

Owner được hủy `DRAFT`, kể cả bản nháp của hợp đồng không còn ACTIVE để xử lý bản nháp tồn đọng. Dòng hóa đơn chuyển `CANCELLED`, không xóa. Không sửa/hủy/gửi lại hóa đơn `SENT` hoặc gửi hóa đơn đã hủy. Hủy không tạo bút toán chi, không hoàn tiền, không thông báo cho người thuê vì bản nháp vốn riêng tư.

## API và kiểm soát đồng thời

- `PATCH /api/v1/owner/invoices/{id}/draft`: `version`, `billingVersion`, `electricityEndReading`, `waterEndReading` (bắt buộc khi METERED), `dueDate`, `reason`.
- `POST /api/v1/owner/invoices/{id}/cancel`: `version`, `billingVersion`, `reason`.
- `GET /api/v1/owner/invoices/{id}/history`: lịch sử lập/sửa/hủy/gửi, tài khoản thao tác, thời gian, lý do và snapshot trước/sau. Chỉ Owner của hồ sơ được đọc. Không cung cấp lịch sử thanh toán tại API này.
- `InvoiceResponse` bổ sung `billingVersion`; danh sách Owner bổ sung bộ lọc `CANCELLED`.

Mọi lệnh sửa/hủy/gửi cùng khóa pessimistic của hợp đồng trước khi đọc mới hóa đơn. Sửa/hủy so khớp cả phiên bản hóa đơn và chuỗi; từ chối khi đã có kỳ sau chưa hủy. Sửa/gửi kiểm tra kỳ kế tiếp và mốc đầu so với hóa đơn SENT gần nhất. Lỗi 409 giữ dữ liệu form và yêu cầu tải lại rõ ràng, không tự gửi lại với phiên bản mới. Hủy lặp cùng tài khoản/lý do trả lại kết quả đã hủy và không ghi sự kiện lần hai.

Lịch sử được ghi cùng transaction, append-only qua API (không có lệnh sửa/xóa lịch sử). Snapshot không chứa ảnh CCCD hoặc chứng từ. Những hóa đơn có trước tính năng chỉ có lịch sử phát sinh từ lúc triển khai; không tạo lịch sử quá khứ giả.

## Chuỗi chỉ số và lập lại

Chỉ `SENT` làm mốc đầu và xác định tháng kế tiếp. Hủy không bỏ qua tháng; có thể tạo hóa đơn mới cùng hợp đồng/kỳ với ID mới. `billingVersion` luôn tăng. Sửa đồng bộ chỉ số đã lưu của cùng kỳ theo giá/phí snapshot của hóa đơn; không sửa baseline hợp đồng. Hủy giữ chỉ số đã lưu. Nếu cần thay giá/phí sau khi hủy, Owner có thể chốt lại tại mục Chỉ số Điện Nước rồi lập hóa đơn mới. Hóa đơn đã hủy không vào chỉ số nợ/doanh thu hoặc danh sách Tenant; thanh toán vẫn chỉ chấp nhận SENT.

V57 tạo `invoice_events`, thay uniqueness toàn bộ `(contract_id,period)` bằng unique filtered index cho `status <> 'CANCELLED'`. Giữ V56 dành cho công việc baseline riêng. Đã chạy schema/tests trên database test riêng; chưa áp dụng thủ công lên database ứng dụng. Startup hiện có sẽ nạp V57 khi backend chạy nhánh mới.

## Cách kiểm tra thủ công

Owner → Hóa đơn & Thu → bản nháp → **Sửa / hủy · Lịch sử**. Sửa chỉ số/hạn, nhập lý do, lưu và kiểm tra tổng máy chủ/lịch sử trước-sau. Mở cùng hóa đơn ở hai cửa sổ: cửa sổ cũ phải nhận xung đột, giữ form và cần tải lại. Hủy cần lý do và xác nhận; mục Đã hủy chỉ cho xem lịch sử. Lập lại cùng kỳ tạo ID mới. Tenant không thấy cả nháp lẫn đã hủy; hóa đơn đã gửi không có nút sửa/hủy.

## Đối chiếu thư viện

Spring Data JPA 4.1.1 theo Boot 4.1.1; Context7 có tài liệu 4.1.0 gần nhất cho transaction/`@Lock`. SQL Server filtered unique index và `DROP CONSTRAINT` đối chiếu tài liệu Microsoft qua Context7; project không pin phiên bản engine. Không thêm thư viện frontend.
