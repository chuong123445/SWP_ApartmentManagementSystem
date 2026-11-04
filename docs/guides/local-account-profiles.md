# Cập nhật hồ sơ ba tài khoản local

Đơn vị ngày 04/11/2026 cập nhật đúng Owner ID 3 và hai Customer ID 5, 6 theo yêu cầu người dùng, cùng thông tin các bên trong hai hợp đồng chưa ký HD-8, HD-9. Email, tên, ngày sinh, điện thoại, địa chỉ, CCCD, ngày/nơi cấp và địa chỉ trên căn cước được cung cấp qua JSON riêng ngoài Git. Mật khẩu, ID, vai trò, trạng thái ACTIVE, lịch sử thanh toán và tài khoản thu SePay giữ nguyên.

## Nguồn định danh và hiển thị

V55 cho phép nguồn `LOCAL_DEMO` với issuer cố định `urn:ancu:local-demo` và subject bằng account ID. `VerifiedIdentityPolicy` chỉ chấp nhận nguồn này khi profile local đang bật và prod không bật. Không có endpoint công khai để ghi nguồn này. Auth0 giữ nguồn `AUTH0_VNEID_SIMULATION`; việc chọn/nhập tài sản từ Auth0 vẫn bắt buộc nguồn Auth0, không gửi định danh LOCAL_DEMO đến nhà cung cấp.

Self GET `/api/v1/me/verifications` bổ sung `vneid.source`. Với LOCAL_DEMO, các trang hồ sơ, căn cước, cài đặt và xác thực hiển thị thông tin và trạng thái đã xác thực, không có nhãn dữ liệu mẫu hoặc mô phỏng. Nguồn được giữ trong database/API và snapshot riêng tư phục vụ kiểm tra. Đối với Auth0, các nhãn mô phỏng của luồng đó vẫn giữ nguyên. Đây không phải kết quả xác minh từ cơ quan nhà nước hay xác nhận sở hữu email/số điện thoại từ nhà cung cấp.

Hồ sơ ảnh tự khai vẫn là dữ liệu riêng NOT_VERIFIED; không đổi ảnh hay coi ảnh cũ là bằng chứng xác thực. Snapshot hợp đồng mới lưu `VERIFIED_LOCAL_DEMO`/`localFixture=true`. Snapshot đã ký không bị viết lại. Chỉ HD-8/HD-9 được người dùng cho phép đồng bộ khi cả hai bên chưa ký.

## Helper một lần

`ancu-proptech-backend/tools/apply-local-account-profiles.ps1` chỉ kết nối localhost/proptech_db và giới hạn đúng các ID trên. Đường dẫn JSON là tham số bắt buộc; không đặt email, CCCD hay mật khẩu thực vào repo.

```powershell
# Xem phạm vi; không ghi dữ liệu
./tools/apply-local-account-profiles.ps1 -InputFile <private-json-path>
# Thực thi toàn bộ trong transaction rồi rollback; không đổi .env.local
./tools/apply-local-account-profiles.ps1 -InputFile <private-json-path> -Validate
# Sao lưu/VERIFYONLY, kiểm tra điều kiện rồi commit
./tools/apply-local-account-profiles.ps1 -InputFile <private-json-path> -Apply
```

JSON có `source: LOCAL_DEMO`, `unsignedContracts: [8,9]` và `accounts` gồm đúng ba ID. Mỗi tài khoản có `id`, `previousEmail`, `email`, `fullName`, `phone`, `dateOfBirth`, `gender`, `address`, `documentNumber`, `documentIssueDate`, `documentIssuePlace`, `permanentAddress`. Ngày theo ISO yyyy-MM-dd. Không thay định danh đã liên kết Auth0, email/CCCD trùng tài khoản khác, tài khoản không ACTIVE hoặc bản nháp đã ký. Version và khóa transaction bảo vệ thay đổi đồng thời.

Apply kiểm tra fingerprint 20 nhóm dữ liệu trước/sau, gồm mật khẩu/vai trò/trạng thái, tài khoản khác, hợp đồng đã ký, tiền và lịch sử. Chỉ phiên đăng nhập/challenge email đang mở của ba tài khoản được thu hồi. Helper cập nhật bốn khóa email trong `.env.local` đã ignore: LOCAL_OWNER_EMAIL, LOCAL_TENANT_1_EMAIL, LOCAL_TENANT_2_EMAIL, SEPAY_PLATFORM_SOURCE_EMAIL. SePay tiếp tục dùng cùng owner ID và kết nối đã lưu; đổi email không chuyển hoặc xóa kết nối ngân hàng.

Nếu helper bị ngắt sau commit DB nhưng trước cập nhật env, chạy lại cùng input với Apply nhận `already-applied` và đồng bộ env. Trạng thái này chỉ đối chiếu email và ba nguồn LOCAL_DEMO đã tồn tại; không phải công cụ cập nhật hồ sơ nhiều lần. Không tự chạy helper lúc startup hoặc reset tài khoản đã đổi thông tin.

## Bằng chứng thực hiện

Ngày 04/11/2026: Preview PASS; Validate/rollback PASS; Apply trên proptech_db lúc 05:11:54 UTC PASS, ba tài khoản/hai bản nháp, thu hồi một session; 20 nhóm fingerprint giữ nguyên trong transaction. Có backup COPY_ONLY/CHECKSUM, RESTORE VERIFYONLY PASS; chưa thực hiện restore. Input và backup nằm ngoài Git; evidence không chứa hồ sơ đầy đủ tại target/local-account-profile-change-20261104.json đã ignore.

Kiểm tra code: 153 trường hợp backend khác nhau đạt qua các lượt test trên database test riêng (auth, identity policy, contract, property access/dossier/import). 109 frontend unit tests, TypeScript và build đạt. Playwright MCP 6 trường hợp hồ sơ trên desktop 1440/mobile 390, mỗi trường hợp đi qua bốn trang; không lỗi console/network/API ngoài dự kiến hoặc tràn ngang. Hai ảnh căn cước desktop/mobile đã xem. Sáu trường hợp contract early/open/wizard kiểm tra riêng trong đơn vị `2ad1128`; không gọi Auth0, Gmail hoặc chuyển khoản thật.

Khởi động lại backend để nạp service/config mới, tải lại frontend rồi đăng nhập bằng email mới với mật khẩu cũ. Helper đã cập nhật dữ liệu local; người khác chỉ kéo source không nhận các hồ sơ riêng này. Cấu hình triển khai phải bật profile phù hợp, không dựa vào local cho production.
