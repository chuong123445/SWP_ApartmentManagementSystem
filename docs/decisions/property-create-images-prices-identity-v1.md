# Tạo tài sản bằng trang riêng, ảnh, giá và IDENTITY

Ngày triển khai: 27–28/10/2026. Người dùng chọn giữ dữ liệu khi chuyển ID và khóa đổi giá nếu còn yêu cầu thuê chờ xử lý.

## Luồng tạo

`/account/properties/new` chọn quan hệ đối với tài sản; các trang con `ownership`, `authorization`, `sublease` chứa form độc lập, không mở hộp thoại tạo tài sản. Đây là quan hệ theo tài sản, không phải ba role tài khoản.

- Chính chủ: giữ luồng đồng ý đọc tài sản/nâng cấp Owner, chọn nguồn Auth0, bổ sung thông tin thương mại, ảnh; Backend kiểm tra nguồn rồi công khai theo quy tắc đã duyệt trước đây.
- Ủy quyền/thuê lại: tạo Self application nháp; tiếp tục hồ sơ giấy tờ/thời hạn/Admin theo ADR trước. Tạo nháp không cấp Owner hoặc công khai tài sản.
- Phải có CCCD VNeID VERIFIED mới upload ảnh/form. Email OTP không thay thế căn cước.

## Ảnh tài sản

Ảnh theo Property, chia sẻ giữa các căn của tài sản đó; một Property cần 1–4 ảnh khi tạo. `property_images` lưu uploader/property/position/type/time và bytes SQL `varbinary(max)`, tách chứng từ pháp lý. Upload trước vào vùng riêng; tạo tài sản gắn ảnh cùng transaction. Không lấy ảnh của người khác, không dùng lại ảnh đã gắn, không nhận ID null/trùng. Ảnh đầu làm ảnh đại diện.

Nhận JPEG/PNG tối đa 5MB/file, tối đa 20MP; đọc từ bytes và mã hóa lại PNG, canonical tối đa10MB. Request multipart tối đa24MB cho4ảnh. Trước khi tài sản được duyệt và có căn PUBLISHED, chỉ người upload được xem; khi đã đăng, ảnh giới thiệu được công khai. `nosniff`, `no-store`; ảnh nháp dùng Bearer/blob khi hiển thị. Danh sách chỉ truy vấn ID ảnh, không tải bytes hàng loạt. Ảnh upload chưa gắn được giữ riêng và có quota100ảnh/tài khoản; chưa có lịch dọn staging hoặc màn hình thay bộ ảnh tài sản đã lưu.

## Giá căn hộ

PATCH `/api/v1/owner/apartments/{id}/prices` nhận version, monthlyRent, electricityUnitPrice, waterUnitPrice. Exact Owner, VACANT, version hiện tại, không còn PENDING request. Không đổi chỉ số công tơ, cọc, trạng thái hay đơn giá hợp đồng. Dùng khóa căn hộ cùng đường gửi/accept request để tuần tự hóa thay đổi. Giá dương; điện/nước không âm; số thập phân kiểm tra phía Backend.

Yêu cầu mới lưu `quoted_monthly_rent`; lịch sử yêu cầu mới giữ giá lúc gửi. Yêu cầu cũ chưa có snapshot giữ NULL và API fallback giá hiện tại, không giả mạo giá quá khứ. Owner có thể chấp nhận/từ chối từng yêu cầu hoặc Customer tự hủy; không tự từ chối hàng loạt/FIFO. Accept chuyển CONTRACT_IN_PROGRESS nên tiếp tục không cho sửa giá. Hợp đồng vẫn theo quy tắc bản nháp/thỏa thuận hiện có.

## ID và dữ liệu cũ

Model gốc dùng `Long` + SQL Server `BIGINT IDENTITY(1,1)`. Bảng phụ có PK=FK dùng ID gốc (identity profile/evidence/import/upgrade); bảng liên kết dùng khóa ghép. API giữ ID dạng chuỗi số để tránh mất chính xác JavaScript; version vẫn là số. UUID ngẫu nhiên của JTI/security/test-key không phải khóa model và không đổi thành số đoán được.

V19 thêm cột số, ánh xạ mọi tham chiếu, thay cột cũ, khôi phục index/unique/FK trong transaction; chặn UUID chưa ánh xạ. `legacy_id_mappings` giữ bảng đối chiếu. Snapshot hợp đồng cũ giữ nguyên JSON/UUID bên trong, DTO snapshot nhận chuỗi để đọc được cả lịch sử và ID số mới. Bảng archive giữ dữ liệu văn bản lịch sử, không phải model đang chạy. Import legacy V4 bỏ qua database đã chuyển ID để tránh nhập lại.

Database có dữ liệu yêu cầu công cụ maintenance với backup đã kiểm tra; application startup không tự chuyển database đang có dữ liệu. `tools/identity-migration.ps1 Prepare` tạo COPY_ONLY backup/VERIFYONLY/restore clone; Verify thử lặp; Apply yêu cầu Backend dừng và lấy backup mới ngay trước đổi. Kiểm tra số bản ghi, fingerprint mật khẩu/snapshot/ảnh giấy tờ; FK WITH CHECK. Không reset account/fixtures. Phiên cũ bị revoke, OTP đổi email đang chờ bị invalidate vì ID tham gia JWT/HMAC đã đổi; phải đăng nhập lại. Bookmark UUID cũ không có alias tự chuyển.

## Xác thực danh tính

`auth_accounts.identity_verified` là summary riêng, backfill từ evidence VERIFIED và cập nhật cùng transaction Auth0. `contact_verified` không phải CCCD; email_verified/phone_verified chỉ liên hệ. Nguồn quyết định cho quyền nhạy cảm vẫn là `auth_external_identities` với source/issuer/subject/verifiedAt, không tin cờ từ client hoặc chỉ summary trên account. Duyệt tài sản không tạo xác thực danh tính.
