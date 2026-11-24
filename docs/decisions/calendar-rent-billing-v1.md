# Thu tiền thuê theo chu kỳ tháng lịch

23/11/2026 — theo lựa chọn người dùng: ngày lẻ tính giá tháng chia số ngày thực tế của tháng nhân số ngày thuê (tính cả hai đầu). Cộng toàn bộ tiền thuê của kỳ rồi làm tròn đến đồng HALF_UP một lần; không làm tròn riêng từng tháng.

Áp dụng cho hợp đồng mới hoặc nháp chưa ký được chủ động lưu sửa. Cờ calendarRentBilling do server xác định, đóng băng trong nội dung ký/PDF. V73 mặc định false để không đổi hợp đồng đã ký/ACTIVE và gói một tháng cũ. Quy tắc mới thay thế gói cố định một tháng cho nháp mới/sửa; tối thiểu 30 ngày vẫn giữ. Không tự sửa lịch sử hóa đơn.

Kỳ đầu bắt đầu đúng startDate, kết thúc cuối tháng thứ rentCycleMonths tính từ tháng bắt đầu, không vượt endDate. Kỳ sau từ ngày 1; kỳ cuối tính đến endDate. Ví dụ giá 3.000.000đ/tháng, thuê 15/01–14/07, chu kỳ 3 tháng: 15/01–31/03 = 3.000.000 × (17/31 + 1 + 1) = 7.645.161đ; 01/04–30/06 = 9.000.000đ; 01/07–14/07 = 1.354.839đ. Kỳ đầu thu chung một hóa đơn, không tách ngày lẻ thành khoản thu riêng.

Khi ký đủ và đến ngày bắt đầu, giao dịch kích hoạt thuê đầu/thuê tiếp tạo và gửi hóa đơn đầu, hạn đóng startDate, một thông báo đúng tenant. Hợp đồng tương lai chờ hiệu lực. Khóa hợp đồng/version/unique kỳ ngăn gửi trùng; scheduler thử lại an toàn. Kỳ sau đến hạn rentPaymentDay trong tháng đầu kỳ, gửi từ D-7; có bắt kịp kỳ bỏ lỡ. Không tự thu tiền/đánh dấu thanh toán.

Hóa đơn lưu phạm vi, tổng và công thức từng tháng; giao diện hiển thị theo ngày thực tế. Hủy RENT lịch tháng không phụ thuộc chuỗi công tơ: có thể hủy kỳ chưa nhận tiền cũ dù có kỳ sau. Scheduler giữ nguyên khoảng đã hủy, không tự gửi lại; chủ nhà có thể chủ động lập lại khoảng trống sớm nhất. Lịch sử chồng lấn khác lịch thỏa thuận bị chặn RENT_HISTORY_CONFLICT. Chuỗi điện nước giữ kiểm tra riêng, không tự chốt công tơ cuối kỳ.

Giữ các chu kỳ hiện có 1/3/6/12 và giới hạn một tháng cho thời hạn khoảng một tháng; chưa triển khai lựa chọn 2/4 hay toàn bộ yêu cầu thời hạn khác của tài liệu Word. Không tuyên bố đã sửa mọi mục business.

Kiểm tra: 89 ca backend khác nhau đạt qua các lượt (74 ContractDraft, 6 CalendarRentSchedule, 4 RentSchedule, 5 ContractPdf), 176 frontend/TypeScript/build đạt; 8 Playwright desktop/mobile gồm wizard và Owner/Tenant hóa đơn với API fixtures. SQL integration dùng DB test riêng, xác minh activation/future wait/retry/notification/các kỳ/hủy rồi lập lại. Ảnh mobile hóa đơn đã xem; PDF có kiểm tra nội dung/số trang bằng test, chưa kiểm tra trực quan bản PDF. Không đổi DB ứng dụng, gửi email hay chuyển tiền thật.
