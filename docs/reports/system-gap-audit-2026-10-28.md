# Rà soát mức độ hoàn thiện hệ thống quản lý và cho thuê căn hộ

Ngày: **28/10/2026**. Baseline: nhánh `chuong`, commit `1641109`, working tree sạch trước phiên. Đây là **báo cáo review**, chưa sửa chức năng hoặc triển khai các giải pháp đề xuất.

**Cập nhật sau audit:** F01 đã đóng API Escrow legacy ở `c56330c`; F02 đã escape HTML xuất/in ở `0df9bd4`; F09 và gate CCCD Customer đã chỉnh ở `8831c74`. Chi tiết và giới hạn tại [bản tổng kết sửa lỗi](security-customer-auth0-fixes-2026-10-28.md). Phần dưới giữ nguyên kết quả review tại baseline; các phát hiện khác chưa được coi là đã sửa.

## 1. Kết luận

Hệ thống đã có nền tảng đăng nhập, xác thực, tài sản, yêu cầu thuê, hợp đồng nháp và lập/gửi hóa đơn. Tuy nhiên **chưa khép kín một vòng thuê mới → hợp đồng hiệu lực → bàn giao → thu tiền → kết thúc → cho thuê lại**. Một số màn hình quản lý vẫn là prototype, có thao tác chỉ đổi React state nhưng báo thành công.

Cần ưu tiên hai lỗi bảo mật đã tái hiện: **API Escrow thiếu kiểm tra chủ thể của bản ghi** và **HTML xuất hợp đồng cho phép thực thi nội dung trong tên người thuê**. Cần sửa cả độ chính xác tài liệu hợp đồng: hiện còn tự tạo dấu/chứng thư/thời điểm ký và thông tin bên cho thuê mẫu.

Không đánh đồng “chưa triển khai theo quyết định trước đây” với “code làm sai”: ký số, activation, release, thanh toán, tháng lẻ và vòng đời kết thúc đã được ghi gate trong kế hoạch. Các gate đó vẫn là việc quan trọng phải giải quyết để vận hành đủ nghiệp vụ.

## 2. Phạm vi và nguồn

- Đọc WORK_PROGRESS, CODING_PLAN, PROJECT_DESCRIPTION, API_DOCUMENT và các override mới nhất trong AGENTS; các ADR/OpenAPI về xác thực, tài sản, quyền cho thuê, hợp đồng và billing.
- Rà soát các controller/service/model liên quan auth, identity, property/apartment, rental, contract, billing và Escrow; routes/providers/hooks/màn hình Owner/Customer và các hàm xuất hợp đồng.
- Đối chiếu manifest: Java21/Boot4.1.1, Spring Security7.1.1, React19.3.0, Auth0 React2.29.0, Vite8.3.4. Context7: Security7.1.1, React19.3.0 và Boot4.1.0 gần bản4.1.1 đang dùng.
- Không sửa RDS, diagram, tài khoản/credentials/provider hoặc database chính. Các phép kiểm tra động dùng dữ liệu giả, API mock hoặc clone SQL kiểm thử.
- Không phải kiểm toán toàn bộ mọi dòng code, mọi dependency hoặc kiểm thử tải/production. Không kết luận mọi module không được nhắc đến đều an toàn.

Mức ưu tiên: **P0** chặn phát hành vì bảo mật; **P1** cần để hoàn thành MVP hoặc tránh thông tin/dữ liệu sai; **P2** cần hoàn thiện sau các blocker. Mỗi phát hiện ghi riêng mức bằng chứng.

## 3. Những phần đã có và nên giữ

