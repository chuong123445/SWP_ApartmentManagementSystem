# Bổ sung thông tin cho 10 tài khoản Auth0 đã tồn tại

Bộ này gồm thông tin hư cấu chi tiết dùng cho VNeID mô phỏng, không phải hồ sơ pháp lý thật. Giá trị ngày cấp/nơi cấp/địa chỉ đã đầy đủ; không dùng “nơi cấp mẫu”. Email example.com và căn cước dải999 vẫn được giữ để nhận diện dữ liệu kiểm thử. Số điện thoại thuộc hồ sơ tài khoản thông thường, không nằm trong citizen/claim VNeID. Không gửi email/SMS hoặc dùng thông tin này làm tài khoản nhận tiền.

`users-upsert.json` chứa đúng10email và toàn bộ app_metadata hiện có kèm thông tin bổ sung. Không có password, password_hash, user_id, name, email_verified hoặc phone_verified; không dùng file này để tạo tài khoản mới. Tên hiển thị/mật khẩu/subject và trạng thái xác thực của tài khoản đang có phải được giữ nguyên.

## Cách cập nhật

1. Export/sao lưu app_metadata hiện tại trên Auth0. Nếu đã thêm tài sản/metadata khác ngoài bộ gốc21tài sản/43căn, gộp các phần đó trước. Auth0 bulk upsert **thay thế toàn bộ app_metadata**, không merge; không import đè nếu chưa đối chiếu.
2. Dùng Bulk Import cho đúng database connection Username-Password-Authentication, chọn file users-upsert.json và bật upsert=true. Không xóa user, không tạo user mới với cùng căn cước, không import lại bộ password cũ. Nếu công cụ Dashboard không có tùy chọn upsert, dùng các file per-user-app-metadata để cập nhật phần app_metadata của đúng user đã có; không dán vào Create User.
3. Các file per-user-app-metadata/*.json là toàn bộ object app_metadata cho từng email, không phải mảng hoặc request tạo user. Giữ mọi dữ liệu mới đã có trên tenant khi hợp nhất thủ công.
4. Deploy nội dung vneid-post-login.js mới vào đúng Action Post Login. Bản này đưa ba trường căn cước bổ sung vào token, không đưa số điện thoại.
5. Backend phải có code của unit này và migration V45; không chạy bằng bản backend cũ. Chỉ áp dụng migration theo quy trình môi trường, không xóa/tạo lại database. Khởi động lại backend sau khi cập nhật.
6. Đăng xuất/đăng nhập lại qua VNeID mô phỏng để lấy token mới. Backend chỉ bổ sung trường đang trống khi issuer/subject/CCCD/họ tên/ngày sinh/giới tính/địa chỉ cốt lõi khớp bằng chứng đã liên kết. Không tự đổi các giá trị đã có, emailVerified, phoneVerified, mật khẩu, vai trò hoặc trạng thái khóa.
7. Tạo hợp đồng mới hoặc mở context soạn hợp đồng mới để lấy thông tin đầy đủ. **Hợp đồng/bản nháp đã lưu giữ nguyên snapshot**, không tự cập nhật khi Auth0 thay đổi. Không xóa hợp đồng cũ để ép dữ liệu mới vào.

Số điện thoại trong hợp đồng chỉ lấy từ hồ sơ tài khoản thông thường. Nếu chưa nhập thì hiển thị chưa có dữ liệu; cập nhật qua Cài đặt tài khoản → Số điện thoại. Đăng nhập VNeID không tự điền số hoặc xác thực SMS.

Không có thay đổi nào được gửi lên Auth0 bởi công cụ chuẩn bị file này. Người vận hành thực hiện import sau khi kiểm tra bản sao lưu/metadata khác. Tài liệu chính thức: https://auth0.com/docs/manage-users/user-migration/bulk-user-imports và https://auth0.com/docs/manage-users/user-migration/bulk-user-import-schema .
