# Quản trị tài khoản

Admin đang hoạt động có thể tìm tên/email, lọc trạng thái và khóa, mở khóa hoặc xóa tài khoản Owner/Customer. Nút Quản trị hệ thống xuất hiện ở thanh điều hướng và menu tài khoản Admin. Tab Tài khoản người dùng nằm cùng trang với Kiểm duyệt tài sản và Yêu cầu rút tiền.

Sau khi ghép main ngày 04/11/2026, quyền Admin và bảo vệ tài khoản Admin dùng membership từ auth_account_roles/auth_roles, không dùng cột role cũ. DTO danh sách/chi tiết trả roles là mảng; giao diện hiển thị đầy đủ OWNER và CUSTOMER của cùng tài khoản. Xóa cứng chỉ xóa membership của tài khoản đích, giữ catalog dùng chung. Khóa/xóa mềm không thay đổi membership. Startup giữ V49, V50, V52 từ main cùng V51 settlement và V53 quản trị, theo thứ tự V49 → V50 → V51 → V52 → V53.

Mọi thao tác ghi cần phiên bản hiện tại và lý do. Khóa lưu trạng thái trước đó, chuyển sang LOCKED và thu hồi toàn bộ phiên. Mở khóa trả đúng trạng thái trước đó, gồm cả PENDING_VERIFICATION, và yêu cầu đăng nhập lại. Tài khoản khóa từ dữ liệu cũ chưa có trạng thái trước đó cần được xử lý riêng. Chức năng này bảo vệ mọi tài khoản Admin, kể cả chính người thao tác.

Xóa dùng toàn bộ lịch sử nghiệp vụ để chọn cách thực hiện. Tài sản, hồ sơ, yêu cầu thuê, hợp đồng, thanh toán, rút tiền, bằng chứng định danh đã lưu và các quan hệ nghiệp vụ khác giữ tài khoản theo dạng xóa mềm. Xóa mềm đặt deleted_at và INACTIVE, thu hồi phiên, giữ định danh và quan hệ lịch sử. Email tiếp tục thuộc tài khoản đó. Bộ lọc mặc định ẩn tài khoản đã xóa mềm, bộ lọc Đã xóa mềm cho phép Admin xem.

Tài khoản còn trắng được xóa cứng cùng các bản ghi phiên/token, email challenge, reauthentication, trạng thái đã đọc thông báo và membership kỹ thuật nếu có. Xóa không gọi dịch vụ ngoài. Nhật ký quản trị lưu actor_id, ID/email tài khoản đích, kết quả, lý do và thời điểm. ID đích trong nhật ký là tham chiếu lịch sử, cho phép giữ nhật ký sau xóa cứng.

Repository đọc metadata khóa ngoại và các cột ID tài khoản của bảng cũ chưa có FK. Chỉ danh sách bảng kỹ thuật được phép dọn. Quan hệ chưa biết có tham chiếu tài khoản sẽ dẫn tới xóa mềm. Các truy vấn kiểm tra dùng UPDLOCK/HOLDLOCK và transaction SERIALIZABLE, cùng khóa tài khoản và version để xử lý cạnh tranh. Backend kiểm tra trạng thái tài khoản và phiên ở mỗi request.

V53 thêm deleted_at, locked_from_status và admin_account_events. Không đổi dữ liệu tài khoản hiện có. API ở [OpenAPI](../api/admin-accounts.openapi.json).

Admin bấm tên/email tại mỗi hàng tài khoản để mở trang riêng /admin/accounts/{id}. Thông tin tài khoản ở đầu, bên dưới là hai phần Hợp đồng và Hóa đơn đã thanh toán: hai cột trên desktop, xếp dọc trên điện thoại. Nút Danh sách tài khoản quay lại tab quản lý tài khoản. Đường dẫn hỗ trợ mở trực tiếp, tải lại và Back/Forward của trình duyệt. Hai danh sách phân trang độc lập, truy vấn theo đúng bên cho thuê hoặc bên thuê của hợp đồng, gồm dữ liệu tài khoản đã xóa mềm. Lịch sử thanh toán gồm hóa đơn tháng SENT có paid_at và khoản thu bổ sung đã trả gắn đúng hợp đồng/người thuê. Các phiếu chỉ thử trên tài khoản chủ nhà được giữ riêng. Màn hình ghi rõ nguồn khoản thu. Hồ sơ chỉ trả trường liên hệ của AuthAccount qua DTO, không trả tài liệu căn cước, token hay mật khẩu.
