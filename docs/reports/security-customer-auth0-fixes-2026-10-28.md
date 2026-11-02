# Sửa Escrow, XSS hợp đồng và xác thực Customer — 28/10/2026

## Kết quả

| Đầu việc | Thực hiện |
|---|---|
| F01 — Escrow ngoài phạm vi Owner | SecurityFilterChain denyAll toàn bộ `/api/trustguard/escrow` và đường dẫn con, kể cả Owner/Admin. Không cho request gọi service/persistence. |
| F02 — XSS khi in/xuất | Escape mọi giá trị động ở HTML renderer dùng chung cho PDF, in và tải HTML, gồm cả title. Dữ liệu là văn bản, không chấp nhận HTML từ tên/ngày/mã/thông tin hợp đồng. |
| Customer đã xác thực VNeID vẫn bị đòi hồ sơ cũ | Bỏ điều kiện `getIdentity()/documentNumber` ở trang chi tiết căn hộ. Đọc trạng thái từng phương thức từ Backend: ACTIVE + email verified **hoặc** persisted VNeID VERIFIED. |
| Loading/lỗi nguồn xác thực | Đợi kết quả trước thao tác thuê; lỗi đọc hiển thị retry, không chuyển thành “thiếu CCCD” hoặc mở form giấy tờ. Trạng thái gắn đúng account/version, bỏ response đã hủy. |
| Customer xem căn cước | Settings đưa đến thông tin căn cước đã xác thực; trang danh tính giữ read-only VNeID và không tải/đòi nhập lại hồ sơ ảnh cũ. |
| Quay lại căn hộ | Whitelist returnTo hỗ trợ ID số; giữ đích trong Auth0 appState cho cả đăng nhập và self verification. Chỉ điều hướng sau khi token exchange/verification thành công, qua whitelist local. |
| Thông báo Backend | Lỗi thiếu điều kiện thuê nói email/VNeID, không còn hướng dẫn phone như một phương án thay thế cho rental policy. |

## Vì sao khóa API Escrow

Module legacy không có quan hệ sở hữu đủ tin cậy với account/property/contract và mã ngân hàng hiện là giả lập. Cho Owner/Admin truy cập theo role không đủ an toàn. Bản sửa **đóng bề mặt API này**, không tuyên bố đã xây một hệ thống ký quỹ hoặc giải ngân có ownership đầy đủ.

Không xóa bảng hoặc bản ghi Escrow, không sửa hợp đồng/tài khoản/fixtures, không gắn dữ liệu legacy vào một Owner bất kỳ. Chỉ mở lại khi có thiết kế quyền, DTO, trạng thái/idempotency và nghiệp vụ tài chính được xác nhận. ADR: `docs/decisions/legacy-escrow-quarantine-v1.md`.

## Quy tắc xác thực Customer sau sửa

- Backend tiếp tục là nơi quyết định quyền trong gửi/xem/hủy yêu cầu; frontend không gửi cờ verified hoặc dữ liệu CCCD để tự cấp quyền.
- Customer và Owner đang đi thuê dùng cùng rental policy; Owner không được thuê căn của chính mình.
- Có email đã xác thực **hoặc** evidence Auth0 VERIFIED thì không cần hồ sơ CCCD nhập tay. Không tự đánh dấu emailVerified do Auth0 VNeID.
- Chỉ có contact/identity summary, phone hoặc hồ sơ tự khai chưa đủ điều kiện thuê. Hình ảnh hồ sơ tự khai vẫn được lưu riêng như trước.
- Đã rà các màn hình Customer, history/contracts/invoices, routes, tenancy hook, settings/verification/identity: điều kiện bắt buộc hồ sơ thủ công nằm ở ApartmentDetailPage và đã bỏ; các gate phía Backend được giữ. Không gỡ điều kiện xác thực riêng của hồ sơ quyền cho thuê/Owner upgrade.

## Kiểm thử đã chạy

### Backend