| Nhóm | Thực trạng đã thấy trong source |
|---|---|
| Session/auth nội bộ | JWT trong bộ nhớ frontend, refresh cookie HttpOnly, rotation/revocation và CSRF cho auth; quyền tài khoản được đọc lại trên Backend. |
| Xác thực | Email OTP và evidence VNeID mô phỏng được phân biệt; không tin cờ verified/role từ frontend; tự khai CCCD không tự trở thành VERIFIED. |
| Đăng ký/quyền Owner | Tài khoản mới CUSTOMER; nâng cấp chính chủ sau consent/đọc nguồn hợp lệ, hoặc duyệt hồ sơ quyền cho thuê; Owner vẫn có chức năng thuê. |
| Tài sản | Tạo theo quan hệ, import nguồn, hồ sơ Admin riêng cho luồng thủ công; ảnh1–4, API ảnh nháp có kiểm tra quyền; giá chỉ sửa khi VACANT và không còn PENDING. |
| Quyền cho thuê có hạn | Ngày hiệu lực/hết hạn, giới hạn hợp đồng trong khoảng quyền, hồ sơ gia hạn và thông báo/outbox. |
| Yêu cầu thuê | Gửi/list/hủy PENDING; Owner accept/reject; khóa và đổi ACCEPTED/CONTRACT_IN_PROGRESS nguyên tử. |
| Hợp đồng nháp | Snapshot riêng tư do server lấy, content version, sửa điều khoản và rà soát hai bên; chưa tự kích hoạt. |
| Hóa đơn | Server tính BigDecimal từ giá hợp đồng/chỉ số đầu-cuối, baseline/chuỗi kỳ/version; DRAFT riêng tư, SENT cho đúng người thuê. |
| ID | Model gốc dùng Long/IDENTITY, API ID dạng chuỗi số; đã có tool chuyển dữ liệu bảo toàn và backup guard. Không cần viết lại toàn bộ model lần nữa. |

Các kết quả test trong các báo cáo cũ là lịch sử kiểm chứng theo từng phạm vi, không được cộng dồn hoặc gọi là kết quả toàn hệ thống của phiên audit này.

## 4. Lỗi và điểm sai cần chỉnh

### F01 — P0: Owner có thể đọc/đổi trạng thái Escrow ngoài phạm vi của mình

**Bằng chứng động:** hai probe MockMvc đi qua SecurityFilterChain thật đều trả200: Owner A đọc danh sách chứa bản ghi của B; Owner A gọi release với ID bản ghi đó được trả trạng thái RELEASED_TO_LANDLORD. EscrowRepository được mock, không giải ngân hoặc sửa ký quỹ thật.

Nguồn: `SecurityConfig.java:105` chỉ yêu cầu OWNER/ADMIN cho `/api/trustguard/**`; `EscrowController.java:19–30` không truyền actor; `EscrowService.java:20–39` dùng findAll/findById/save; model chỉ có contractId/roomId dạng String, không có quan hệ ownership đáng tin cậy.

Ngoài ra create nhận trực tiếp entity, nên caller gửi được các trường persistence như id thay vì DTO whitelist. Mã bankHoldReference được tự sinh, không phải kết quả một Bank API. Đây là lỗi phân quyền/trạng thái dữ liệu; chưa có bằng chứng luồng này có thể chuyển tiền ngân hàng thật.

**Sửa:** trước mắt vô hiệu hóa API legacy chưa sẵn sàng; khi triển khai lại phải suy ra actor, dùng quan hệ hợp đồng/tài sản để lọc, DTO command chỉ chứa input cho phép, kiểm tra trạng thái/version và idempotency. Chỉ cập nhật trạng thái tài chính theo nghiệp vụ/provider đã xác nhận. Test bắt buộc: owner A không list/read/release/create gắn vào tài sản B, không mass-assign id/status/reference.

### F02 — P0: XSS ở luồng xuất/in hợp đồng

**Bằng chứng động:** tên giả chứa thẻ ảnh có event handler được giữ nguyên trong output `generateContractBody`; đưa output vào cùng kiểu DOM sink innerHTML mà hàm PDF dùng làm chạy biến kiểm chứng trong browser cô lập. Không thực hiện trên hợp đồng/tài khoản thật.

Chuỗi dữ liệu: fullName do người dùng cập nhật → `TenancyService` customerName → `billingService.ts:42–44` tenantName → `ContractsPage.tsx:240/432` xuất PDF → `contractPdf.ts:221/253` nội suy raw string → `contractPdf.ts:341` innerHTML. Nhánh in còn dùng doc.write tại dòng306. DTO tên chỉ giới hạn blank/length, không ngăn HTML; React escape ở màn hình thường không bảo vệ đoạn tự tạo HTML này.

**Sửa:** dùng một renderer hợp đồng với dữ liệu text được escape; tránh raw HTML hoặc sanitize bằng allowlist nếu có yêu cầu rich text thực sự. Cần kiểm tra cả HTML tải xuống, in và PDF, không chỉ React preview. Test payload tên/địa chỉ/điều khoản không tạo node/event chạy được. Không coi “ẩn nút PDF” hoặc chỉ lọc ký tự ở form là giải pháp đầy đủ.

