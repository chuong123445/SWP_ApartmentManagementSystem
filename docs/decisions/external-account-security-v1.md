# Xác thực lại tài khoản external — 28/10/2026

Người dùng cho phép sửa F08. Tài khoản có thể đăng nhập bằng Auth0/Google mà chưa từng thiết lập mật khẩu An Cư. Mật khẩu Auth0 không được gửi vào form mật khẩu An Cư.

## Luồng và giới hạn

- `GET /api/v1/me/security` trả `passwordAvailable` và các provider đã liên kết, hiện được cấu hình. Không suy diễn liên kết từ email giống nhau.
- `POST /api/v1/me/reauthentications` tạo challenge cho PASSWORD/PHONE/EMAIL, gắn account, session ID và account version. Thời hạn 5 phút, tối đa 10 challenge/15 phút/account.
- Auth0: popup SDK hiện có, `prompt=login,max_age=0`; Backend kiểm tra chữ ký RS256, issuer, audience chính xác SPA, azp nếu có, exp, iat và auth_time mới kể từ challenge. Kiểm tra đúng issuer/subject của bằng chứng VERIFIED đã lưu. SDK kiểm tra nonce OAuth của nó; Backend dùng thời điểm xác thực có chữ ký và chặn dùng lại credential.
- Google: người dùng bấm nút đăng nhập, auto-select tắt; ID token phải mang nonce ngẫu nhiên của challenge. Backend dùng Google decoder hiện có, kiểm tra nonce, iat/exp và đúng googleSubject đã lưu. Đây là xác nhận tài khoản Google qua GIS, không tuyên bố Google luôn hỏi lại mật khẩu hoặc cung cấp yếu tố xác thực thứ hai.
- `POST /api/v1/me/reauthentications/{id}/confirm` tối đa 5 lần thử, trả quyền opaque ngẫu nhiên 256 bit. SQL chỉ giữ hash nonce/credential/proof; không giữ ID token, access token hoặc mật khẩu provider. Credential chỉ xác nhận một challenge; proof dùng một lần cho đúng purpose/account/session/version và trong hạn.
- Command nhạy cảm khóa account trước khi kiểm tra/tiêu thụ proof. Client có thể dùng mật khẩu nội bộ hiện tại hoặc proof; gửi proof thì server kiểm tra proof, không fallback âm thầm sang mật khẩu. Tiêu thụ cùng transaction với command, thao tác thất bại rollback không làm mất proof thành công giả.
- Đổi/thiết lập mật khẩu hoặc đổi phone thu hồi mọi phiên; xác nhận OTP email mới cũng thu hồi mọi phiên như trước. Chỉ yêu cầu gửi OTP không đổi email; proof đã tiêu thụ ở bước yêu cầu, OTP vẫn có thời hạn riêng 10 phút/giới hạn cũ. Phone vẫn chưa xác minh SMS.
- Có thể khôi phục khả năng quản lý tài khoản external bằng đăng nhập provider rồi thiết lập mật khẩu nội bộ. Không thêm endpoint quên mật khẩu cho tài khoản thuần mật khẩu đã đăng xuất; không cấp quyền cho tài khoản LOCKED/INACTIVE, không tự ghép tài khoản.

## Dữ liệu và tương thích

V21 thêm `local_password_enabled` và `account_reauthentications` với ID BIGINT IDENTITY. Giữ nguyên hash, thông tin liên kết và dữ liệu nghiệp vụ. Giữ nguyên khả năng đăng nhập bằng hash của Google cũ vì không thể suy ra hash đó là ngẫu nhiên hay đã được người dùng/quản trị viên thay thủ công. Người không biết mật khẩu nội bộ cũ có thể dùng Google xác thực lại thay cho mật khẩu rồi đặt mật khẩu mới. Google mới không tạo mật khẩu ngẫu nhiên. Sau thiết lập thành công cờ bật, BCrypt lưu mật khẩu mới. Không tự đổi mật khẩu trên Auth0/Google.

React giữ proof trong state, xóa khi đổi thao tác, có lỗi command, hết hạn hoặc gửi OTP thành công. Không dùng localStorage/sessionStorage. Popup Auth0 được mở trực tiếp từ click trước khi chờ HTTP; trình duyệt chặn popup thì có lỗi rõ ràng và retry. Hủy popup/sai tài khoản không bật nút lưu.

## Đối chiếu API

Đã đọc manifest Boot4.1.1/Security7.1.1, Auth0 React2.29.0/SPA SDK cài trong project, React19.3. Context7 có đúng Security7.1.1; Auth0 không có tag2.29.0 trong danh mục nên đối chiếu tài liệu SDK và types/source đang cài.

- [Auth0: max_age và kiểm tra auth_time](https://auth0.com/docs/authenticate/login/max-age-reauthentication).
- [Auth0 React: loginWithPopup/getIdTokenClaims](https://github.com/auth0/auth0-react).
- [Google GIS: nonce và cấu hình JavaScript](https://developers.google.com/identity/gsi/web/reference/js-reference).

OpenAPI: `../api/account.openapi.json`. Kết quả thực chạy và giới hạn provider thật: `../reports/f07-f08-f09-fixes-2026-10-28.md`.
