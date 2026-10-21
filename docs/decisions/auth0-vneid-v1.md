# Auth0 VNeID — kế hoạch tích hợp, 21/10/2026

Trạng thái: APPROVED DESIGN / NOT IMPLEMENTED. Người dùng chọn dùng `VERIFIED`, không thêm `SIMULATED_VERIFIED`. Đây là luồng VNeID mô phỏng bằng Auth0 cho SWP, không phải kết nối VNeID thật. Quyết định này thay quy tắc email-only cho account eligibility khi chức năng được triển khai; không thay đổi dữ liệu hoặc policy đang chạy trong lần cập nhật kế hoạch này.

## 1. Quy tắc đã chốt

- Hai điểm vào: “Đăng ký bằng VNeID mô phỏng” ở trang đăng ký; “Xác thực bằng VNeID mô phỏng” trong phần xác thực tài khoản đã đăng nhập.
- Kết quả account verification là `VERIFIED`; nguồn `AUTH0_VNEID_SIMULATION`, issuer, subject, thời điểm và phiên bản thông tin được lưu riêng để truy vết. Tên nút và tài liệu vẫn nói rõ mô phỏng; không tuyên bố kết nối cơ quan nhà nước.
- Backend chỉ ghi VERIFIED sau khi kiểm tra bằng chứng Auth0; không nhận role/status/verified/accountId từ client làm thẩm quyền. Chỉ decode token là không đủ.
- Tài khoản SSO mới mặc định CUSTOMER. Không tạo ADMIN/OWNER qua endpoint này. Owner đã tồn tại có thể dùng self verification, giữ role và quy trình duyệt từng Property.
- Account eligibility: email OTP hợp lệ HOẶC bằng chứng Auth0 đã được Backend chấp nhận. Giữ phương án phone hiện có cho non-Customer; không mở phone-only cho Customer. Không sửa emailVerified/phoneVerified chỉ vì SSO thành công.
- Chỉ PENDING_VERIFICATION được chuyển ACTIVE khi đủ điều kiện. LOCKED/INACTIVE bị chặn; không tự mở khóa hoặc nâng role.
- Không tự liên kết theo email/CCCD. Tài khoản cũ phải đăng nhập nội bộ trước; email trùng khi đăng ký trả lỗi yêu cầu đăng nhập/liên kết. External identity đã thuộc tài khoản khác trả 409.
- Không reset fixtures, cập nhật hàng loạt verified, sửa snapshot hợp đồng cũ, duyệt Property hoặc kích hoạt hợp đồng.

## 2. Dữ liệu và tương thích

Giữ Java21/Boot4.1.1, SQL Server, Controller–Service–Repository và AuthAccount hiện có. Không tạo bảng User thay thế hoặc role CITIZEN/USER.

Đề xuất migration tiếp theo sau khi kiểm tra số version thực tế:

- `auth_external_identities`: FK account, issuer, subject, source, linkedAt; unique(issuer, subject). Chuẩn hóa/collation cần giữ tính phân biệt hoa thường của subject theo semantics OIDC. Không persist token thô.
- Bằng chứng account verification: account, method/source, VERIFIED, verifiedAt, external identity FK, claim snapshot tối thiểu và revision. Unique binding CCCD cho nguồn đã chấp nhận nếu dùng làm định danh; xử lý xung đột, không chuyển quyền sở hữu tự động. CCCD là chuỗi 12 chữ số, không dùng số nguyên.
- `passwordHash` hiện NOT NULL: hỗ trợ account external-only bằng hash nullable và chặn password login khi chưa thiết lập; giữ kiểm tra timing/dummy hash. Không đặt mật khẩu mặc định chung. Không đưa hash null vào PasswordEncoder.matches.
- `IdentityProfile` hiện bắt buộc ảnh hai mặt, ngày/nơi cấp và hai địa chỉ. Claim mẫu không đủ để tạo hồ sơ này. Lưu claim Auth0 riêng, không bịa ảnh/ngày/nơi cấp; không tự ghi đè dossier tự khai. VERIFIED ở đây là kết quả account verification, không tự đổi một dossier khác thành đã thẩm định. Khi hiển thị phải dùng đúng nguồn/kết quả tài khoản.
- CCCD/name/dob/gender/address từ claim có thể dùng làm dữ liệu đề xuất; email/profile đang có và snapshot đã lưu không tự bị thay thế. DOB parse strict dd/MM/yyyy rồi lưu LocalDate. Claim thiếu/sai/trùng phải có lỗi rõ ràng và rollback.

