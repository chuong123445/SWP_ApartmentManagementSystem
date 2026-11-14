# Tách hóa đơn tiền thuê và điện nước


## Cập nhật ngày 11/11/2026 về tách hóa đơn và chu kỳ tiền thuê

- Người dùng duyệt tách tiền thuê khỏi điện nước/dịch vụ, chọn chu kỳ trong hợp đồng gồm 1, 3, 6 hoặc 12 tháng.
- Người dùng chọn chỉ thu tự động các tháng tròn, chủ nhà xử lý ngày lẻ. Kỳ thuê dùng tháng dương lịch đầy đủ. Kỳ cuối lấy các tháng tròn còn lại trong thời hạn thuê dù ngắn hơn chu kỳ.
- RENT ghi khoảng thời gian, số tháng, giá thuê tháng và tổng tiền thuê. UTILITY ghi chỉ số điện nước và phí dịch vụ theo tháng. LEGACY giữ hóa đơn tổng hợp hiện có và chặn thu lại khoảng tiền thuê/điện nước đã lập.
- Lịch công tơ bỏ qua RENT. Tiền thuê dùng khoảng thu riêng. Mọi thao tác ghi cùng khóa hợp đồng và billingVersion. Bản nháp có thể hủy rồi lập lại cùng kỳ, hóa đơn đã gửi tiếp tục được lưu và thanh toán theo quy trình hiện có.
- Cài đặt tài sản có MANUAL, DRAFT, SEND. Mặc định DRAFT, thực hiện trong cửa sổ 7 ngày trước hạn đến hết ngày đến hạn. Kỳ quá hạn cần chủ nhà đối chiếu thủ công. Scheduler chạy mỗi 15 phút và gọi transaction riêng cho mỗi hợp đồng. Không chạy tự động khi đang có đề nghị kết thúc/bàn giao.
- Hạn đóng mặc định theo ngày thanh toán trong tháng đầu kỳ. Chủ nhà có thể gia hạn, ngày mới phải từ hạn đã thỏa thuận trở đi.
- Hợp đồng cũ bổ sung chu kỳ 1 tháng và ngày thanh toán từ bản nháp đã lưu, dự phòng ngày 5. separateBillingAgreed=false giữ cách tái dựng nội dung/chữ ký cũ. Hợp đồng mới lưu chu kỳ vào nội dung ký và PDF.
