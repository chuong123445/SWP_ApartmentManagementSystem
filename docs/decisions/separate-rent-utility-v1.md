# Tách hóa đơn tiền thuê và điện nước


## Cập nhật ngày 11/11/2026 về tách hóa đơn và chu kỳ tiền thuê

- Người dùng duyệt tách tiền thuê khỏi điện nước/dịch vụ, chọn chu kỳ trong hợp đồng gồm 1, 3, 6 hoặc 12 tháng.
- Người dùng chọn chỉ thu tự động các tháng tròn, chủ nhà xử lý ngày lẻ. Kỳ thuê dùng tháng dương lịch đầy đủ. Kỳ cuối lấy các tháng tròn còn lại trong thời hạn thuê dù ngắn hơn chu kỳ.
- RENT ghi khoảng thời gian, số tháng, giá thuê tháng và tổng tiền thuê. UTILITY ghi chỉ số điện nước và phí dịch vụ theo tháng. LEGACY giữ hóa đơn tổng hợp hiện có và chặn thu lại khoảng tiền thuê/điện nước đã lập.
- Lịch công tơ bỏ qua RENT. Tiền thuê dùng khoảng thu riêng. Mọi thao tác ghi cùng khóa hợp đồng và billingVersion. Bản nháp có thể hủy rồi lập lại cùng kỳ, hóa đơn đã gửi tiếp tục được lưu và thanh toán theo quy trình hiện có.
- Cài đặt tài sản có MANUAL, DRAFT, SEND. Mặc định DRAFT, thực hiện trong cửa sổ 7 ngày trước hạn đến hết ngày đến hạn. Kỳ quá hạn cần chủ nhà đối chiếu thủ công. Scheduler chạy mỗi 15 phút và gọi transaction riêng cho mỗi hợp đồng. Không chạy tự động khi đang có đề nghị kết thúc/bàn giao.
- Hạn đóng mặc định theo ngày thanh toán trong tháng đầu kỳ. Chủ nhà có thể gia hạn, ngày mới phải từ hạn đã thỏa thuận trở đi.
- Hợp đồng cũ bổ sung chu kỳ 1 tháng và ngày thanh toán từ bản nháp đã lưu, dự phòng ngày 5. separateBillingAgreed=false giữ cách tái dựng nội dung/chữ ký cũ. Hợp đồng mới lưu chu kỳ vào nội dung ký và PDF.


## Override 14/11/2026 — tự động gửi tiền phòng mặc định

Người dùng xác nhận bỏ bước chuẩn bị nháp tiền phòng và lựa chọn chế độ gửi.
Tiền phòng luôn tự động lập và gửi trong khoảng D-7 đến hết ngày đến hạn,
theo chu kỳ đã ký. V69 chuyển cấu hình cũ MANUAL/DRAFT sang SEND, tăng version
một lần, đổi SQL default; các lần replay không tăng version tiếp. API cũ còn
nhận enum để tương thích nhưng luôn lưu/trả SEND. Không sửa hóa đơn đã gửi,
chữ ký hợp đồng hoặc ngày thanh toán đã thỏa thuận.

POST rent-invoices thủ công lập và gửi trong cùng transaction, không để lại
nháp nếu lỗi; D-8 bị409 RENT_SEND_TOO_EARLY, D-7 được gửi. Direct send của RENT
nháp cũ dùng cùng kiểm tra ngày. Chủ nhà có thể đối chiếu và gửi kỳ quá hạn;
scheduler không tự truy thu các kỳ quá hạn. Không được đẩy hạn đóng sớm hơn
thỏa thuận. Nháp tiền thuê cũ còn trong cửa sổ D-7 sẽ được scheduler gửi,
kể cả nháp trước đây được lập thủ công; lịch sử vẫn được giữ.

RentBillingContext thêm sendAvailableFrom/canSend theo ngày Việt Nam. UI bỏ
chọn chế độ và nút lưu nháp RENT, hiển thị ngày mở gửi/khóa thao tác nếu quá
sớm. Điện nước/dịch vụ (bao gồm internet/rác) vẫn có nháp và Owner kiểm tra.
Scheduler giữ khoảng chạy15phút/khởi động sau1phút, transaction theo hợp đồng,
khóa chống trùng/notification duy nhất và bỏ qua luồng kết thúc/bàn giao mở.
