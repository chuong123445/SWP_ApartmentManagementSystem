# Ẩn thao tác sửa giá khi căn hộ bị khóa — 02/11/2026

Chi tiết căn hộ trước đây vẫn hiện3nút Sửa cho tiền thuê/điện/nước khi `management.canEdit=true`, chỉ disable theo `pricesEditable=false`. Nay cả nút và form chỉ xuất hiện khi trường thực sự được phép sửa. Các giá vẫn xem được; hiển thị một thông báo khóa chung từ backend, có fallback nếu thiếu lý do. Nút sửa tiêu đề/mô tả/tiện ích/số người và ảnh không bị khóa theo giá. Căn trống đủ điều kiện vẫn mở được từng form giá.

Không thay backend permission/rules, hợp đồng, dữ liệu hoặc schema. API vẫn là nguồn quyết định `pricesEditable`; không suy luận quyền chỉ từ chữ “Đang thuê”. Form cũng ẩn khi quyền sửa giá mất sau reload, không giữ một form disabled mở sẵn.

Kiểm tra thực tế: TypeScript PASS; native-config Vite build PASS715ms (cùng plugin React/Tailwind/alias; cảnh báo bundle>500kB có sẵn).6callback từ spec asset-management qua Playwright MCP PASS: occupied/pending/editable ở1440/390px; kiểm tra3nút có/không, form giá, nút sửa metadata, thông báo, giữ giá đọc, không tràn ngang, không price PATCH, console/pageerror/network fixtures sạch. Spec runner CLI không được chạy thành công trong unit này; không gọi đây là CLI E2E PASS. Harness dùng SVG placeholder thay transport PNG của fixture để chạy trong MCP không có Node Buffer; không đổi logic kiểm tra nghiệp vụ.

Lượt đầu fixture lịch sử thiếu route notification mới, sinh2GET404; bổ sung mock `/me/notifications`, chạy lại đủ6PASS. Đã xem screenshot mobile `tmp/occupied-price-actions-mobile.png`: giá không có nút Sửa, thông báo hiện rõ, nút sửa metadata giữ nguyên. Mocks/listeners được gỡ, browser about:blank; Vite test3007 đã dừng. Không restart server người dùng, không dùng session/ghi dữ liệu thật hoặc gọi provider.

Nhánh độc lập `fix/hide-locked-apartment-price-actions` từ origin/main c4891c7; unit không phụ thuộc PR31 hoặc nhánh VNeID. Giữ root workspace và mọi công việc khác. Context7 React conditional rendering được đối chiếu với React19 của project; tài liệu learn không pin patch version, không thêm API/dependency mới. Chỉ commit unit sau kiểm tra diff; push nhánh/tạo PR theo yêu cầu trước đó, không merge/push main.