## 3. Backend trước Frontend

### T05.V1 — Cấu hình và hợp đồng API

Đọc auth/account OpenAPI, AccountVerificationPolicy, AuthService, SecurityConfig, AuthAccount và IdentityProfile. Tra Context7 theo phiên bản project trước khi dùng API thư viện; chọn/pin phiên bản Auth0 React tương thích React19 khi triển khai.

Cần Auth0 domain/issuer, SPA client ID, API audience và connection được phép mô phỏng VNeID. Domain/client ID/audience là cấu hình, không phải client secret. SPA không chứa client secret. Cấu hình callback/logout URL, Allowed Web Origins và CORS localhost:3000/5173 cụ thể; giữ credentials/CSRF và ưu tiên Vite proxy.

Auth0 Action phải đưa claim cần thiết vào access token dành cho custom API, từ dữ liệu do phía quản trị kiểm soát; không lấy CCCD/verified từ user_metadata mà người dùng có thể tự sửa. Giới hạn connection được chấp nhận bằng bằng chứng do Auth0 phát hành và kiểm tra ở Backend; không coi mọi tài khoản đăng nhập Auth0 là VNeID hợp lệ.

Endpoint đề xuất (planned, chưa tồn tại):

| Endpoint | Chứng thực và kết quả |
|---|---|
| POST /api/v1/auth/vneid-login | Auth0 access token trong Authorization, CSRF; tạo CUSTOMER khi chưa liên kết hoặc đăng nhập account đã liên kết; trả TokenResponse hiện có và refresh cookie |
| POST /api/v1/me/verifications/vneid | JWT nội bộ trong Authorization, CSRF, body chỉ chứa auth0AccessToken; liên kết self và ghi VERIFIED trong transaction; trả trạng thái/version mới |

Hai token ở endpoint self có hai mục đích khác nhau. Không gửi hai Bearer header. Body token phải bị loại khỏi request logging/APM/errors. Không nhận JSON CCCD như bằng chứng thay token.

SecurityConfig hiện giải mã JWT nội bộ HS256 toàn cục. Tách filter chain riêng cho chính xác endpoint vneid-login dùng decoder Auth0 RS256/JWKS; endpoint self tiếp tục dùng decoder nội bộ và service kiểm tra token Auth0 riêng. Không thay decoder toàn cục, không để Auth0 token truy cập business API trực tiếp. Kiểm tra chữ ký, algorithm allowlist, issuer, audience, expiry/nbf và connection/claim policy; không hỗ trợ alg=none hoặc URL JWKS tùy ý từ token.

### T05.V2 — Persistence, service và policy

Controller mỏng → service auth/external identity → repository theo domain. Transaction/row locks/version/unique constraints cho tạo account, liên kết và ghi verification. Hai request đồng thời không tạo hai account cho cùng subject; lỗi constraint phải được xử lý sau rollback phù hợp, không tiếp tục transaction đã lỗi.

Tách chức năng tạo session/issue của AuthService để tái sử dụng JWT nội bộ có sid, refresh rotation/reuse detection và logout/revocation. Đăng ký không thành công không để lại account/link dở dang. Self verification không tạo session kép, giữ session hiện tại và tải lại /me; retry cùng binding không tạo thêm link/evidence và không âm thầm cập nhật claim đã thay đổi. Không lưu Auth0 access token trong DB/log.

Thay EmailAccountVerificationPolicy bằng policy tổng hợp, đồng bộ auth/me, role authority, activation, Owner access và rental submission. Không dùng contactVerified summary làm nguồn duy nhất. OTP/email change không được vô tình xóa evidence Auth0 độc lập; identity claim revision không được tự ghi đè một verification cũ. Unlink, đổi subject/CCCD và tự đồng bộ claim sau liên kết nằm ngoài slice này.

