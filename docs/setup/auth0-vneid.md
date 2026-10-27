# Kết nối Auth0 VNeID

Luồng đăng nhập/đăng ký CUSTOMER và liên kết self được triển khai trong code. Tài sản trong app_metadata chưa được đọc/nhập; không có đổi role Owner hoặc tự duyệt Property trong slice xác thực này. Đây là mô phỏng SWP, không phải VNeID thật. Backend ghi VERIFIED, không dùng SIMULATED_VERIFIED; không tự gán emailVerified.

## 1. Auth0 Dashboard

- SPA Application: VNeID-Mock; Domain do người dùng cung cấp: `vneid-mock-swp.au.auth0.com`. Application Type phải là Single Page Application; token endpoint authentication phù hợp SPA, không yêu cầu client secret trong React.
- API riêng: `An Cu Backend`; Identifier đã được người dùng xác nhận ngày 27/10/2026: `https://api.ancu.local`; RS256. Không dùng Auth0 Management API làm audience của luồng đăng nhập.
- Database Connection: `Username-Password-Authentication`; bật ứng dụng trên tab Applications của connection.
- Allowed Callback URLs: `http://localhost:3000/auth/vneid/callback` (thêm URL 3002 tương ứng nếu kiểm thử ở 3002).
- Allowed Logout URLs và Allowed Web Origins: `http://localhost:3000` (và 3002 nếu dùng). Khi deploy khai báo HTTPS/origin thật; không dùng wildcard.

## 2. Cấu hình Backend

Thêm vào `.env.local` bị gitignore, sau đó restart Backend:

```properties
AUTH0_VNEID_ENABLED=true
AUTH0_ISSUER=https://vneid-mock-swp.au.auth0.com/
AUTH0_CLIENT_ID=CLIENT_ID_CUA_UNG_DUNG_REACT
AUTH0_AUDIENCE=https://api.ancu.local
AUTH0_CONNECTION=Username-Password-Authentication
```

Audience phải đúng API Identifier thực tế đã tạo; không tự bật khi chưa xác nhận cấu hình. Backend công khai những giá trị không bí mật này qua GET /api/v1/auth/vneid-config; React tự lấy nên không cần VITE client secret hoặc hai bộ cấu hình lệch nhau. Không lưu raw tokens/password vào tài liệu/git/log.

## 3. Thay Action cũ rồi Deploy

Action hardcode CCCD trước đây sẽ gán cùng CCCD cho mọi user. Dùng `docs/setup/vneid-post-login.js` thay thế; khai báo ba Action Secrets `SPA_CLIENT_ID`, `API_AUDIENCE`, `VNEID_CONNECTION` với giá trị tương ứng. Ba giá trị này là cấu hình; dùng cơ chế Action Secrets để không hardcode. Client ID không phải Client Secret.

Action phải gắn vào Post Login trigger và Deploy phiên bản mới; Apply flow nếu Dashboard yêu cầu. Dữ liệu lấy từ app_metadata.vneid.citizen do quản trị viên kiểm soát, không lấy user_metadata. Source/connection và email namespaced là claim bắt buộc của bản tích hợp, ngoài claim CCCD hiện có. Backend kiểm tra issuer/audience/azp/source/connection/RS256/exp/nbf, không tin frontend verified. Access token không chứa danh sách tài sản.

Đăng xuất/đăng nhập lại để nhận token mới. Không dán token vào website giải mã bên ngoài để debug dữ liệu cá nhân; kiểm tra cục bộ và che giá trị trong evidence.

## 4. Luồng ứng dụng

- /register: “Đăng ký bằng VNeID mô phỏng”; /login có đăng nhập tương ứng. User mới có role CUSTOMER, ACTIVE, passwordHash null, email/phone flags không tự verified. Backend tạo phiên JWT nội bộ/refresh HttpOnly giống đăng nhập cũ.
- /account/verification hoặc Settings → Quản lý xác thực tài khoản: đăng nhập tài khoản nội bộ trước rồi bấm xác thực VNeID; Backend liên kết đúng account từ session. Trùng email khi đăng ký yêu cầu login/link; không auto-merge theo email hoặc CCCD.
- Các lệnh đổi mật khẩu/email/phone hiện yêu cầu mật khẩu nội bộ. Account external-only nhận EXTERNAL_ACCOUNT_PASSWORD_REQUIRED; chưa có luồng đặt mật khẩu mới bằng Auth0 trong slice này.
- Source và CCCD lưu riêng ở auth_external_identities; hồ sơ ảnh CCCD tự khai và snapshot hợp đồng không bị ghi đè. Danh sách tài sản sẽ cần consent của ứng dụng, M2M Management API và luồng nhập riêng; chưa coi app_metadata là dữ liệu đã có trong SQL.
- Tài khoản bị LOCKED/INACTIVE vẫn bị chặn; role OWNER/ADMIN không được cấp bởi metadata. Không phát hành token Auth0 làm JWT business của ứng dụng.

## 5. Kiểm tra thật

Chạy test chữ ký RSA/JWKS giả lập và SQL rollback chưa chứng minh tenant đã kết nối. Kiểm tra riêng: authorize callback thành công với user đã tạo, POST vneid-login trả JWT nội bộ, reload phục hồi, logout thu hồi JWT, self verification pending account khác, không trùng danh tính. Dùng tài khoản test riêng và không reset customer@ancu.local hoặc fixtures.

Nguồn framework: Context7 Spring Security 7.1.1 (project Boot4.1.1), Auth0 React docs đối chiếu SDK cài 2.29.0/React19.3.0; https://github.com/auth0/auth0-react/blob/main/EXAMPLES.md .
