# Mở chức năng chủ cho thuê

Mọi đăng ký mới (email hoặc Auth0) tạo CUSTOMER. Public registration không nhận requestedRole/role; các Owner/Admin hiện có giữ nguyên. Tại Cài đặt tài khoản có trạng thái riêng Email và CCCD/VNeID, cùng lựa chọn Trở thành chủ cho thuê cho Customer. Người dùng xác thực CCCD, đồng ý đọc thông tin tài sản, Backend kiểm tra Auth0 rồi mới nâng cấp. User xác nhận giữ cả chức năng thuê và cho thuê: OWNER được dùng các endpoint Self rental với ownership/exact-party hiện có; không được gửi yêu cầu thuê căn hộ của chính mình, không cấp ADMIN hoặc TENANT role mới.

## Cấu hình Auth0 M2M

1. Dùng một Machine to Machine application (có thể dùng An Cu Backend Test Application đã có nếu chỉ dành Backend thử nghiệm). Không dùng SPA VNeID-Mock để giữ client secret.
2. Applications → APIs → Auth0 Management API → Application Access: cấp **Client Access** cho M2M với scope `read:users`. Dashboard cũ có thể gọi tab này Machine to Machine Applications. Cấp quyền cho Management API, không chỉ custom API https://api.ancu.local. User-Delegated Access của SPA đã dùng cho login vẫn giữ riêng.
3. Copy Client ID và Client Secret của M2M vào Backend `.env.local` bị gitignore:

```properties
AUTH0_MANAGEMENT_CLIENT_ID=
AUTH0_MANAGEMENT_CLIENT_SECRET=
```

Hai biến trống đã được thêm nếu chưa có. Không dán secret vào chat/git/React. Giữ các AUTH0_ISSUER/AUTH0_CLIENT_ID/AUTH0_AUDIENCE của login trước đó; AUTH0_CLIENT_ID là SPA, AUTH0_MANAGEMENT_CLIENT_ID là M2M. Restart Backend sau khi điền. Không cần thêm secret hoặc dependency frontend.

Backend lấy client_credentials token cho audience https://<configured issuer>/api/v2/ và scope read:users, chỉ cache token trong bộ nhớ đến gần expiry. Sau đó GET đúng user_id từ liên kết đã xác thực, chỉ chọn app_metadata; không search theo email/CCCD và không lưu token vào DB/log. Response/provider error không được đưa nguyên văn ra client. Thiếu cấu hình hoặc provider lỗi trả503, không cấp quyền Owner. Không có dữ liệu mẫu dự phòng.

## Dữ liệu tài sản được hỗ trợ

Đọc `app_metadata.vneid.assets` theo cấu trúc đã chuẩn bị cho owner02. Mỗi tài sản đủ điều kiện cần external_asset_id, name, address; property_mode SINGLE_UNIT/MULTI_UNIT; right_type OWNERSHIP và ownership_type SOLE_OWNER; certificate.number; ít nhất một units có external_unit_id, code và floor_area_m2 >0. Chỉ đếm external_asset_id duy nhất. Cấu trúc đơn giản này hỗ trợ tài sản sở hữu riêng trong mô phỏng; đồng sở hữu/ủy quyền/quyền khác chưa có quy tắc triển khai nên chưa tự chấp nhận. Metadata rỗng hoặc chỉ có trong user_metadata không cấp quyền. Không tự sinh giấy tờ/ảnh/ngày cấp và không coi đây là xác thực nhà nước thật.

Đọc tài sản chỉ sau khi user bấm đồng ý. Request chỉ chứa consent=true và version account; mọi dữ liệu quyền/tài sản phải lấy từ provider. Provider được đọc trước transaction khóa account; trước commit kiểm tra lại phiên/account/link/version, lưu V14 consent/evidence và đổi role nguyên tử. Existing OWNER retry không gọi provider lại và không tạo audit trùng. Không thêm quy tắc thu hồi Owner nếu nguồn đổi; đó là nghiệp vụ riêng.

Sau nâng cấp, account icon và /app dùng role server mới; lịch sử hợp đồng/hóa đơn/yêu cầu thuê của chính user vẫn truy cập được. Không chuyển quyền sở hữu dữ liệu giữa tài khoản. Chưa nhập tài sản Auth0 thành Property/Apartment; không tự approve/publication. Owner vào quản lý để thêm hồ sơ theo workflow hiện có. Không reset accounts/fixtures hoặc tự nâng cấp chỉ vì tên email chứa owner.

## Giới hạn kiểm chứng

Code và adapter được kiểm thử với SQL rollback và HTTP giả lập; live Management API cần credentials/read:users thật để nghiệm thu. User cho biết đã có M2M và sẽ điền local; chưa khẳng định live read/import thành công. Tham khảo Context7 Auth0 GET user by ID/production Management token, Spring Framework7.0.5 URI docs đối chiếu installed7.0.9/Boot4.1.1; https://auth0.com/docs/api/management/v2/users/get-users-by-id .