### F03 — P1: Bản xuất hợp đồng tự tạo thông tin chứng thực và sai dữ liệu

**Bằng chứng đọc source + helper:** `contractPdf.ts:186–267` tự gán mã audit, thời điểm ký cố định khi thiếu dữ liệu, tên bên A/địa chỉ/ngân hàng mẫu, chứng thư VNPT-CA, eKYC/OTP và chuỗi trông giống SHA-256. Không có bản ghi chứng thư/chữ ký/provider/hash tài liệu tương ứng trong luồng hiện tại. `ContractsPage` còn có preview với cùng nội dung mẫu.

`billingService.ts:41/44` mặc định deposit=0 khi biến Tenancy thành Contract; dữ liệu rút gọn không có đủ điều khoản/hồ sơ để làm tài liệu hợp đồng hoàn chỉnh. Vì vậy còn có nguy cơ xuất sai cọc/bên cho thuê/điều khoản dù chưa xét ký số.

**Sửa:** dùng snapshot và terms server làm nguồn duy nhất cho preview/in/PDF; trường không có phải hiện thiếu dữ liệu, bản nháp có watermark. Chỉ hiện trạng thái đã ký khi Backend có evidence hợp lệ. Bỏ mọi hash/chứng thư/thời điểm ký mặc định. Không tự sửa snapshot cũ để khớp nguồn hiện tại. `tests/contract.test.ts:30–58` đang khẳng định những dấu/chứng thư mẫu phải có; cần đổi tiêu chí test, không giữ chỉ vì test đang xanh.

### F04 — P1: Cài đặt, chỉ số, sửa chữa và sổ quỹ có thao tác không lưu server

**Bằng chứng browser:** trang Owner settings đổi giá điện3800→9999, hiển thị thành công, reload trở lại3800; không có request ghi nghiệp vụ. API được mock hoàn toàn để kiểm tra hành vi frontend, không đổi giá thật. Desktop1440/mobile390 không tràn ngang trong ca này.

Nguồn: `SettingsPage.tsx:25–39`; `useRentalWorkspace.ts:28–31,104,204,217,229`. Config, tickets, transactions khởi tạo từ mockData; cập nhật chỉ setState. Utilities cũng chỉ thay chỉ số trên rooms trong state. Các giá này không phải đơn giá hợp đồng/baseline thật của billing.

**Sửa:** hoặc tạm ẩn/ghi rõ demo và không báo lưu thật, hoặc xây model/API quyền theo Owner/Property + validation/version rồi mới thông báo thành công sau commit. Đơn giá mặc định cho căn mới, giá niêm yết căn và giá đã chốt trong hợp đồng phải có trách nhiệm riêng; không để settings sửa ngầm hợp đồng. Giá0 đang bị `Number(value) || default` thay bằng mặc định, cũng cần sửa nếu nghiệp vụ cho phép0.

### F05 — P1: Báo cáo/doanh thu/xuất Excel hiển thị kết quả mẫu

**Bằng chứng source:** `ReportsPage.tsx:24,34,57,69,83` dùng monthlyRevenueData, buildingOccupancy và các số tổng hardcode; nút Excel chỉ alert “đã xuất”, không sinh file. Dashboard còn dùng biểu đồ mẫu; sổ quỹ được gọi là dòng tiền thực tế dù là state cục bộ.

**Sửa:** thống nhất basis: tiền hóa đơn phải thu, tiền đã ghi nhận thanh toán và lợi nhuận là các chỉ tiêu khác nhau. API aggregate lọc đúng Owner/Property/thời gian, xuất file thực sự hoặc vô hiệu hóa nút. Chưa có payment/expense ledger thì chưa thể gọi các số này là doanh thu thực thu/lợi nhuận đã xác nhận.

### F06 — P1: Hóa đơn DRAFT nhập sai chưa có đường sửa/hủy

**Bằng chứng source/API:** InvoiceController hiện có create/send/read, không có update/void draft. `InvoiceService.java:76` chặn lập kỳ sau nếu còn DRAFT; endpoint billing-context cũng gọi source này. Khi nhập nhầm chỉ số hoặc hạn đóng, người dùng thiếu cách hợp lệ để sửa trước khi gửi và chuỗi billing có thể bị kẹt.

