# Tổng kết tích hợp SePay cho hóa đơn thuê nhà

Hoàn tất mã nguồn và kiểm thử ngày **29/10/2026** (bắt đầu 28/10/2026).

## Nhánh và phạm vi

- Toàn bộ thay đổi nằm trên `feature/sepay-payments`.
- Nhánh `chuong` giữ nguyên tại `fcb37caa7aa3ba62936b270f428db00e472fab2c`.
- Không push, merge hoặc sửa lịch sử nhánh cũ. Không thay đổi database ứng dụng đang dùng, Auth0 hay tài khoản ngân hàng thật.

## Những đầu việc đã làm

### 1. Kết nối nguồn tài khoản ngân hàng SePay

Chủ nhà liên kết ngân hàng trên SePay; ứng dụng dùng API Token của chính chủ nhà để đọc SePay API v2. Không nhập lại tên ngân hàng, tài khoản gốc và tên người nhận. Khi chỉ có một tài khoản ở trang đầu và không còn trang sau, tự chọn; nhiều tài khoản thì chọn tài khoản nhận tiền. Danh sách ngân hàng/VA có phân trang.

Khi lưu, Backend đọc lại chi tiết từ SePay để xác nhận tài khoản còn hoạt động và VA thuộc đúng tài khoản. Hỗ trợ tài khoản gốc của các ngân hàng thông thường và VA chính thức tĩnh; BIDV trong phiên bản này sử dụng VA. VietinBank thêm SEVQR theo quy tắc QR. API Token chỉ tồn tại trong request/bộ nhớ thiết lập, không lưu database/localStorage/cookie. Không yêu cầu mật khẩu ngân hàng.

### 2. Cấu hình riêng cho mỗi chủ nhà

Trang **Cài đặt tài khoản → Thanh toán và nhận tiền → Thiết lập thanh toán SePay**, route `/account/settings/payments`.

- Lưu tài khoản nhận tiền và trạng thái/version riêng từng Owner.
- Cấp khóa webhook ngẫu nhiên, chỉ lưu SHA256. Khóa rõ chỉ trả lúc tạo/đổi khóa, GET không trả lại.
- Hiển thị URL nhận webhook từ APP_PUBLIC_BASE_URL; không tự ghép từ Host header không tin cậy.
- Sao chép URL/khóa, xác nhận đổi khóa, tải lại cấu hình/lịch sử.
- Tạm dừng/bật lại bằng phiên nội bộ và version, không cần cung cấp lại API Token.
- Hiển thị đã nhận webhook gần nhất; không gọi việc lưu cấu hình là đã xác minh ngân hàng/kết nối thật.

### 3. QR và trạng thái hóa đơn

- Exact Owner hoặc người thuê của hóa đơn SENT được xem thanh toán; nháp và tài khoản khác không có quyền lấy QR.
- Mã thanh toán và tổng tiền lấy từ Backend. Không tin tiền/mã/paid flag do Frontend gửi.
- Mỗi hóa đơn có snapshot bất biến về mã, số tiền và tài khoản/VA nhận. Đổi cấu hình không đổi QR đã cấp hoặc thông tin ngân hàng trong hợp đồng cũ.
- Trạng thái thanh toán/paidAt tách riêng khỏi DRAFT/SENT để giữ chuỗi hóa đơn và chỉ số công tơ.
- Chi tiết hóa đơn có QR, tài khoản nhận, số tiền, nội dung và kiểm tra trạng thái tự động mỗi 10 giây khi trang đang mở; có nút kiểm tra thủ công.
- Danh sách hóa đơn Owner/Customer hiển thị trạng thái đã/chưa thanh toán. Hóa đơn đã thanh toán ẩn QR.
- Tổng có số lẻ VND bị chặn cấp QR để chờ quy tắc làm tròn được thống nhất; không tự làm tròn.
- Bỏ service VietQR cũ chứa tài khoản MBBank cố định không còn được sử dụng.

### 4. Webhook và đối soát

Endpoint `/api/v1/payments/sepay/webhooks/{ownerId}` nhận JSON, xác thực `Authorization: Apikey <key>`. Security chain riêng chỉ áp dụng cho webhook; các API người dùng vẫn giữ JWT/role/status/verification.

Chỉ ghi nhận thanh toán khi tiền vào, đúng ngân hàng và tài khoản/VA snapshot, đúng một mã hóa đơn, đúng toàn bộ số tiền và hóa đơn SENT. Transaction khóa connection rồi contract. UNIQUE `(owner_id, transaction_id)` chống retry đồng thời mà không làm thông báo của chủ nhà khác chặn giao dịch đúng. Mã thanh toán/invoice ID cũng có uniqueness riêng.

Sai số tiền, tài khoản, mã, tiền ra, kết nối tắt hoặc hóa đơn đã trả được ghi kết quả để đối soát; không tự cộng dồn/hoàn tiền hoặc tự xác nhận đã trả. Webhook thành công trả `200 {"success":true}` sau commit; khóa sai trả 401. Chỉ lưu metadata tối thiểu, không lưu raw payload/số dư/người chuyển.

### 5. Database, API và vận hành

