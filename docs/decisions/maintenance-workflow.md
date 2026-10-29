# Sự cố và bảo trì thật

Danh sách được lưu trong SQL Server, không khởi tạo phiếu mẫu. Chủ nhà chỉ xem và xử lý phiếu thuộc tài sản của mình. Khách xem phiếu mình báo hoặc phiếu gắn với mình tại thời điểm tạo. Khách chỉ tạo phiếu ở phòng có quan hệ thuê ACTIVE và đang OCCUPIED. Hết hạn nhưng chưa bàn giao vẫn được báo sự cố; không được báo cho phòng đã trả.

API danh sách có phân trang: GET /api/v1/owner/maintenance-tickets?propertyId=... và GET /api/v1/me/maintenance-tickets. POST cùng đường dẫn tạo phiếu; vị trí xác định bằng apartmentId hoặc propertyId (chỉ chủ nhà được tạo cho toàn tòa). Người báo luôn lấy từ tài khoản đăng nhập.

POST /api/v1/owner/maintenance-tickets/{id}/actions nhận version và action. ACCEPT tiếp nhận phiếu PENDING; REJECT cần lý do; ASSIGN yêu cầu đã tiếp nhận, tên và số điện thoại thợ, lịch hẹn; CANCEL chỉ trước khi sửa và cần lý do. Mọi cập nhật khóa phiếu, kiểm tra phiên bản và lưu lịch sử. Không có tài khoản thợ trong phiên bản này.

Không tự chuyển trạng thái phòng thành bảo trì, không tự ghi thanh toán hoặc thu tiền khách. Các kiểm thử tích hợp chạy trên database bản sao, rollback dữ liệu sau kiểm thử.

Sau khi giao thợ, READY cần ghi kết quả sửa chữa và chuyển sang AWAITING_CONFIRMATION. Nếu phiếu gắn khách thuê, chủ nhà không được xác nhận thay. Khách dùng POST /api/v1/me/maintenance-tickets/{id}/actions với CONFIRM để hoàn tất hoặc REOPEN kèm lý do để sửa lại. Với phiếu toàn tòa hoặc phòng không có khách, chủ nhà thực hiện nghiệm thu. Mọi bước vẫn kiểm tra version và lưu lịch sử, không xóa kết quả các lần sửa trước.

READY cũng yêu cầu actualCost và costResponsibility (OWNER/CUSTOMER/SHARED); với SHARED cần customerCost từ 0 đến tổng chi phí. Khi không có khách liên quan, chỉ được chọn OWNER. Chi phí được lưu bằng decimal, không dùng số thực để tính tiền. Mỗi lần đối soát lưu lịch sử, chưa tự tạo hóa đơn hoặc ghi giao dịch thu chi.

Ảnh được lưu trong database, tối đa 5 ảnh/phiếu và 1 MB/ảnh PNG hoặc JPEG. Kiểm tra định dạng và kích thước ảnh ở backend; không dùng tên file làm đường dẫn. POST /api/v1/maintenance-tickets/{id}/images nhận multipart file và kind BEFORE/AFTER/RECEIPT. Chỉ chủ nhà thêm AFTER/RECEIPT. GET /api/v1/maintenance-images/{id} kiểm tra quyền trước khi trả nội dung, đặt no-store và nosniff. Phiếu đã đóng không nhận thêm ảnh. Giao diện tải ảnh bằng bearer token, không công khai đường dẫn ảnh.

Chủ nhà vào Sự cố & Bảo trì; khách vào menu tài khoản → Sự cố của tôi. Cổng cư dân cũ chuyển đến trang thật, không tạo phiếu hoặc giao dịch trong state. Danh sách chủ nhà tự cập nhật khi đang mở, có nút Làm mới và lọc theo tài sản/trạng thái. Danh sách khách làm mới khi quay lại cửa sổ hoặc nhấn Làm mới.

Kiểm thử: MaintenanceIntegrationTests kiểm tra cô lập tài khoản, hợp đồng đang thuê/đã kết thúc, tạo phiếu, vòng đời, phiên bản, chi phí và ảnh riêng tư. Chạy cùng ContractDraftIntegrationTests để kiểm tra hồi quy hợp đồng. Frontend có tests/maintenance.test.ts và e2e/maintenance.spec.ts (chủ nhà trên desktop, khách trên điện thoại). Không tạo dữ liệu mẫu trong database đang sử dụng. Bảo trì định kỳ và tự động ghi sổ thu chi nằm ngoài phạm vi phiên bản này.