**Sửa:** bổ sung sửa DRAFT với version và tính lại toàn bộ trên Backend; chốt cơ chế hủy/void nháp có lưu lịch sử và khóa chuỗi. Hóa đơn SENT cần quy trình điều chỉnh riêng, không sửa/xóa âm thầm. Phải test nháp sai→sửa/void→tạo/gửi đúng, đồng thời không làm lệch chỉ số kỳ kế tiếp.

### F07 — P1: Hồ sơ nguồn Auth0 chưa đi trọn vào snapshot hợp đồng

**Bằng chứng source:** `VneidPropertyImportService.java:77–87` duyệt nguồn tự động và lưu PropertyExternalImport.sourceSnapshot; không tạo hồ sơ Admin giả. Nhưng `ContractDraftService.java:124–134` chỉ tìm PropertyDossier APPROVED để điền certificate/right/receiving account. Tài sản nguồn mới không có dossier đó sẽ thiếu thông tin pháp lý trong draft dù nguồn đã có certificate. Bank cũng chưa có đường riêng đầy đủ cho nhánh nguồn.

**Sửa:** snapshot resolver đọc đúng evidence theo verificationSource: nguồn Auth0 hoặc hồ sơ thủ công đã duyệt, có source/hash/thời điểm. Bổ sung nơi khai báo và kiểm tra tài khoản nhận tiền cho nhánh nguồn; không hardcode bank hoặc tạo quyết định Admin giả. Chỉ draft mới dùng resolver mới; không backfill nội dung hợp đồng đã lưu.

### F08 — P1: Tài khoản external thiếu đường re-auth/thiết lập mật khẩu và phục hồi

**Bằng chứng source:** AccountService.reauth dòng42 yêu cầu mật khẩu nội bộ cho đổi password/phone; EmailChangeService dòng22 cũng gọi reauth. Tài khoản Auth0 có passwordHash=null bị chặn; GoogleLoginService dòng65 gán mật khẩu ngẫu nhiên mà người dùng không biết nên cũng không thể cung cấp “mật khẩu hiện tại”. Chưa thấy endpoint quên mật khẩu/thiết lập mật khẩu nội bộ hoặc re-auth qua provider cho các lệnh này.

**Sửa:** thiết kế account capabilities theo phương thức đăng nhập; recent provider re-auth và/hoặc recovery challenge để đặt mật khẩu/change contact an toàn, revoke session theo cơ chế hiện có. Không tự ghép tài khoản chỉ vì trùng email. UI cần chỉ ra chức năng nào dùng được thay vì đưa form mật khẩu không thể thỏa mãn. Đây là giới hạn đã được ghi trước đây, nhưng đang ảnh hưởng trực tiếp khả năng dùng tài khoản mới.

### F09 — P2: Redirect sau đăng nhập vẫn yêu cầu UUID

**Bằng chứng chạy helper:** `/apartments/123`, `/my/invoices/456`, `/my/contracts/789` đều được loginDestination trả về `/`. `utils/navigation.ts:7` chỉ chấp nhận ID có36ký tự hex/hyphen, trong khi ID hiện tại là chuỗi số. AppRoutes dòng33 lưu returnTo và LoginPage dòng26/72 dùng hàm này.

**Sửa:** whitelist route ID số theo đúng API, vẫn chặn URL ngoài/đường dẫn không được phép; test đăng nhập từ link căn/hóa đơn/hợp đồng và giữ nguyên đích sau login/reload. Kiểm tra thêm các route onboarding mới chưa nằm trong danh sách returnTo nếu muốn quay lại sau login.

### F10 — P2: Liên kết Google chưa có unique constraint/migration rõ ràng

**Bằng chứng schema/source:** AuthAccount.java dòng22–23 thêm googleSubject nhưng không unique; chưa có migration Google tương ứng trong V1–V19. Service findByGoogleSubject trả Optional và create saveAndFlush, chưa có xử lý cuộc đua định danh chuyên biệt. `GOOGLE_LOGIN.md` hiện dựa vào ddl-auto=update.

**Sửa:** migration rõ ràng; SQL Server dùng unique filtered index cho google_subject IS NOT NULL để nhiều tài khoản không dùng Google vẫn hợp lệ. Kiểm tra dữ liệu trùng trước khi thêm index, chủ thể chính xác/case phù hợp và map lỗi cạnh tranh sang response có nghĩa. Bổ sung integration test JWT Google có chữ ký/claims thực sự được kiểm tra; unit test hiện mock decoder không chứng minh toàn bộ verifier/HTTP flow. Chưa tái hiện một vụ tạo trùng subject trong phiên này; đây là lỗ hổng ràng buộc và coverage.

