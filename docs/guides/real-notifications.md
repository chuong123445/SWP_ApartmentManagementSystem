# Thông báo thật theo tài khoản

- Bỏ ba nút thao tác nhanh trên Header quản lý và dòng Trực tuyến/v3.8-PRO ở cuối thanh bên theo yêu cầu. Các chức năng hóa đơn/điện nước vẫn truy cập qua menu riêng.
- Chuông xuất hiện cho tài khoản đã đăng nhập ở giao diện quản lý và giao diện cư dân/tài khoản. Không gọi API cho khách chưa đăng nhập.
- API GET /api/v1/me/notifications lấy thông tin trực tiếp từ bản ghi nghiệp vụ thật: yêu cầu thuê gửi mới/hủy/xử lý, hóa đơn đã gửi, sự kiện bảo trì từ bên còn lại, hợp đồng được tạo/ký/kết thúc, thông báo thời hạn quyền cho thuê, hồ sơ tài sản gửi/xét duyệt.
- Không tạo thông báo giả khi trống hoặc khi lỗi mạng. Không suy diễn hóa đơn đã trả tiền hay quá hạn thanh toán từ trạng thái Đã gửi.
- Trạng thái đọc lưu trong notification_reads bằng khóa tài khoản và mã sự kiện; không lưu trong localStorage. Một tài khoản không được xem/đánh dấu thông báo của tài khoản khác. Không công khai dữ liệu hay cho chọn accountId từ frontend.
- Thông báo có trước tính năng này vẫn hiện nếu dữ liệu gốc có thời điểm sự kiện thật. Quyết định/hủy yêu cầu thuê từ nay được ghi decided_at; dữ liệu cũ thiếu thời điểm xử lý không được gán thời gian giả.
- Một số dữ liệu nghiệp vụ chỉ giữ trạng thái xét duyệt cuối; đây là danh sách từ dữ liệu hiện có, không phải nhật ký đầy đủ mọi lần xét duyệt. Sự kiện không còn nguồn hoặc không còn quyền có thể biến mất khỏi danh sách.
- Danh sách phân trang 20 mục, số chưa đọc tính trên toàn bộ dữ liệu thuộc tài khoản. Đọc tất cả chỉ áp dụng đến snapshotAt do server trả, để thông báo mới đến sau không bị đánh dấu nhầm.
- Đánh dấu đã đọc idempotent; khóa database chống tạo bản đọc trùng. Lỗi được hiển thị để thử lại, không báo thành công giả.
- Frontend cập nhật khi mở chuông, quay lại cửa sổ và mỗi 30 giây khi trang đang hiển thị. Đây là cập nhật định kỳ, chưa có WebSocket/push ngoài trình duyệt.
- Bấm thông báo đánh dấu đã đọc rồi mở đúng hóa đơn/hợp đồng hoặc tab quản lý kèm tài sản. Bấm ngoài hoặc Escape để đóng. Dữ liệu API không được cache.
- Migration V34 tạo notification_reads và thêm decided_at vào rental_requests; không sửa thông tin nghiệp vụ cũ, không gửi email hay tin nhắn bên ngoài.

## Kiểm tra

NotificationIntegrationTests: dữ liệu hóa đơn/yêu cầu thuê thật, quyền sở hữu, không hiện hóa đơn nháp, trạng thái đã đọc qua lần tải lại, idempotent, phân trang và không đánh dấu nhầm thông báo mới.
Playwright notifications.spec.ts: bỏ đúng nút Header và footer; đọc một/tất cả, điều hướng đúng tab/tài sản, tải lại, lỗi API và bố cục desktop/mobile. Các bài API dùng SQL Server kiểm thử riêng và rollback; bài giao diện dùng API giả lập.
