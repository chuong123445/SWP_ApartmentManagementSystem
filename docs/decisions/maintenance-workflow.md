# Sự cố và bảo trì thật

Danh sách được lưu trong SQL Server, không khởi tạo phiếu mẫu. Chủ nhà chỉ xem và xử lý phiếu thuộc tài sản của mình. Khách xem phiếu mình báo hoặc phiếu gắn với mình tại thời điểm tạo. Khách chỉ tạo phiếu ở phòng có quan hệ thuê ACTIVE và đang OCCUPIED. Hết hạn nhưng chưa bàn giao vẫn được báo sự cố; không được báo cho phòng đã trả.

API danh sách có phân trang: GET /api/v1/owner/maintenance-tickets?propertyId=... và GET /api/v1/me/maintenance-tickets. POST cùng đường dẫn tạo phiếu; vị trí xác định bằng apartmentId hoặc propertyId (chỉ chủ nhà được tạo cho toàn tòa). Người báo luôn lấy từ tài khoản đăng nhập.

POST /api/v1/owner/maintenance-tickets/{id}/actions nhận version và action. ACCEPT tiếp nhận phiếu PENDING; REJECT cần lý do; ASSIGN yêu cầu đã tiếp nhận, tên và số điện thoại thợ, lịch hẹn; CANCEL chỉ trước khi sửa và cần lý do. Mọi cập nhật khóa phiếu, kiểm tra phiên bản và lưu lịch sử. Không có tài khoản thợ trong phiên bản này.

Không tự chuyển trạng thái phòng thành bảo trì, không tự ghi thanh toán hoặc thu tiền khách. Các kiểm thử tích hợp chạy trên database bản sao, rollback dữ liệu sau kiểm thử.

Sau khi giao thợ, READY cần ghi kết quả sửa chữa và chuyển sang AWAITING_CONFIRMATION. Nếu phiếu gắn khách thuê, chủ nhà không được xác nhận thay. Khách dùng POST /api/v1/me/maintenance-tickets/{id}/actions với CONFIRM để hoàn tất hoặc REOPEN kèm lý do để sửa lại. Với phiếu toàn tòa hoặc phòng không có khách, chủ nhà thực hiện nghiệm thu. Mọi bước vẫn kiểm tra version và lưu lịch sử, không xóa kết quả các lần sửa trước.