### F11 — P2: Ảnh staging chưa có cơ chế thu hồi dung lượng

**Bằng chứng source:** PropertyImageService dòng32 giới hạn100ảnh chưa gắn/tài khoản, không có command xóa staging hoặc job TTL. Người dùng bỏ form/tạo thất bại nhiều lần có thể hết quota mà không tự khôi phục được. Gallery tài sản hiện có cũng chưa có workflow thay/xóa ảnh.

**Sửa:** DELETE staging đúng uploader hoặc cleanup TTL có kiểm tra chưa bind; thêm UI thay ảnh có version và duy trì tối thiểu1/tối đa4. Không dọn nhầm ảnh trong giao dịch đang tạo, ảnh đã gắn hoặc chứng từ pháp lý.

### F12 — P2: Chống thử mật khẩu và lạm dụng endpoint chưa đồng đều

**Bằng chứng source:** tìm thấy rate window ở VneidService và giới hạn OTP; AuthService.login/RegistrationService/GoogleLoginService chưa thấy cơ chế throttle tương ứng trong repository. BCrypt có chi phí cao; public login có thể bị thử nhiều lần/chiếm CPU.

**Sửa:** chính sách rate limit theo endpoint/IP/account với response chung, cooldown và metrics; triển khai ở app/gateway phù hợp. Không giả định một reverse proxy ngoài repo đã có bảo vệ. Phiên này không thử brute-force hoặc load test.

## 5. Những chức năng quan trọng còn thiếu để khép kín nghiệp vụ

| ID / ưu tiên | Hiện có / thiếu | Việc cần làm và quyết định cần chốt |
|---|---|---|
| G01 / P1 — Hoàn tất hợp đồng | Model có DRAFT/ACTIVE/ENDED; service chính tạo/cập nhật DRAFT, chưa có ký→activation runtime. | Chốt phương thức ký phù hợp SWP; đóng băng đúng phiên bản, evidence/replay/idempotency, đủ điều kiện mới ACTIVE + OCCUPIED trong transaction. Không dùng OTP/email làm chữ ký số khi chưa có quyết định đổi phạm vi. |
| G02 / P1 — Hủy/giải phóng bước làm hợp đồng | Cancel chỉ PENDING; ACCEPTED chuyển căn CONTRACT_IN_PROGRESS, chưa có release/timeout chung. | Chốt ai được hủy, thời hạn giữ, tình huống đã tạo draft/đã ký, thông báo và xử lý các request PENDING còn lại. Không tự đặt FIFO/auto-reject/timeout thay người dùng. |
| G03 / P1 — Bàn giao đầu kỳ/mốc công tơ | Billing yêu cầu baseline đúng ngày start; draft create chưa tạo baseline và chưa có bàn giao xác nhận đầu kỳ. | Lưu chỉ số/ngày/biên bản đúng bên, thiết lập baseline khi hợp đồng hiệu lực/bàn giao; không lấy số từ màn hình Utilities state làm dữ liệu thật. |
| G04 / P1 — Thanh toán/đối soát/công nợ | Invoice DRAFT/SENT, chưa có ledger thanh toán/biên nhận/đối soát. VietQRService hardcode hiện không có caller trong InvoiceService, không nên coi là payment đã chạy. | Chốt MVP ghi nhận thủ công có bằng chứng và người duyệt hay provider; số tiền đã trả/còn thiếu, chống trùng, audit. Mã QR không chứng minh đã thu tiền. |
| G05 / P1 — Gia hạn/chấm dứt/bàn giao cuối | Chưa thấy command cho hợp đồng được gia hạn/kết thúc/bàn giao trả căn. Gia hạn quyền cho thuê Property đã có nhưng khác gia hạn hợp đồng Tenant. | Chốt điều kiện/notice/tiền cọc/hóa đơn cuối/meter/biên bản; ENDED/VACANT chỉ khi đúng điều kiện, giữ lịch sử và chống hợp đồng chồng lấn. |
| G06 / P1 — Sửa chữa thật | UI/ticket mock và local setState, thiếu API/domain bền vững. | Tenant thuộc đúng contract gửi ticket/ảnh; Owner đúng căn xử lý, trạng thái/chi phí/xác nhận, lịch sử; không chia sẻ danh sách demo cho mọi Owner. |
| G07 / P2 — Admin vận hành | Queue hồ sơ tài sản đã có; chưa thấy quản lý account lock/unlock, moderation tổng thể và dashboard Admin đầy đủ. | Quyền Admin riêng, audit lý do và quyền truy cập, khóa tác động session hiện tại; không dùng trang Owner như chức năng Admin toàn cục. |
| G08 / P2 — Lịch xem căn hộ | Chưa thấy controller/service lịch hẹn dù kế hoạch T14 có. | Chốt slot/đổi/hủy/xung đột và quyền hai bên. Lịch xem không tự giữ căn hộ. Có thể đưa sau MVP nếu người dùng thu hẹp phạm vi. |
| G09 / P1 — Billing tháng lẻ/correction | Source từ chối startDate không phải ngày1, kỳ cuối không đủ tháng; chưa có sửa/reset meter hoặc correction sau SENT. | Chốt tính tháng lẻ, thay công tơ, phí/cọc, rounding và correction chain. Bản nháp cho chọn ngày bất kỳ nhưng billing chưa hỗ trợ tương ứng; UI cần thông báo giới hạn trước. |
| G10 / P2 — Thông báo nghiệp vụ | Có bảng thông báo hóa đơn và notices quyền cho thuê, polling request; chưa có trung tâm thông báo đầy đủ cho toàn vòng đời. | Các sự kiện request/contract/maintenance/payment, read/unread/điểm đến và retry delivery; không bắt buộc thêm SMS nếu email/in-app đáp ứng phạm vi. |
| G11 / P2 — Chỉnh sửa tài sản/căn và ảnh | Có tạo/list/import, sửa3giá và publication; thiếu cập nhật metadata/gallery/archive đầy đủ. | Chốt quyền sửa sau duyệt và trường thay đổi phải duyệt lại; archive có kiểm tra ràng buộc thay vì xóa lịch sử hợp đồng. |
| G12 / P2 — Báo cáo/đánh giá/export | Báo cáo chủ yếu mẫu; chưa có review workflow/eligibility hoặc export file thật. | Hoàn thiện payment/expense basis trước báo cáo thực thu; chốt quyền đánh giá theo tenancy, moderation và số liệu scoped. |