Chuẩn hóa lỗi qua exception handler hiện có: 400 claim sai/thiếu, 401 token sai/hết hạn, 403 account không usable hoặc connection không được chấp nhận, 409 email/subject/CCCD/version xung đột, 503 lỗi lấy khóa/provider khi không thể xác minh. Không lộ token/CCCD đầy đủ trong lỗi. Giới hạn tần suất endpoint và kích thước token.

### T24.V1 — React

Tích hợp Auth0Provider với provider nội bộ hiện có, callback route tách rõ ý định register hay verify-self; SDK quản lý OAuth state/nonce/PKCE, app chỉ cho redirect nội bộ được phép. Chỉ gửi sau khi Auth0 hoàn tất. getAccessTokenSilently dùng đúng audience; không dùng user object/ID token thay access token dành cho API.

Gắn hai nút đã chốt; loading/disable, lỗi Auth0/API, hủy đăng nhập, retry và chống gửi lặp do effect/StrictMode. Backend vẫn phải bảo đảm idempotency. Nếu phiên nội bộ mất ở callback self thì yêu cầu đăng nhập lại, không chuyển sang tạo tài khoản mới. Không persist access token nội bộ/Auth0 vào localStorage/URL; giữ memory + refresh cookie HttpOnly hiện có. HTTP client fetch dùng lại; Axios không bắt buộc.

Sau đăng ký tải session vào AuthProvider nội bộ rồi về Home; sau self verification tải lại /me và phần xác thực, thông báo VERIFIED. Không coi isAuthenticated của Auth0 là đủ để mở business routes. Logout luôn thu hồi phiên nội bộ; xóa trạng thái Auth0 bằng SDK để tránh đăng nhập nhầm người lần sau, không tuyên bố đã logout VNeID thật.

## 4. Kiểm tra và điều kiện DONE

- SQL Server integration: tạo mới, login lại cùng subject, self verify pending Customer/Owner; eligibility đúng, giữ flags email/phone và chặn LOCKED/INACTIVE.
- Negative security: token giả/sai issuer/audience/algorithm/hết hạn, claim thiếu/sai, connection không được phép, forged verified/role/accountId; Auth0 token bị chặn ở business API và JWT nội bộ không thay token Auth0.
- Ownership/concurrency: subject đã thuộc account khác; email/CCCD trùng; hai đăng ký/link đồng thời; retry không trùng evidence/account; không dùng email trùng để chiếm tài khoản.
- Regression: OTP, password login với hash có/null, refresh/reuse/logout/CSRF, self private identity, contract snapshots và Property approval.
- Frontend unit/TypeScript/build; Playwright desktop/mobile cho hai luồng, cancel/error/retry/reload/logout và không overflow. Test double chỉ kiểm tra ứng dụng; phải ghi riêng live Auth0 round trip bằng tenant thực trước khi kết luận tích hợp thật hoạt động.
- Đồng bộ OpenAPI auth/account, API_DOCUMENT, AGENTS và WORK_PROGRESS theo implementation. Đánh dấu endpoint planned cho tới khi có code/checks; không sửa RDS/diagrams.
- Commit từng bước độc lập sau checks/staged diff; không push. Không lưu secrets, token, CCCD thật hoặc ảnh hồ sơ trong artifacts. Dừng server kiểm thử riêng.

## 5. Phạm vi hiện tại và bước tiếp theo

Lần này chỉ hoàn thành kế hoạch. Backend/frontend/database chưa thay đổi; trạng thái chạy vẫn theo email policy và NOT_VERIFIED hiện có. Thông tin tenant/config thực và vị trí ứng dụng Auth0 đã setup chưa được kiểm tra. Có thể chuẩn bị schema/API/tests độc lập; live Auth0 cần cấu hình domain/client ID/audience/connection/Action. Không yêu cầu gửi client secret cho SPA.

Tham khảo đã đối chiếu trong phiên đánh giá: Context7 /auth0/auth0-react; https://github.com/auth0/auth0-react/blob/main/EXAMPLES.md ; https://auth0.com/docs/manage-users/user-accounts/user-account-linking/link-user-accounts . Chưa cài Auth0 SDK nên chưa khẳng định phiên bản tích hợp đã được kiểm thử.
