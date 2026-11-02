# Quản lý tài sản và mở quyền chủ cho thuê — 28/10/2026

Quyết định mới của người dùng thay thế bước nâng OWNER chỉ dựa trên consent và số lượng tài sản trong Auth0. Ba hình thức OWNERSHIP/AUTHORIZATION/SUBLEASE là quan hệ với **từng tài sản**, không phải ba role của tài khoản. Một người có thể dùng cả ba hình thức cho các tài sản khác nhau.

## Điều hướng

- Header Customer có “Đăng cho thuê”; menu tài khoản có “Quản lý tài sản”. Guest được chuyển qua login với returnTo hợp lệ.
- `/account/properties`: CustomerLayout dùng chung header, bố cục/khung nội dung Customer, tiêu đề và danh sách Property → Apartments của chính tài khoản. Customer xem được hồ sơ/tài sản nháp của mình trước khi có quyền Owner.
- `/account/properties/new`: mỗi lần thêm tài sản chọn lại Chính chủ/Được ủy quyền/Thuê lại. Chỉ sau chọn Chính chủ mới hiện consent đọc dữ liệu nguồn. `/account/owner-upgrade` cũ redirect về trang lựa chọn này, không gọi lệnh nâng role.
- `/apartments/{id}` là trang chi tiết chung cho khách thuê và chủ tài sản. Backend chỉ thêm management capabilities/ảnh riêng cho đúng chủ tài khoản. Căn chưa công khai chỉ chủ tài khoản xem được. Công cụ sửa nằm trên trang này; không mở RoomDetailModal mẫu.
- `/app` là khu quản lý cho thuê: tổng quan vận hành, yêu cầu thuê, khách thuê, hợp đồng, hóa đơn và các nghiệp vụ vận hành hiện có. Bỏ các tab CRUD tài sản/căn hộ và cài đặt đơn giá khỏi sidebar. Liên kết “Quản lý tài sản” đi sang trang riêng. Các callback cũ về tài sản cũng redirect, không render modal/market mẫu trong khu vận hành.

## Điểm cấp quyền Owner

| Hình thức | Điều kiện và thời điểm |
|---|---|
| Chính chủ | ACTIVE + bằng chứng VNeID VERIFIED + đồng ý đọc đúng linked issuer/subject → preview không nâng role → chọn tài sản nguồn → đủ thông tin giá/chỉ số/ảnh → Backend kiểm tra lại nguồn và lưu Property/Apartment/evidence thành công → đổi CUSTOMER thành OWNER trong cùng transaction. |
| Ủy quyền / thuê lại | ACTIVE + VNeID VERIFIED → tạo tài sản nháp/nộp hồ sơ, chưa nâng role → Admin duyệt đúng tài sản đầu tiên mới mở OWNER. Công khai căn hộ vẫn là thao tác riêng sau duyệt. |

Hủy form, nguồn lỗi/rỗng, thiếu ảnh/giá, nguồn stale, binding thay đổi, hồ sơ chờ/bị từ chối đều không nâng quyền. Có Owner không tự duyệt tài sản tiếp theo. Giữ chức năng thuê nhà của Owner. Không thu hồi quyền Owner cũ hoặc reset tài khoản vì thay luồng; hết quyền một tài sản vẫn dùng policy hiện có để chặn nghiệp vụ mới, không tự hủy hợp đồng cũ.

## Quyền đọc và chỉnh sửa

`GET /me/properties` lọc SQL theo tài khoản hiện tại và trả nhóm tài sản/căn hộ, không dùng Owner list để nới quyền Customer. Public detail giữ dữ liệu công khai; private management chỉ xuất hiện khi actor đúng owner của Property. Customer không có tài sản không được xem kho của người khác; Admin dùng domain review riêng.

- Sửa title/description/maxOccupants/amenities bằng version căn hộ; không sửa địa chỉ, diện tích, CCCD, giấy chứng nhận hoặc quan hệ pháp lý qua lệnh giới thiệu.
- Giá thuê/điện/nước dùng cùng row lock căn hộ với yêu cầu thuê: chỉ VACANT và không có PENDING request. Giữ giá/hóa đơn/hợp đồng cũ; không tự xử lý request thay người dùng.
- Gallery dùng chung ở cấp Property theo model hiện tại. Cho giữ/bỏ/sắp lại ảnh đã lưu và thêm ảnh staging của chính mình; tổng1–4ảnh, JPEG/PNG theo adapter hiện có. Không lấy ảnh của tài khoản hoặc tài sản khác. Thay gallery có khóa Property, so version và tăng version ngay cùng transaction; ảnh bỏ chọn bị xóa, chứng từ pháp lý không bị động tới.
- Ảnh nháp đọc qua Bearer/object URL, không đưa JWT vào URL/storage. Chỉ tài sản đã duyệt/căn công khai mới có ảnh công khai theo policy trước đó.
- Chủ tài sản được ẩn tin đã hết quyền nhưng không được công khai lại khi quyền chưa hiệu lực/hết hạn; Backend publication vẫn là nơi quyết định.

## Dữ liệu và tương thích

V22 thêm `property_source_consents` với PK/FK account BIGINT, issuer/subject, thời điểm/version consent. Đây là chấp thuận đọc dữ liệu ứng dụng, không phải bằng chứng sở hữu hay quyền Owner. Không đọc danh sách tài sản trước consent; không ghi M2M secret/token vào bảng này. Consent cũ trong `auth_owner_upgrades` giữ nguyên để audit; không tự dùng nó làm quyết định nâng quyền mới.

POST `/me/owner-upgrade` cũ trả409 PROPERTY_ONBOARDING_REQUIRED cho Customer; Owner hiện có vẫn nhận lại tài khoản không đổi. GET cũ chỉ đọc prerequisite, không gọi provider. Đường dẫn API `/owner/properties/vneid-assets` và `/vneid-imports` được giữ tương thích, nhưng service cho ACTIVE VERIFIED Customer/Owner có consent, không dựa vào tên prefix để cấp quyền.

Không thay provider Auth0/Google, danh tính, mật khẩu, dữ liệu mẫu, snapshot hợp đồng cũ hoặc quy tắc ký/thanh toán. Các màn hình vận hành prototype còn lại trong audit không được coi đã tích hợp chỉ vì tách giao diện tài sản. Xem OpenAPI asset-management và báo cáo cùng ngày cho kiểm thử thực chạy/giới hạn.