G01/G02/G04/G05/G09 là các gate nghiệp vụ thật của kế hoạch T16/T17/T27/T28 và billing ADR, không phải lý do để bỏ qua F01–F03. Tài khoản Tenant tiếp tục suy ra từ contract, không cần thêm role TENANT mới.

## 6. Database, cấu hình và khả năng triển khai

1. **Không cần chuyển lại tất cả ID.** Giữ IDENTITY/API chuỗi số; sửa consumer còn giả định UUID như F09 và các fixture lịch sử. Mỗi database riêng còn UUID phải đi qua backup/clone/verify/apply của tool đã có, không tự drop/tạo lại.
2. **Chưa nên triển khai cấu hình local ra Internet.** application.properties chọn local mặc định, có fallback account phát triển, SQL init always/ddl-auto update; local config tắt Secure cookie, có OTP secret mẫu và Auth0 tenant chung. Đây là cấu hình dev có chủ đích, nhưng cần profile triển khai rõ ràng, secrets riêng, DB user giới hạn quyền, HTTPS/cookie/CORS đúng origin. Không nêu lại giá trị bí mật trong báo cáo này.
3. **Migration có version quản lý và kiểm tra:** không chỉ dựa Hibernate update cho google_subject; chọn cơ chế migration duy nhất có ledger và backup/restore drill. SQL init hiện có guards nhưng chưa thay một quy trình upgrade/recovery triển khai đã kiểm chứng.
4. **Vận hành:** cần CI/build/test cách ly DB, health/log/metrics có che dữ liệu nhạy cảm, lịch backup và restore thử, retention/quota cho ảnh/giấy tờ/session/OTP/outbox. Không suy ra repo đã có toàn bộ chỉ vì ứng dụng local chạy được.
5. **Auth0/email test data:** cấu hình SPA công khai khác M2M secret Backend; callback phải khớp origin/cổng. File public users.json không chứa credentials; bulk hash/Create password là hai schema khác nhau. Vấn đề mật khẩu hiện tại chưa được xác nhận nguyên nhân hoàn toàn vì chưa biết chính xác công cụ nhập hàng loạt đã dùng; không giải quyết bằng reset DB hoặc đổi cơ chế JWT nội bộ.
6. **Tài liệu/coverage:** root plan và setup có đoạn lịch sử Owner registration/UUID/disabled Auth0, đã có override nhưng khó tra. OpenAPI hiện chưa mô tả đầy đủ Google endpoint. Một số test/helper vẫn gắn UUID hoặc xác nhận chứng thư mẫu. Cần một bảng trạng thái implemented/planned hiện hành, API và hướng dẫn test được đồng bộ; giữ lịch sử riêng.

