# Tra cứu tài khoản, CCCD và vai trò

`dbo.vw_account_roles` có một dòng cho mỗi liên kết trong `auth_account_roles`. Dữ liệu vai trò lấy từ `auth_roles`, không dùng cột `auth_accounts.role` cũ. Tài khoản có OWNER và CUSTOMER xuất hiện hai dòng. View giữ cả tài khoản bị khóa/xóa mềm nếu membership còn tồn tại.

```sql
SELECT account_id, full_name, document_number, role_code, role_name,
       identity_source, identity_verification_status, identity_is_local_fixture
FROM dbo.vw_account_roles
ORDER BY account_id, role_id;
```

`full_name` là tên hiển thị của tài khoản. `document_number` giữ kiểu chuỗi và số 0 đầu, ưu tiên bằng chứng VERIFIED trong `auth_external_identities`; nếu chưa có thì lấy `account_identity_profiles`. `identity_source` cho biết AUTH0_VNEID_SIMULATION, LOCAL_DEMO hoặc SELF_DECLARED. LOCAL_DEMO luôn có `identity_is_local_fixture=1`; hồ sơ tự khai vẫn NOT_VERIFIED. Không có hồ sơ thì CCCD/nguồn là NULL và trạng thái UNVERIFIED. View phục vụ tra cứu nguồn dữ liệu, không thay thế `VerifiedIdentityPolicy`: ứng dụng chỉ chấp nhận LOCAL_DEMO khi bật local và không bật prod.

Vai trò và bằng chứng căn cước được lưu riêng: CCCD NULL không tự chuyển tài khoản thành CUSTOMER. Tài khoản đăng ký thông thường có CUSTOMER; Admin hoặc Owner hiện có có thể chưa lưu CCCD. View phản ánh membership đã lưu, không cấp/thu hồi quyền hay xác thực tài khoản.

V54 tạo/cập nhật view và được đăng ký sau V53 trong cấu hình khởi động. Có thể chạy riêng `V54__account_role_view.sql` trên database đã có V11/V12/V13/V19/V52. Script chạy lặp được, không sửa dữ liệu bảng nguồn và không cấp thêm quyền SQL. Đây là tra cứu trong database có CCCD đầy đủ; không thêm API hoặc hiển thị công khai.

Kiểm tra 04/11/2026: 15 AuthIntegrationTests đạt trên database test riêng, gồm hai trường hợp view kiểm tra thiếu CCCD/membership canonical và nguồn định danh/số 0 đầu. Đã tạo view trong `proptech_db` SQL Server 17.0.1000.7: 30 tài khoản, 32 dòng membership; chạy script hai lần, không trùng dòng. Fingerprint SHA256 của cả 5 bảng nguồn giữ nguyên; CCCD trong view vẫn varchar(12). Các con số là thời điểm kiểm tra, không được cố định trong view.
