# Hủy hóa đơn chưa nhận tiền

23/11/2026 theo yêu cầu người dùng. Hóa đơn DRAFT hoặc SENT chỉ được hủy khi chưa nhận tiền; giữ bản ghi CANCELLED và lý do/audit, không xóa vật lý, không sửa trực tiếp SENT. Có paidAt hoặc giao dịch vào dương đúng mã/tài khoản đã nhận (kể cả thiếu/thừa AMOUNT_MISMATCH) thì từ chối INVOICE_HAS_RECEIVED_FUNDS. Các khoản đã nhận do Owner tự đối chiếu với tenant, không tự điều chỉnh/hoàn/bù trừ.

Khóa hợp đồng dùng chung cho hủy, QR và webhook; refresh invoice/payment sau khóa để không dựa trên trạng thái cached. Webhook thiếu/thừa cũng đi qua khóa đó. QR mới bị chặn khi đã hủy. Nếu tiền đến sau khi hủy, giữ event INVOICE_NOT_SENT với invoiceId/amount để xử lý thủ công; không tự đổi lại SENT/PAID hoặc gán sang hóa đơn khác. Hệ thống không thể vô hiệu hóa ảnh QR mà khách đã lưu hay xác nhận tiền chưa được ngân hàng/webhook báo về.

Tenant chỉ thấy CANCELLED nếu hóa đơn từng được gửi (sentAt khácnull), có thông báo hủy và link chi tiết; cancelled draft vẫn riêng tư. Lọc UNPAID/PAID chỉ lấy SENT, tránh tính bản hủy thành nợ. Không có QR ở trang chi tiết CANCELLED. Owner có hủy ở modal lịch sử, nhập lý do và xác nhận; tiền đã nhận hiển thị nguyên nhân chặn. Chuỗi điện nước xử lý ngược từ kỳ cuối nếu đã có kỳ sau; không hủy mốc đang được hóa đơn sau sử dụng. Giữ kiểm tra version/owner/retry/audit.

Scheduler không tự lập/gửi lại coverage đã hủy; Owner có thể chủ động lập lại bằng mã mới. Bản hủy cũ không chặn tự động của các kỳ khác sau khi kỳ đó đã được chủ động xử lý lại.

Kiểm tra thực tế ghi trong WORK_PROGRESS/CHANGELOG: Billing, SePay, Notification integration với DBtest riêng/provider mock;6Playwright desktop/mobile unpaid/paid/partial, TypeScript/frontend. Không chuyển tiền/đổi dữ liệu ứng dụng thật.

Bổ sung: nếu đã ghi nhận tiền nhưng chưa đủ điều kiện PAID, API tạo/lấy QR trả PAYMENT_RECONCILIATION_REQUIRED, tránh thu lại toàn bộ hóa đơn. Chủ nhà đối chiếu thủ công; không tự tính khoản thu bổ sung. Bốn ca SePay mục tiêu đạt sau thay đổi này.
