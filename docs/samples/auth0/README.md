# Bộ 10 tài khoản Auth0 và tài sản

Ngày chuẩn bị: 28/10/2026. **Toàn bộ tên, CCCD, giấy chứng nhận và thông tin sở hữu là dữ liệu hư cấu để test SWP**, không xác nhận quyền sở hữu thực tế. Dùng miền `example.com` dành cho tài liệu; không gửi email/OTP tới các địa chỉ này.

## Danh sách

| Email | Họ tên | Số tài sản | Số căn/phòng | Trường hợp thử |
|---|---|---:|---:|---|
| owner03@example.com | NGUYỄN MINH KHANG | 1 | 1 | Một căn hộ2phòng ngủ |
| owner04@example.com | TRẦN THỊ THU HÀ | 1 | 4 | Một nhà gồm4căn/phòng nhỏ |
| owner05@example.com | LÊ QUỐC BẢO | 2 | 2 | Căn hộ và nhà nguyên căn |
| owner06@example.com | PHẠM NGỌC ANH | 2 | 4 | Căn hộ3phòng ngủ và nhà3studio |
| owner07@example.com | VÕ HOÀNG NAM | 3 | 7 | Hai tài sản nguyên căn và khu5căn |
| owner08@example.com | ĐẶNG THỊ MAI LAN | 1 | 1 | Biệt thự4phòng ngủ |
| owner09@example.com | BÙI GIA HUY | 2 | 7 | Duplex và nhà6căn/studio |
| owner10@example.com | ĐỖ THỊ KHÁNH LINH | 3 | 6 | Căn hộ, nhà4căn, nhà nguyên căn |
| owner11@example.com | HUỲNH THANH TÙNG | 2 | 2 | Căn hộ và nhà vườn |
| owner12@example.com | PHAN THỊ NGỌC DIỆP | 4 | 9 | Hai tài sản nguyên căn và hai nhà chia nhiều căn |
| **Tổng** | **10tài khoản** | **21** | **43** | SINGLE_UNIT và MULTI_UNIT |

Tất cả tài sản dùng OWNERSHIP/SOLE_OWNER, ID tài sản/căn và CCCD khác nhau. CCCD dùng dải999 để nhận diện dữ liệu hư cấu, đủ12chữ số theo validator mô phỏng. `floor_area_m2` là số JSON, DOB `dd/MM/yyyy`; khớp Backend/Action đang có. Không đặt role OWNER hoặc verified=true từ JSON. `email_verified=false` giữ đúng trạng thái chưa xác thực email.

## File sử dụng

- `users.json` cạnh README: **chỉ là profile/metadata không có password**, được Git theo dõi; không dùng trực tiếp file này nếu muốn import rồi đăng nhập ngay bằng password.
- Bộ sẵn dùng được tạo tại `ancu-proptech-backend/target/auth0-test-users-2026-10-28/`, không đưa lên Git.
- `auth0-users-import.json`: một mảng10user, bcrypt `$2a$10$` trong `password_hash`, dành cho Bulk Import.
- `create-users/owner03.json` đến `owner12.json`: mỗi file một user, có `password`, dành cho giao diện **Create User bằng JSON** đang dùng.
- `TAI-KHOAN-VA-MAT-KHAU.md`: email/password để đăng nhập thử Auth0.
- File ZIP nằm cạnh thư mục: `ancu-proptech-backend/target/auth0-test-users-2026-10-28.zip`.

Không trộn hai kiểu: Bulk Import dùng `password_hash`, không nhận plaintext `password`; Create User dùng từng object có `password`, không dán cả mảng. Không paste `auth0-users-import.json` vào một hộp Create User.

## Cách thêm vào Auth0

**Cách1 — Import một lần:** nếu Dashboard có Import/Export Users, chọn Import, chọn database connection **Username-Password-Authentication** và chọn `auth0-users-import.json` trong bộ private. File đã có password hash, có thể đăng nhập bằng password trong danh sách. Nếu import báo trùng email/user, dừng để kiểm tra; không bật ghi đè/upsert vào tài khoản đang có.

**Cách2 — Tạo từng user bằng JSON:** Users → Create User → giao diện JSON; chọn connection trên → mở `create-users/owner03.json`, chép toàn bộ nội dung rồi Create; lặp lại đến owner12. Cách này phù hợp màn hình Create User mà bạn đã gửi trước đây.

Cả nhóm dùng chung tenant thì chỉ cần một người thêm một lần. **Không cần cấp thêm quyền ghi user cho M2M Backend** chỉ để import bằng Dashboard. Task này chuẩn bị file, chưa gọi Auth0 để tạo/ghi tài khoản thật.

## Test trong ứng dụng

1. Giữ Action `docs/setup/vneid-post-login.js` đã Deploy trong Post Login; đọc `app_metadata.vneid.citizen`.
2. Đăng xuất ứng dụng → Đăng ký/Đăng nhập VNeID mô phỏng → dùng email và password trong bộ private. Nếu Auth0 nhớ email cũ, chọn “Not you?” để đổi. Password này dành cho Auth0, không phải form email/password nội bộ An Cư.
3. Backend kiểm tra token, tạo CUSTOMER/xác thực căn cước; email chưa tự thành verified.
4. Đồng ý kiểm tra tài sản để nâng cấp Owner. Backend đọc `app_metadata.vneid.assets` qua M2M đã có `read:users`.
5. Thêm tài sản → Chính chủ → chọn tài sản. Nhập giá thuê/điện/nước/công tơ và1–4ảnh theo UI hiện tại; metadata không tự cung cấp giá niêm yết hoặc ảnh.
6. Import một tài sản rồi kiểm tra không chọn/import lại được; thử tài khoản khác để kiểm tra cách ly dữ liệu.

Nếu đăng ký Auth0 trùng email đã có trong database An Cư, đăng nhập tài khoản nội bộ đó rồi dùng chức năng xác thực/liên kết; không tự ghép theo email/CCCD.

## Tạo lại bộ private trên máy khác

Tại thư mục Backend, với Java21/Maven đã dùng cho project:

```powershell
mvn dependency:build-classpath '-Dmdep.outputFile=target/auth0-pack-classpath.txt'
$packClasspath = 'target/classes;' + (Get-Content -Raw target/auth0-pack-classpath.txt).Trim()
jshell --feedback silent --class-path $packClasspath tools/prepare-auth0-test-users.jsh
```

Generator sinh password ngẫu nhiên riêng cho mỗi user, kiểm tra bcrypt hash khớp password rồi tạo ZIP. Không gọi Auth0/SQL hoặc đọc Client Secret. Từ chối ghi đè bộ đã tồn tại để không làm mất password đã import. Không tạo lại bộ rồi kỳ vọng password Auth0 cũ tự thay đổi; Auth0 không được cập nhật bởi generator.

Schema tham khảo: [Auth0 bulk user import](https://auth0.com/docs/manage-users/user-migration/bulk-user-import-schema). Code đọc nguồn hiện tại: `Auth0AssetReader`, Action PostLogin và `VneidService` của project.

## Kiểm chứng đã thực hiện

19unit test đạt:2test dữ liệu mới,6test Auth0AssetReader,11test token verifier. Adapter đọc đủ10profile/21tài sản/43căn, không loại nhầm tài sản. Action PostLogin hiện tại tạo đủ8claim ID/access token cho cả10profile. Generator kiểm tra bcrypt10 khớp password, từ chối ghi đè bộ đã tồn tại; kiểm tra10file Create,10record Bulk,14file ZIP và JSON UTF-8 đạt. Không gọi provider thật hoặc nhập user vào tenant trong task này.