- V23: thêm `sepay_connections`, `invoice_payments`, `sepay_events`, các khóa ngoại và index. PK nội bộ BIGINT IDENTITY; UUID SePay là external ID.
- V24: chống trùng giao dịch trong phạm vi từng chủ nhà.
- Hai script đã chạy hai lần thành công trên database clone kiểm thử, không reset dữ liệu.
- Project hiện dùng Hibernate update cho local; không thêm Flyway mới. Với schema quản lý thủ công, áp dụng V23 rồi V24 theo hướng dẫn môi trường.
- HTTP adapter có timeout, giới hạn response, không theo redirect mang credential, lỗi token/provider/rate limit rõ ràng. Đã sửa lỗi khởi tạo selector/loopback JDK HttpClient trên môi trường Windows bằng transport HttpURLConnection; đã kiểm tra khởi tạo HTTPS thật, không gửi request ngân hàng.
- Đồng bộ SePay OpenAPI, billing OpenAPI, ADR và hướng dẫn thiết lập. 14 file API JSON/306 JSON references được kiểm tra.

## Kết quả kiểm thử thực tế

| Kiểm tra | Kết quả |
|---|---|
| Backend: 11 SePay integration + 5 HTTP adapter + 9 billing regression | **25/25 PASS**, lần cuối khoảng 65 giây |
| SQL Server dùng để kiểm thử | Clone `ancu_identity_verify_20261027213854`; không dùng database ứng dụng thật |
| Chống webhook trùng đồng thời | Hai request cùng event đều 200, một event/receipt |
| Phân quyền, sai key, rotate/stale, sai/thiếu/thừa tiền, sai tài khoản, tiền ra | PASS |
| Hai Owner nhận cùng transaction ID | Không chặn/ghi nhận nhầm hóa đơn của nhau |
| Đổi ngân hàng, tắt kết nối, hóa đơn nháp/số lẻ VND | PASS |
| Frontend unit tests | **46/46 PASS** |
| TypeScript và production build | PASS; giữ các cảnh báo Vite configLoader/bundle đã có từ trước |
| Playwright SePay + tài sản + Customer | **28/28 PASS**, desktop 1440px/mobile 390px, lần cuối 1,7 phút |
| Console/network và responsive của fixture browser | Kiểm tra thành công; lỗi provider 503 được mô phỏng có chủ đích; không tràn ngang |
| Kiểm tra ảnh giao diện | Đã xem screenshot cấu hình mobile và hóa đơn desktop/mobile |

Playwright dùng Auth/API fixture và QR thử; không chuyển tiền thật. Playwright MCP cũng đã mở trang nhưng Backend người dùng chưa chạy/truy cập được (502), Google test client không hợp lệ ở trang login; không coi đó là kiểm chứng luồng đăng nhập/provider thật. Kiểm thử chức năng dùng Edge CLI riêng. Máy chủ Vite kiểm thử cổng 3002 đã không còn listener khi bàn giao.

Context7 đã đối chiếu Spring Security 7.1.1/React 19.3.0 trong các bước triển khai. SePay API v2, webhook, quy tắc QR và Cloudflare Tunnel được tra tài liệu chính thức; HTTP transport đối chiếu Java 21.

## Các commit mã nguồn

- `db2ea3d` — Backend SePay, đối soát hóa đơn, schema và tài liệu API/setup.
- `0e63a83` — chống trùng webhook theo từng chủ nhà, V24 và kiểm thử cách ly.
- `eb3dbbb` — sửa HTTP transport SePay trên Windows, kiểm tra khởi tạo/timeout/redirect/rate limit.
- `614fe33` — giao diện cấu hình/khóa/bật-tắt SePay, QR hóa đơn, hiển thị trạng thái và Playwright.

## Việc người vận hành cần làm để kiểm tra thật

1. Khởi động lại Spring Boot và Vite trên nhánh mới.
2. Cấu hình APP_PUBLIC_BASE_URL là HTTPS của Backend. Khi thử local có thể dùng Cloudflare Quick Tunnel; agent chưa cài/chạy tunnel hoặc công khai Backend.
3. Chủ nhà nhập API Token SePay tại trang thiết lập để lấy tài khoản/VA thật.
4. Tạo webhook trên SePay bằng URL/khóa ứng dụng cấp, Có tiền vào, đúng tài khoản/VA và API Key.
5. Gửi thử bằng mã giả để kiểm tra nhận webhook; sau đó đối chiếu một giao dịch thật đúng số tiền/nội dung hóa đơn.

**Chưa xác minh giao dịch SePay thật hoặc kết nối ngân hàng của người dùng.** Không có token SePay thật/public URL được agent cấu hình. Chưa có escrow/đặt cọc, hoàn tiền, thanh toán một phần/gộp, duyệt đối soát thủ công, OAuth SePay, VA động/TKP; không khẳng định mọi biến thể ngân hàng đã được kiểm tra thật.

Hướng dẫn chi tiết: [sepay-payments.md](../setup/sepay-payments.md). Thiết kế: [sepay-invoice-payments-v1.md](../decisions/sepay-invoice-payments-v1.md). API: [sepay.openapi.json](../api/sepay.openapi.json).
