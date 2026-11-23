# Ngày hợp đồng và tiền thuê trọn một tháng

Ngày 22/11/2026. Thực hiện mục 1–3 trong tài liệu Word của người dùng. Người dùng chọn tối thiểu **30 ngày**, không dùng một tháng lịch để thay thế điều kiện này.

## Quy tắc

- Tính ngày theo Asia/Ho_Chi_Minh. Tạo/sửa nháp: hôm nay ≤ ngày bắt đầu ≤ hôm nay +90 ngày, bao gồm hai biên.
- Thời hạn tính cả hai đầu: ngày kết thúc ≥ ngày bắt đầu +29 ngày. Ví dụ 15/01–14/02 hợp lệ; 15/02–14/03 chỉ có 28 hoặc 29 ngày nên không hợp lệ.
- Trước phát OTP và trước ký cũng kiểm tra ngày, tránh nháp cũ hoặc chế độ ký không OTP bỏ qua policy. Không xóa chữ ký đã có; nội dung đã ký vẫn khóa, cần hủy theo luồng được phép nếu không còn hợp lệ.
- Nháp chưa ký có ngày bắt đầu đã qua hiển thị thông báo và nút tới phần sửa ngày. Không tự đổi ngày hoặc bỏ các sửa đổi khác.
- Quyền cho thuê được duyệt tiếp tục giới hạn toàn bộ thời hạn hợp đồng.

## Gói tiền thuê trọn một tháng

Định nghĩa áp dụng cho hợp đồng **đúng 30 ngày tính cả hai đầu**, hoặc **đúng một tháng lịch và đủ ít nhất 30 ngày**. Ví dụ 15/01–13/02 (30 ngày) và 15/01–14/02 (một tháng lịch,31 ngày) đều thu một tháng. Hợp đồng này chỉ chọn chu kỳ 1 tháng/lần; các chu kỳ mới và bộ lọc theo thời hạn cho hợp đồng dài hơn thuộc mục5, chưa triển khai.

Backend tự tính cờ oneMonthRentPackage khi tạo hoặc sửa nháp; không nhận cờ từ client. V70 thêm cờ mặc định false, giữ nguyên chính sách hợp đồng cũ, không tự chuyển đổi hợp đồng đã ký/đang thuê.

Khi có đủ chữ ký và đến ngày bắt đầu, giao dịch kích hoạt (thuê đầu hoặc thuê tiếp) đồng thời tạo và gửi một hóa đơn RENT:

- Bao phủ đúng startDate–endDate; số tiền bằng monthlyRent, rentMonths=1.
- Hạn đóng là startDate, không dùng paymentDay của lịch tháng cho hóa đơn này.
- Chưa thanh toán cho tới khi có xác nhận thanh toán theo luồng hiện hành; tạo hóa đơn không chứng minh đã trả tiền hoặc đã nhận bàn giao thực tế.
- Một thông báo cho đúng tenant; hóa đơn có lịch sử tạo/gửi và chỉ đúng các bên được xem.
- Khóa hợp đồng và unique key hóa đơn chống trùng; gọi lại kích hoạt/scheduler không thu lần hai. Kích hoạt trễ vẫn tạo khoản đến hạn từ ngày bắt đầu.

Điện nước/dịch vụ không cộng vào gói thuê; giữ luồng đối chiếu riêng hiện có, chưa thêm hóa đơn điện nước ngày lẻ/cuối kỳ. Hợp đồng dài hơn giữ lịch tháng tròn và ngày lẻ xử lý riêng theo quy tắc cũ (mục4 chưa sửa). Phân bổ báo cáo tài chính theo tháng hiện có giữ nguyên; không triển khai mục9. Không sửa hóa đơn SENT hay tự thu/hoàn tiền.

## Kiểm tra và tiếp tục

Mục1–2: commit ce35d9eb;63 backend đạt qua hai lượt,169 frontend/TypeScript và4Playwright desktop/mobile với API fixture đạt. Mục3 và hồi quy cuối: 130 backend đạt,2 skipped theo điều kiện ngày của scheduler (71 ContractDraft,45 Billing gồm2 skipped,4 RentSchedule,4 ContractPdf,7 TermPolicy,1 HandoverPdf). TypeScript/170frontend/build đạt;4Playwright desktop/mobile tạo mới/sửa nháp kiểm tra cả90ngày/30ngày/gói thuê/hạn đóng/giữ sửa đổi, API fixture, ảnh mobile đã xem. Có cảnh báo Vite configLoader/chunk lớn có sẵn. Database test riêng; không cập nhật dữ liệu ứng dụng hoặc gửi email thật.

Khởi động lại backend để Flyway chạy V70 và tải lại frontend. Các thay đổi này local-only trong nhánh duy/contract-dates-first-three; không tự push hoặc merge main.

## Cập nhật 23/11/2026

[Quy tắc tháng lịch](calendar-rent-billing-v1.md) thay thế gói một tháng cố định đối với hợp đồng mới/nháp chưa ký được chủ động sửa. Hợp đồng đã ký giữ nguyên chính sách cũ; không áp dụng hồi tố.
