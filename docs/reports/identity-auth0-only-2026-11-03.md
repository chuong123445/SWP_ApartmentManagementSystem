# Bỏ form căn cước thủ công — 03/11/2026

Người dùng chọn bỏ phần nhập thông tin và tải ảnh căn cước thủ công, dùng luồng VNeID mô phỏng qua Auth0 đã có. Unit độc lập trên `feat/identity-auth0-only`, tách từ `origin/main` tại `c4891c7`; không phụ thuộc nhánh xác nhận tên VNeID hoặc các PR hóa đơn/hợp đồng đang mở.

## Hành vi sau thay đổi

- `IdentityPage` tại `/account/settings/identity` chỉ đọc trạng thái xác thực từ backend. Chưa xác thực thì dùng `VneidButton` với `intent="verify"`; đã VERIFIED thì hiển thị thông tin căn cước và thời điểm xác thực qua `VerifiedCitizenPanel`.
- Bỏ toàn bộ input, form, ảnh mặt trước/sau, nút lưu, validation và yêu cầu GET/PUT `/me/identity` khỏi trang này. Khi đang tải hoặc lỗi trạng thái, không mở thao tác xác thực; lỗi có nút tải lại. Giữ điều hướng quay lại và `returnTo` hiện có.
- Cài đặt tài khoản và lời nhắc Owner dẫn đến VNeID mô phỏng, không hướng dẫn nộp căn cước thủ công. Trang ghi rõ mô phỏng, chưa kết nối VNeID thực tế.
- Không sửa backend, API, cấu hình Auth0, schema, hồ sơ cũ, ảnh đã lưu, fixtures hoặc snapshot hợp đồng. Các API hồ sơ tự khai cũ vẫn được giữ để tương thích; bỏ giao diện không có nghĩa xóa dữ liệu hoặc thay đổi trạng thái xác minh. Email OTP, đăng nhập mật khẩu và hồ sơ quyền cho thuê giữ nguyên.

## Kiểm tra thực tế

- TypeScript `tsc --noEmit`: PASS.
- 90 frontend unit tests: PASS bằng Node native TypeScript transform, resolver alias dùng chung và `--test-isolation=none`. Lệnh npm mặc định bị `spawn EPERM` ở test worker/esbuild; không coi những lần đó là test logic thất bại.
- Vite production build: PASS, 2452 modules, 1.55s; cảnh báo bundle lớn hơn 500 kB vẫn có. Dùng `--configLoader native` và preload `__dirname` bên ngoài project vì giới hạn tiến trình; không sửa config/dependency. Lần thử native thiếu preload/URL file trên Windows đã sửa cách chạy, không sửa product.
- 7 callback từ `e2e/identity-auth0-only.spec.ts` chạy qua Playwright MCP: PASS. Chưa xác thực/đã xác thực ở 1440 và 390 px, reload, quay lại cài đặt/mở lại trang, tải đang chờ, lỗi 503/thử lại, cấu hình tắt và mở authorize Auth0 có connection/prompt/PKCE đúng. Không có form/upload; không có bất kỳ yêu cầu đọc/ghi hồ sơ/ảnh căn cước cũ; không tràn ngang. Page errors, unexpected network requests và console errors đều 0, ngoài 503 được cố ý tạo để kiểm tra retry.
- Playwright CLI không chạy được worker do `spawn EPERM`; kết quả MCP dùng harness assertions/poll trên đúng callback trong spec, không tuyên bố CLI E2E PASS. Lần MCP đầu locator tên trùng với tên account menu; scope vào main rồi chạy lại đủ 7 PASS.
- Đã mở và kiểm tra trực quan hai ảnh mobile 390 px, trạng thái chưa xác thực và VERIFIED; không thấy tràn/cắt nội dung. Ảnh chỉ chứa dữ liệu tổng hợp, lưu ngoài Git ở `tmp/identity-auth0-{unverified,verified}-mobile.png`.
- Spec tạo/nộp căn cước thủ công cũ được bỏ, giữ kiểm tra catalog riêng. Hai spec lịch sử Owner/sample được cập nhật assertion phù hợp với việc bỏ form; không chạy các luồng live cũ này hoặc backend test suite trong unit chỉ đổi frontend.
- Context7 `/reactjs/react.dev` đối chiếu conditional rendering với React 19; tài liệu learn không pin patch version. Không thêm API hoặc dependency mới.

Không chạy round trip với tenant Auth0 thật: authorize được chặn bởi route fixture trước khi ra provider, không gửi thông tin cá nhân hoặc thực hiện verify/link. Không dùng tài khoản thực, không ghi database. Sau kiểm tra gỡ mocks/listeners, đưa browser về about:blank và dừng riêng Vite 3009.

## Tiếp tục

Review PR của nhánh `feat/identity-auth0-only` rồi merge theo quy trình của nhóm; agent không merge hoặc push main. Frontend cần nhận commit này/reload để thấy giao diện mới. Mọi dữ liệu hồ sơ cũ và hợp đồng tiếp tục được giữ nguyên.
