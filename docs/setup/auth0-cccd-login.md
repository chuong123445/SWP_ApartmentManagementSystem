# Đăng nhập Auth0 bằng CCCD và mật khẩu

Auth0 Database Connection hỗ trợ đăng nhập bằng `username`. Gán `username` bằng chuỗi CCCD 12 chữ số, giữ số 0 ở đầu. Email tiếp tục là thông tin liên hệ; ứng dụng không nhận hoặc lưu mật khẩu Auth0. CCCD làm tên đăng nhập không tự chứng minh danh tính; backend vẫn kiểm tra token/issuer/audience/source/connection và dữ liệu căn cước tin cậy như trước.

## Cấu hình connection hiện có

1. Dashboard → Authentication → Database → `Username-Password-Authentication` → Attributes. Bật Username / **Use Username as Identifier**, đặt độ dài 12, yêu cầu username cho hồ sơ/đăng ký khi phù hợp với nguồn dữ liệu tin cậy.
2. Nếu connection có Flexible Identifiers, cấu hình Username là identifier, Email không là identifier để chỉ dùng CCCD đăng nhập. Giữ Email làm thông tin hồ sơ/liên hệ theo nhu cầu khôi phục tài khoản. Không thay đổi tính duy nhất email một cách tùy tiện.
3. Với giao diện cũ chỉ có **Require Username**, bật để cho phép username + password. Chế độ này vẫn chấp nhận email; không thể khẳng định chỉ nhận CCCD nếu chưa cấu hình identifier tương ứng. Tài khoản cũ chưa có username vẫn dùng email cho đến khi cập nhật.
4. Giữ tên connection, client/audience và Action đang hoạt động. Không xóa/reimport hoặc chuyển connection để thử thay đổi: issuer/subject đang được liên kết với dữ liệu hệ thống.

Đối chiếu tài liệu chính thức: [Require Username](https://auth0.com/docs/authenticate/database-connections/require-username), [Flexible Identifier attributes](https://auth0.com/docs/authenticate/database-connections/activate-and-configure-attributes-for-flexible-identifiers).

## Cập nhật tài khoản hiện có

Từ thư mục repository:

```powershell
node ancu-proptech-backend/tools/prepare-auth0-username-patches.cjs docs/samples/auth0/users.json username-patches.json
```

File kết quả chứa email dùng tìm đúng người trong connection và body `{ "username": "<CCCD 12 chữ số>" }`. Đây là danh sách PATCH, không phải file bulk import. Với từng email, đối chiếu đúng một Auth0 user trong connection, kiểm tra CCCD trong `app_metadata.vneid.citizen`, rồi PATCH `/api/v2/users/{user_id}` với body `patch`. Cần Management API token có `read:users`/`update:users`; sửa connection cần quyền riêng tương ứng. Chỉ gửi trường username; không gửi password, email_verified, phone_verified hoặc metadata khác. Giữ nguyên user_id/subject và mật khẩu.

[Auth0 Update a User](https://auth0.com/docs/api/management/v2/users/patch-users-by-id) quy định username dành cho connection hỗ trợ/yêu cầu username. Nếu chỉ thêm CCCD vào metadata thì Auth0 chưa coi đó là tên đăng nhập. Bộ JSON 10 tài khoản trong repository là hồ sơ giả lập; generator không biến chúng thành danh tính thực và không tự gửi API.

## Bổ sung liên hệ tại An Cư

Lần đầu đăng nhập Auth0, hoặc tài khoản liên kết cũ chưa hoàn tất liên hệ, API trả HTTP428 `VNEID_CONTACT_REQUIRED` và chưa tạo tài khoản/phiên nội bộ. Trang callback yêu cầu email + số Việt Nam rồi gửi lại token Auth0 và contact JSON. Tài khoản mới lưu email khai báo với `emailVerified=false`; số điện thoại luôn chưa xác minh. Tài khoản đã liên kết phải nhập email hiện tại; đổi email tiếp tục qua luồng OTP trong cài đặt. Sau xác nhận thành công, lần đăng nhập sau không hỏi lại. Thông tin này nằm ở account, không nằm trong citizen claims.

CCCD + mật khẩu được cấu hình trên tenant Auth0, không phải bằng cách đổi nhãn ô email ở trang đăng nhập An Cư. Chưa có kiểm chứng việc tenant đã bật username/identifier hoặc đã PATCH username; không coi file đã chuẩn bị là thay đổi đã triển khai.