## 7. Thứ tự đề xuất

| Đợt | Công việc | Kết quả cần chứng minh |
|---|---|---|
| 1 — Sửa rủi ro hiện hữu | F01/F02/F03: chặn legacy Escrow chưa đủ quyền; escape/sanitize HTML; bỏ chứng thực và dữ liệu tài liệu tự tạo. | Cross-owner bị chặn; payload không chạy trong in/HTML/PDF; tài liệu không tự nhận đã ký, dữ liệu khớp snapshot. |
| 2 — Trung thực dữ liệu | F04/F05/F06/F07/F08/F09 và migration Google. Ẩn prototype chưa kết nối, sửa ID redirect, hoàn thiện nháp và nguồn snapshot/account capabilities. | Lưu xong reload vẫn đúng; không dùng report/demo như số thật; nháp sai sửa được; external account có đường thao tác hợp lệ. |
| 3 — Khép vòng thuê | G01/G02/G03/G04/G05, chốt G09 trước billing thực tế. | User mới thuê được một căn qua toàn vòng đời, thanh toán/công nợ/hoàn cọc có audit và căn cho thuê lại đúng lúc. |
| 4 — Quản lý vận hành | Sửa chữa, Admin, metadata/gallery, notification, lịch xem nếu giữ phạm vi, báo cáo/export, CI/deployment/backup. | Không còn “thành công” chỉ trong state; kiểm tra phân quyền, hồi quy và phục hồi dữ liệu trên môi trường triển khai. |

Các quyết định cần chốt trước đợt3: phương thức ký/hiệu lực; hủy hoặc timeout ACCEPTED; xử lý request khác; cách xác nhận tiền/cọc; tháng lẻ/meter correction; kết thúc/gia hạn/bàn giao. Chưa đặt quy tắc thay người dùng trong phiên review này.

## 8. Bằng chứng kiểm tra của phiên này

- Hai probe Backend thành công **tái hiện lỗi**, không có nghĩa bảo mật đã đạt: log `ancu-proptech-backend/target/system-gap-audit-escrow-probes.log`; source tái hiện giữ trong ignored target/SystemGapAuditProbeTests.java. Dùng SecurityFilterChain thật, SQL clone `ancu_identity_verify_20261027213854`, account/session rollback, EscrowRepository mock; source/class test tạm đã được loại khỏi test suite sau chạy.
- Probe helper/Playwright cô lập: `target/system-gap-audit-probe.cjs`, kết quả `target/system-gap-audit-probe-results.json`: ba redirect ID số về `/`, raw HTML thực thi được, tài liệu có dấu ký/hash tự tạo. Không có API/provider/database call trong probe này.
- Probe UI: `target/system-gap-audit-ui.cjs`, `target/system-audit/ui-results.json`: entered9999/reload3800/nonAuthWrites=[], không pageerror/requestfailed/unexpected API/console error; desktop/mobile không tràn ngang. Đã xem `target/system-audit/settings-mobile.png`.
- Playwright MCP truy cập được trang login; CLI dùng Edge chạy probe với fake API, không dùng session người dùng. Không dừng/khởi động lại server người dùng, không gửi email, không gọi ngân hàng/provider ký số hoặc thay mật khẩu Auth0.
- Không rerun toàn bộ Backend/frontend/E2E: không sửa source nghiệp vụ; báo cáo không nhận kết quả test cũ làm lần chạy mới. Không có kiểm thử production load/concurrency hay đánh giá pháp lý của chữ ký ở đây.
- Kiểm tra tài liệu:11file OpenAPI JSON parse được,231internal refs resolve; đủ12phát hiện/12nhóm gap trong báo cáo, không còn source/class probe tạm trong test suite, diff check đạt.
- Chỉ commit báo cáo sau diff/link checks. Các P0/P1 nêu trên **chưa được sửa trong phiên audit**.
