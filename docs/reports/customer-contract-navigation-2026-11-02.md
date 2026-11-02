# Khách thuê mở hợp đồng của căn đang ẩn

Người dùng xác nhận lỗi khi dùng Hữu Hà tại `/apartments/16`. Đây là trang tin căn hộ; căn mẫu 16 HIDDEN nên API chi tiết công khai trả 404 đúng chính sách. Hợp đồng HD-4 có trang riêng `/contracts/4`. Thẻ yêu cầu của khách trước đây chỉ liên kết tên căn tới trang tin, không có nút trực tiếp mở hợp đồng như phía Owner.

Đã thêm **Xem hợp đồng** (hoặc **Xem / ký hợp đồng** nếu chưa ký đủ) khi yêu cầu có contractId. Tên căn trên thẻ khách có hợp đồng cũng mở đúng contractId. Thẻ chưa có hợp đồng và đường dẫn quản lý của Owner giữ hành vi hiện tại. Backend vẫn kiểm tra exact party; không mở căn ẩn cho người lạ, không đổi publication, dữ liệu hoặc bản sửa AI.

Kiểm tra thực tế:

- Trước sửa, đăng nhập Owner bằng cấu hình local hiện có: GET contract 4, PDF và context request 39 đều 200; `expired=true`, hai bên có chữ ký. Chỉ tạo và đóng phiên chẩn đoán riêng; không dùng phiên của người dùng và không thực hiện bàn giao/ký tiếp.
- `npm run lint` / TypeScript PASS sau sửa.
- Bốn ca Playwright MCP PASS: nút và tên căn, desktop 1440 và mobile 390. API fixtures mô phỏng Customer Hữu Hà, căn ẩn trả 404 nếu bị gọi. Tất cả mở `/contracts/4`, thấy phần hợp đồng hết hạn, không gọi API căn hộ, không tràn ngang, không pageerror/alert. Thẻ chưa có hợp đồng vẫn trỏ trang căn. Console lượt cuối không có lỗi, network của các fixture trả 200. Đây không phải đăng nhập thật Hữu Hà.
- CLI `npx playwright test e2e/request-contract-navigation.spec.ts` không chạy được worker do `spawn EPERM`. Đã chạy chính bốn callback trong spec qua Playwright MCP, bỏ type annotations và dùng bộ assertion nhỏ tương đương cho các phép so sánh/wait sử dụng trong spec; không tuyên bố CLI PASS. Route mock được gỡ sau chạy.
- React Router manifest 8.4.0; đối chiếu Link/to với tài liệu chính thức hiện hành qua Context7, không có version 8.4.0 riêng trong catalog. Không đổi dependency/API framework.
- Diff check PASS. Không có backend/migration/database mutation cho bản sửa này; không restart server người dùng.

Người dùng tải lại `/my/rental-requests`, chọn **Xem hợp đồng**, hoặc mở trực tiếp `http://localhost:3000/contracts/4` khi đăng nhập Hữu Hà. Chủ nhà vẫn là bên khởi tạo ký tiếp/bàn giao; khách xác nhận trên hợp đồng.