- Lượt cuối **46 test đạt**: LegacyEscrowSecurityIntegrationTests4, VneidIntegrationTests14, DiscoveryRentalIntegrationTests28. Log `ancu-proptech-backend/target/customer-auth0-rental-tests-final.log`.
- Lượt Escrow ban đầu26đạt, gồm AuthIntegrationTests8 bổ sung hồi quy đăng nhập/session. Nếu tính các test riêng biệt của cả hai mốc:54, không cộng lặp Escrow/VNeID. Không chạy lại toàn bộ repository.
- Test mới kiểm tra OWNER/ADMIN/CUSTOMER không list/create/release Escrow, guest cũng bị chặn; service mock không được gọi.
- Test rental mới: Customer/Owner có Auth0 evidence, không verified email, không có manual identity, vẫn gửi→xem→hủy yêu cầu; không tự thay email flags. Cờ summary mà không có evidence bị từ chối; phone-only Owner vẫn không vượt gate.
- Chạy trên clone `ancu_identity_verify_20261027213854`, tắt seed/billing fixture/mail/scheduler; fixture và session nằm trong transaction rollback, Escrow không có giao dịch thật.
- Lượt đầu có fixture âm cố lưu evidence UNVERIFIED nhưng SQL có CHECK chỉ nhận VERIFIED. Đã sửa fixture thành không có evidence, giữ nguyên constraint và cơ chế bảo vệ.

### Frontend và browser

- **46 unit đạt**, TypeScript/lint và production build đạt. Hai unit mới kiểm tra tất cả trường HTML động không tạo markup thực thi và giữ đúng text tiếng Việt/ký tự HTML. Test redirect thêm ID số lớn và URL không được phép.
- **30 Playwright đạt**, lượt cuối1.2phút:8Customer verification,7Auth0/OAuth,8property/photos/prices,6Owner upgrade,1HTML/print/PDF security. Log frontend `security-customer-final-e2e.log`. Không cộng lần PDF chạy riêng trước đó.
- Customer desktop1440/mobile390 gửi, reload, hủy không gọi `/me/identity`; email-only và Owner-as-renter vẫn hoạt động; test summary giả, lỗi trạng thái/retry và Backend403 không tạo yêu cầu thành công.
- SDK Auth0 thật với provider/API giả lập: sau đăng nhập và self verification quay về `/apartments/3`, giữ tách token/exact-account guard; không yêu cầu form CCCD.
- Ca XSS kiểm tra DOM và iframe in không tạo img từ payload, không gọi URL payload, không thực thi biến probe; gọi hàm tải PDF thật và kiểm tra header `%PDF-`.
- Không có pageerror/unexpected console/network error trong các fixture kiểm soát; desktop/mobile không tràn ngang ở các ca có assertion, đã xem ảnh Customer mobile.
- Playwright MCP mở được login; hai console entries401guest refresh và favicon404 được phân loại riêng. Không dùng lần mở trang đó làm bằng chứng đăng nhập Auth0 thật.
- Lượt browser ban đầu chạy server test tắt watcher nên còn module cache cũ; khởi động lại đúng Vite test3002 rồi chạy lại thành công. Bộ `owner-identity-gate.spec.ts` lịch sử có6ca còn đòi modal tạo tài sản đã bị thay bởi full-page trước phiên này; không sửa app để quay lại modal. Hồi quy hiện hành dùng property-create-prices/owner-upgrade; không tuyên bố toàn bộ E2E repository đều pass.

## Áp dụng và giới hạn

1. Stop/Run lại Backend và Vite để nạp source mới. Không cần reset/migrate lại ID, đổi Auth0 secret hoặc tạo lại user/tài sản.
2. Các thao tác Escrow legacy nay bị từ chối có chủ đích. Những consumer cũ gọi trực tiếp API này phải dừng sử dụng.
3. F02 chỉ sửa việc HTML thực thi; vấn đề nội dung/chứng thư/thời điểm ký mẫu trong tài liệu (F03 của audit) chưa được thay bằng provider/snapshot renderer mới. Không coi bản này là triển khai ký số, thanh toán hoặc chứng thực pháp lý.
4. Không nghiệm thu đăng nhập/mật khẩu Auth0 thật, SMTP inbox hoặc provider ngân hàng trong phiên này; không gửi dữ liệu người dùng ra các provider đó.
5. Không thay đổi server người dùng hoặc dữ liệu chính. Vite test3002 đã được dừng trước bàn giao.

## Commit

| Hash | Nội dung |
|---|---|
| `c56330c` | Khóa API Escrow legacy và regression qua Security thật. |
| `0df9bd4` | Escape renderer hợp đồng, unit và browser HTML/in/PDF. |
| `8831c74` | Customer dùng email/VNeID, read-only căn cước, returnTo ID số và hồi quy. |

Chỉ commit local, không push. OpenAPI discovery/rental và ADR Auth0 đã cập nhật theo điều kiện thật.
