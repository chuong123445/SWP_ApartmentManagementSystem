# PDF hợp đồng và ký tay xác nhận

Luồng mới giữ sáu bước tạo hợp đồng từ yêu cầu thuê đã chấp nhận. Có thể chọn loại mẫu, rà soát hồ sơ hai bên/tài sản, chỉnh điều kiện thuê và điều khoản, lưu rồi xem PDF A4 và ký. Thông tin định danh vẫn lấy từ bản chụp hồ sơ trên máy chủ, không lấy thông tin giả từ mẫu HTML.

## API riêng tư

- `GET /api/v1/contracts/{id}/pdf`: PDF thực, phân trang, nhúng Noto Sans để có tiếng Việt; có ô ký cho hai bên, số hợp đồng, số trang, mã SHA-256 nội dung. Chỉ hai bên tham gia hợp đồng được tải, trả `Cache-Control: no-store`.
- `POST /api/v1/contracts/{id}/signatures`: `{version, contentHash, signature, consent}`. Signature là PNG data URL được kiểm tra kích thước, định dạng và nét mực rồi chuẩn hóa. Bên ký được suy ra từ phiên đăng nhập, không nhận ownerId/customerId do client gửi.
- `GET /api/v1/contracts/{id}` bổ sung `templateType` và `signing`: bên tham gia hiện hành, mã nội dung, trạng thái, thời gian và ảnh chữ ký.

Sau chữ ký đầu tiên, nội dung bị khóa. Ký trên bản cũ bị từ chối. Khóa request/contract bảo vệ thao tác chỉnh sửa và ký. Khi cả hai bên ký, hợp đồng chuyển ACTIVE và căn hộ OCCUPIED. Chỉ số đầu kỳ chỉ lấy từ số đo đã lưu nếu đủ cả điện/nước; không giả lập số 0 và không xác nhận đã thu tiền cọc.

`/contracts/{id}` là liên kết riêng tư để gửi bên còn lại. Người nhận phải đăng nhập đúng tài khoản. Không tạo liên kết công khai tiết lộ nội dung hợp đồng, không tự gửi email/SMS/Zalo.

## Dữ liệu và giới hạn

Migration V20 chỉ thêm cột nullable vào `contract_drafts`; không sửa bản chụp nội dung cũ. Hợp đồng nhập từ dữ liệu cũ chưa có bản nội dung gốc không được tự gán PDF, chứng thư hoặc chữ ký giả. Font đi kèm theo giấy phép OFL trong resources/fonts.

Đây là chữ ký tay xác nhận qua tài khoản đăng nhập, không phải chữ ký số PAdES/chứng thư số. Mẫu và lựa chọn loại tài sản cần được hai bên rà soát theo thỏa thuận thực tế; xuất PDF không tự chứng minh tính hợp pháp của hồ sơ hay quyền sử dụng tài sản.

## Kiểm tra

- Backend: test tích hợp hợp đồng/PDF/chữ ký trên database bản sao, gồm quyền đọc, khóa chỉnh sửa sau khi ký, hai chữ ký, từ chối PNG rỗng/sai, thiếu đồng ý và sai mã nội dung; kiểm tra text tiếng Việt, trang, ảnh chữ ký trong PDF.
- Frontend: TypeScript, build, unit test gửi hash/version và tải blob riêng tư.
- E2E: dữ liệu giả lập tách biệt, kiểm tra chủ nhà trên desktop và khách thuê trên viewport điện thoại, vẽ chữ ký, đánh dấu đồng ý, gửi xác nhận và tải PDF.
- Render PDF đầu/cuối có và không chữ ký để kiểm tra trực quan.
