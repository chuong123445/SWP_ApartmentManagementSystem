# Nhà đang thuê và menu cư dân

Menu gom thành Nhà đang thuê, Yêu cầu & hợp đồng, Hồ sơ & tài khoản. Các mục nâng cấp chủ nhà, hồ sơ quyền cho thuê và thông báo thời hạn nằm trong nhóm thu gọn; không xóa các đường dẫn hiện có. Hồ sơ và cài đặt dùng điều hướng chung của AccountLayout.

Nhà đang thuê (/my/home) lấy quan hệ thuê từ /api/v1/me/tenancies; chỉ hợp đồng ACTIVE xuất hiện như nơi ở hiện tại. Khách có nhiều nơi ở chọn theo apartmentId, không dựa vào số phòng (có thể trùng giữa các tòa). Dữ liệu hóa đơn và sự cố lấy qua API me, lọc theo mã phòng; không gửi customerId, ownerId hoặc tên người báo do trình duyệt tự chọn. Hóa đơn được đọc đủ các trang trước khi lọc để không bỏ sót kỳ ở trang sau.

Tổng quan nối tới hóa đơn, báo sự cố và hợp đồng đúng phòng. Báo sự cố mở một biểu mẫu chọn sẵn phòng; phòng chưa tới ngày bắt đầu chưa được báo. API backend vẫn kiểm tra quan hệ thuê thật. Đổi phòng hoặc rời trang bỏ qua kết quả request cũ. Hóa đơn và sự cố có lỗi độc lập, không dựng dữ liệu mẫu khi lỗi. Quay lại cửa sổ hoặc nhận sự kiện thay đổi quan hệ thuê sẽ làm mới dữ liệu.

Chi tiết hóa đơn hiển thị tài khoản nhận tiền đã lưu trong chính hợp đồng của hóa đơn và số tiền decimal từ backend. Thiếu thông tin hoặc lỗi tải hiển thị rõ; không tự tạo ngân hàng, QR, trạng thái đã thanh toán hay giao dịch. Chuyển khoản thực hiện ngoài hệ thống. Liên kết quay lại giữ mã phòng và tab hóa đơn. Lịch sử hóa đơn/sự cố, hợp đồng đã kết thúc và yêu cầu chưa ký vẫn truy cập từ Yêu cầu & hợp đồng.

Kiểm chứng: tests/resident.test.ts kiểm tra phân trang, tách phòng trùng tên. e2e/resident-home.spec.ts kiểm tra menu, đổi nơi ở, tạo sự cố đúng mã phòng, hóa đơn/nhận tiền đúng hợp đồng, quay lại đúng phòng, điện thoại, hợp đồng đã kết thúc và thiếu thông tin ngân hàng. Dữ liệu trình duyệt là dữ liệu mô phỏng, không tạo hợp đồng hoặc thanh toán trong database thật.
