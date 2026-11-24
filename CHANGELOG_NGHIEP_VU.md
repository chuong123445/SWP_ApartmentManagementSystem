# Nhật ký sửa nghiệp vụ

Đọc file này cùng WORK_PROGRESS.md khi tiếp tục. Sau mỗi phần sửa, thêm một dòng ngắn: ngày, mã, hành vi đã sửa, kiểm tra thực tế và commit. Không ghi hoàn thành cho phần chỉ đề xuất hoặc chưa kiểm tra. Giữ các dòng cũ; chi tiết kỹ thuật nằm trong báo cáo/ADR.

| Ngày | Mã | Nội dung đã sửa | Kiểm tra | Commit |
|---|---|---|---|---|
| 21/11/2026 | RA01 | Chặn ngày bắt đầu đã qua ở cả phát OTP và ký; OTP qua nửa đêm không ký được, giữ nguyên chữ ký cũ. | 56 backend đạt; 4 biên ngày chạy lại đạt; 4 Playwright Owner/Customer desktop/mobile đạt. | `5f5f0082` |
| 21/11/2026 | RA02 | Ký đủ trước ngày thuê: giữ phòng, hiển thị chờ hiệu lực, tự kiểm tra/chuyển đúng ngày; hỗ trợ hủy song phương khi đang chờ. | 73 backend đạt qua các lượt; 165 frontend/TypeScript/build và 4 Playwright desktop/mobile đạt. | `fdc5caa7` |
| 21/11/2026 | RA03 | Chặn điện nước khi hợp đồng chưa bắt đầu hoặc kỳ vượt tháng hiện tại, dùng chung cho chỉ số/tạo/gửi/AI; nháp cũ vẫn hủy được. | 77 backend đạt, 1 scheduler skipped; 4 Playwright desktop/mobile đạt; RENT D-7 giữ nguyên. | `b5d22553` |

## Cần cân nhắc

- RA04: **cần cân nhắc, chưa sửa** — chốt các khoản phải thu trước/sau khi trả phòng.

## Rà soát bổ sung 21/11/2026 — chưa sửa runtime

- RA10 (cao, đã tái hiện): duyệt gia hạn quyền khai thác tương lai thay ngay quyền hiện tại, làm tài sản bị chặn dù hạn cũ còn hiệu lực.
- RA11 (trung bình, đã tái hiện): hồ sơ wizard bị yêu cầu bổ sung gửi lại bằng giấy tờ mới chưa quét vẫn vào hàng chờ Admin. Chưa tự duyệt/công khai.
- RA12/RA13 (trung bình, cần thống nhất quy tắc): Owner hủy thuê tiếp có một chữ ký không cần bên kia đồng ý; thuê tiếp ký đủ đang chờ lại chưa có luồng hủy song phương.
- Đã chạy lại: 232 ca hồi quy đạt, 4 ca tái hiện xác nhận vấn đề, 1 ca skipped; 6 Playwright desktop/mobile đạt. Không sửa runtime hoặc dữ liệu ứng dụng.
- Kiểm tra và phạm vi chi tiết: [báo cáo rà soát gồm tạo tài sản](docs/reports/business-logic-recheck-2026-11-21.md). Bốn ca tái hiện xác nhận vấn đề còn tồn tại, không đánh dấu là đã sửa. Tiếp tục ưu tiên RA10/RA11, giữ RA04 cần cân nhắc.

## Rà sâu tạo/thêm căn hộ và bộ test Thu Hà — 21/11/2026

- Chưa sửa runtime: RA14 thêm căn đăng được giá thuê 0/thiếu đơn giá; RA15 publication chưa kiểm tra lại ảnh riêng; RA16 thêm căn ngoài wizard có thể làm wizard SINGLE_UNIT không hoàn tất. Cần thống nhất policy phát hành và quyền quản lý danh sách căn lúc đang soạn.
- 55 backend đạt (52 hồi quy + 3 tái hiện), 6 Playwright desktop/mobile cho ba hình thức đạt; giấy mẫu 6 PDF đã mở lại/render/xem. Chi tiết tại [báo cáo tạo/thêm căn hộ](docs/reports/apartment-creation-deep-review-2026-11-21.md).
- Đã tạo 3 bộ **file riêng tư để tự upload** cho Thu Hà: chính chủ, ủy quyền, thuê lại; hai bộ sau chủ gốc chuongaln. Theo lựa chọn file-only, đã gỡ ba nháp tạm và dữ liệu fixture vừa thêm có backup/guard; không để lại nháp hoặc tự duyệt/xác thực, không đưa giấy tờ cá nhân vào Git. Xem đầu ra trong báo cáo; không chạy lại helper Apply.

## Sửa cục bộ theo yêu cầu không push — 21/11/2026

- RA14/RA15 đã sửa: giá thuê mới phải dương; công khai qua manual/publication/nguồn cần đủ đơn giá điện nước và ảnh riêng (ảnh phòng legacy thật vẫn dùng được). Nháp còn bổ sung giá từng bước, 0 điện/nước khai báo rõ vẫn hợp lệ; ẩn tin và công tơ để sau giữ nguyên. 69 backend + 4 Playwright desktop/mobile đạt; OpenAPI cập nhật. Các fixture test nguồn bổ sung ảnh riêng đúng từng phòng, không nới policy để qua test. Commit local được ghi trong WORK_PROGRESS; không push/PR.
- Backlog chi tiết theo yêu cầu mới nằm ngoài Git: `../BUSINESS_ISSUES_LOCAL.md`. RA16 đang chờ bước tiếp theo; các quy tắc cần chốt và RA04 chưa tự sửa.
- RA16 đã sửa: chặn thêm căn độc lập khi wizard còn chưa hoàn tất; chỉ luồng complete nội bộ tạo các căn được chọn, client không có cờ bỏ qua. SINGLE_UNIT/MULTI_UNIT, hoàn tất và retry đã kiểm tra: 52 backend + 6 Playwright desktop/mobile đạt. Commit local, không push/PR. RA14/15 ở `9c6f1c92`; không tạo/sửa dữ liệu ứng dụng hoặc bộ hồ sơ test của người dùng.

## Ký không OTP để kiểm thử — 22/11/2026

- Local mặc định tắt OTP ký hợp đồng/bàn giao; vẽ chữ ký và đồng ý rồi ký trực tiếp. Bật lại bằng APP_SIGNING_OTP_ENABLED=true. Ngoài local/test luôn bắt buộc OTP; OTP tài khoản giữ nguyên. Backend kiểm tra đầy đủ quyền/ngày/hash/version và hai bên.
- Đạt 106 backend, 162 frontend, TypeScript/build, 16 Playwright desktop/mobile với API fixture; không gửi email thật hay sửa dữ liệu ứng dụng. Xem [quyết định và cấu hình](docs/decisions/test-signing-without-otp-v1.md). Code: `55a9bc65`; bản sửa dấu tiếng Việt tài liệu: tra git log.

## Hợp đồng mục 1–2 trong tài liệu Word — 22/11/2026

- Nháp chưa ký có ngày bắt đầu đã qua hiển thị nhắc cập nhật và nút tới phần ngày; sửa ngày giữ các thay đổi khác. Tạo/sửa nháp giới hạn hôm nay đến +90 ngày, tính theo Việt Nam; max giao diện vẫn tôn trọng quyền cho thuê. Không sửa lịch sử có chữ ký.
- 63 ca backend đạt qua hai lượt (62 lần đầu +1 chạy lại sau sửa kỳ vọng định dạng tiền). TypeScript/169frontend/4Playwright desktop-mobile API fixture đạt. Mục3 triển khai riêng theo lựa chọn tối thiểu30ngày.

## Hợp đồng mục 3 trong tài liệu Word — 22/11/2026

- Tối thiểu30ngày tính cả hai đầu; kiểm tra khi tạo/sửa/phátOTP/ký, kể cả ký local không OTP. Đúng30ngày hoặc đúng1thánglịch đủ30ngày được lưu gói trọn tháng, chỉ chu kỳ1tháng. Khi đủ chữ ký và đến ngày thuê, giao dịch kích hoạt thuê đầu/thuê tiếp tạo+gửi1hóa đơn RENT bằng monthlyRent, bao phủ đủ kỳ, hạn đóng ngày bắt đầu; retry không thu trùng. Điện nước riêng và mục4 giữ nguyên.
- V70 cờ mặc địnhfalse bảo toàn hợp đồng cũ; nội dung gói được đưa vào hash/PDF/giao diện. Nháp sửa rõ ràng mới áp dụng; không sửa lịch sử đã ký/hoá đơn SENT. Chi tiết [quy tắc ngày hợp đồng](docs/decisions/contract-date-policy-v2.md).
- 130backendPASS/2scheduler-date-skipped,170frontend/TypeScript/build và4Playwrightdesktop-mobile API fixturePASS; ảnh mobile đã xem. Kiểm tra khoản tiền, phạm vi kỳ, hạn đóng, một thông báo, đúng tenant, chờ hiệu lực/gia hạn/idempotence, chống bypass ngày và hồi quy hợp đồng cũ. Local-only, không push/main, không chỉnh DB ứng dụng/gửi email thật. Mục1–2: ce35d9eb; commit mục3 tra git log theo fix(billing): thu trọn tháng cho hợp đồng đủ 30 ngày.

## Xóa nháp và rút hồ sơ tài sản — 22/11/2026

- Thêm nút xóa nháp/rút chờduyệt ở quản lý tài sản và hồ sơ. Property/dossier WITHDRAWN, V71 timestamp; ẩn khỏi danh sách/inventory và giải phóng suấtnháp, giữ chứng cứ/lịch sử riêng tư. Khóa cùng Admin, chống foreign/stale/reviewcũ/retry; không xóa tài sản đãduyệt/đang sửdụng. Chặn thêm căn/hoàn tất lại hồ sơ đã rút.
- 39backendPASS (9Listing,18Dossier,7FinancialSummary,5OwnerApartment); TypeScript170frontend/8MCPdesktopmobilePASS vớiAPIfixture và cancel/409/reload/retry, ảnhmobileđãxem. Không appDB/provider/push. Xem docs/decisions/property-withdrawal-v1.md.

## Chủ nhà kết thúc khi người thuê mất liên lạc — 22/11/2026

- Theo user chọn: thông báo trong app và chờ đủ30ngày, không tự kết thúc. Tenant phản đối chặn đơn phương, Owner không thể xóa/gửi lại để bỏ qua. Sau hạn Owner xác nhận thu hồi phòng+đối chiếu khoản phải thu+ảnh chứng cứ rồi mới ENDED/VACANT; giữ nợ, ngày thỏa thuận và chữ ký cũ, không giả chữ ký tenant. V72 lưu notice/deadline/closure/audit; Clockserver, khóa/version/idempotence, không bỏ qua hồ sơ thuê tiếp/bàn giao/tranh chấp.
- Billing vẫn hoạt động trong thời gian chờ; chặn riêng thay đổi thuê tiếp/bàn giao cũ.97backend/174frontend/TypeScript/build/6PlaywrightdesktopmobilePASS (APIfixture;409khôngtựretry,reload+xácnhậnlại), ảnhmobileđãxem. Không appDB/provider/push. Chi tiết docs/decisions/unilateral-contract-exit-v1.md. Phần xóa/rút hồ sơ: c1dbe3e8; commit luồng đơn phương tra git log.

## Hủy hóa đơn đã gửi chưa nhận tiền — 23/11/2026

- Cho phép hủy DRAFT/SENT chưa có tiền nhận, chuyển CANCELLED và giữ lịch sử; chặn đã trả/nhận thiếu/thừa. Đồng bộ khóa với QR/webhook, QR mới bị chặn sau hủy; tiền đến muộn giữ event để Owner tự đối chiếu. Tenant thấy bản hủy đã từng gửi và thông báo, không tính thành nợ; bản nháp hủy vẫn riêng tư. Scheduler không tự gửi lại coverage đã hủy, vẫn có thể lập lại chủ động. Giữ gate chuỗi công tơ.
-75backendPASS/1scheduler-date-skipped qua các lượt (46Billing gồm1skip,25SePay,5Notification),174frontend/TypeScript và6MCPunpaid/paid/partial desktopmobilePASS; kiểm tra thêm2ca hồi quy sửa/hủy nháp trong WORK_PROGRESS. Ảnhmobileđãxem; không appDB/provider thật. Chi tiết docs/decisions/invoice-cancellation-v2.md.

- Bổ sung bảo vệ QR: tiền thiếu/thừa đang chờ đối chiếu không được tạo QR thu lại toàn bộ; refresh payment sau khóa. 4 ca SePay mục tiêu PASS, không gọi ngân hàng thật.

## Tiền ngày lẻ và hóa đơn đầu tự gửi — 23/11/2026

- Hợp đồng mới/nháp chưa ký được chủ động sửa thu theo tháng lịch: kỳ đầu gồm ngày lẻ + các tháng còn lại của chu kỳ; kỳ cuối chốt đúng ngày hết thuê. Giá tháng ÷ ngày thực tế × ngày thuê, cộng rồi làm tròn đến đồng HALF_UP. Kỳ đầu tự lập/gửi khi ACTIVE, hạn đóng ngày bắt đầu; tương lai chờ hiệu lực. Kỳ sau dùng ngày đến hạn đã chọn, gửi từ D-7 và bắt kịp kỳ bị bỏ lỡ. Giữ nguyên hợp đồng đã ký, gói cũ và chuỗi điện nước.
- V73 lưu cờ chính sách và công thức hóa đơn. Lập lại chủ động bù kỳ RENT đã hủy; scheduler không tự gửi lại. Công thức hiển thị trong preview/chi tiết và chính sách có trong PDF/nội dung ký. Xem docs/decisions/calendar-rent-billing-v1.md.
- 89backendPASS qua các lượt; 176frontend/TypeScript/buildPASS, 8Playwright desktop/mobile API fixturePASS; ảnh mobile đã xem. Không full-suite/live-provider/appDB claim. Cần restart backend áp dụng V73 và reload frontend; chưa push.

## Bổ sung migration khi khởi động — 24/11/2026

- Sửa thiếu đăng ký V70–V73 trong spring.sql.init.schema-locations. Database đang có hợp đồng thiếu hai cột boolean làm truy vấn hợp đồng thất bại và ảnh hưởng tải workspace. Chỉ có file migration chưa đủ; startup phải liệt kê chúng. Đã nâng schema local có sao lưu, chạy hai lần an toàn, giữ 2 hợp đồng test và chính sách cũ. Không thay dữ liệu tài sản đã dọn.
- Kiểm tra: 70 resource SQL resolve, SQLreadback đủ cột, rowcounts/dates/flags giữ nguyên; 6 backend integration PASS (5OwnerApartment +1ContractDraft) trên DB test riêng. Chưa xác minh lại trang Owner bằng session đăng nhập thật; đã yêu cầu backendexception log nếu tiếp tục500. Commit fix(db): chạy đầy đủ migration hợp đồng và tài sản khi khởi động; hash tra git log. Chưa push.

## Bỏ nguồn tài sản VNeID/Auth0 — 24/11/2026

- Cả tài khoản Auth0 và thường tạo chính chủ qua hồ sơ nhập thủ công/Admin; bỏ consent/chọn tài sản/bổ sung phòng từ nguồn và nhãn miễn duyệt. Auth0 chỉ còn đăng nhập/xác minh. API list/import/append và consentwrite cũ trả410, không gọi provider/cấpOwner/tựduyệt. Giữ tài sản và hợp đồng lịch sử; nguồn cũ bổ sung phòng bằng quy tắc thủ công chung.
- 43backendPASS (24luồngtài sản/upgrade/manual,18login/xácminh,1manuallegacy),170frontend/TypeScript/buildPASS,8PlaywrightMCP desktop/mobile x2nguồnx2rolesPASS; không gọi API nguồn, lỗi console hay tràn ngang, ảnhmobileđãxem. API fixtures/DBtest riêng, không Auth0live/appDB mutation. Cần restartbackend vàreloadfrontend; chưa push. ADR retire-vneid-property-source-v1; commit feat(property): bỏ nguồn tài sản VNeID và dùng hồ sơ thủ công, hash tra gitlog.

## Thu hồi Owner khi không còn tài sản được duyệt — 24/11/2026

- Rút hồ sơ xong hoặc retry: không còn APPROVED thì Owner vềCustomer trong cùngtransaction; còn tài sản được duyệt thì giữOwner. Menu đọc lại quyền ngay, Customer không vào /app/APIowner bằngtoken cũ. Không xóa tài khoản/identity/phiên hoặc mở quyền xóa tài sản đãduyệt.
- Thu Hà: role cũ còn sau lầncleanup trước, nhưng trong lúc audit đã có tài sản10031 Căn hộ Thu Hà đượcAPPROVED. Guard hạ quyền đãrollback, giữ tài sản/quyền mới; không tuyên bố đã hạThuHavềCustomer.
-30backendPASS/170frontend/TypeScript/build/4MCPdesktopmobilePASS; ảnhmobileđãxem. DBtest/API fixtures; live chỉread+guardrollback. ADR owner-role-after-withdrawal-v1. Cầnrestartbackend/reloadfrontend, chưapush. Commit fix(property): đồng bộ quyền Customer sau khi rút hồ sơ, hashgitlog.

## Lỗi cạnh ô nhập hợp đồng — 24/11/2026

- Tạo/sửa/thuê tiếp: lỗi ngày, số tiền, hạn đóng, thông tin thuê và từng điều khoản hiện dưới đúng ô với viền đỏ; tự quay đúng bước và cuộn/focus lỗi đầu tiên. Sửa ô này không xóa lỗi ô khác, giữ dữ liệu; lỗi ngày server về đúng trường. Lỗi mạng/xung đột giữ thông báo chung nhưng tự cuộn tới.
-174frontend/TypeScript/build +10MCPdesktopmobilePASS (6validation/recovery/server/network+4date-regression), ảnhmobileđãxem; APIfixtures, không backend/appDBchange. Chỉ luồng hợp đồng, không tuyên bố sửa tất cả form. ADR contract-inline-errors-v1; commit fix(ui): hiển thị lỗi hợp đồng cạnh trường nhập, hashgitlog. Chưapush.

## Chỉ báo lỗi sau Tiếp theo và rút gọn form hợp đồng — 24/11/2026

- Chỉ kiểm tra khi bấm Tiếp theo/rá soát/lưu; vào bước và nhập chưa hiện lỗi đỏ. Sửa ngày trống bị nhầm là quá khứ, bỏ hint đỏ trùng; mỗi ô một thông báo. Nhập chỉ xóa thông báo cũ liên quan, không tự validate. Xóa nguyên đoạn giải thích30ngày/thánglịch/ngàylẻ theo yêu cầu, giữ quy tắc nghiệp vụ.
-174frontend/TypeScript/build và10MCPdesktopmobilePASS; thêm kiểm tra entry/blurkhônglỗi,Nextmớibáo/khôngtrùng. APIfixtures, không backend/DBchange. Commit fix(ui): chỉ báo lỗi hợp đồng khi tiếp tục và rút gọn hướng dẫn; hashgitlog. Chưapush.

## Hợp đồng chuyển tab sau hai chữ ký — 24/11/2026

- Chưa ký/mới ký một bên ở Yêu cầu thuê và vẫn xem/ký được; chỉ đủ hai chữ ký mới vào tab Hợp đồng của Owner/Customer, kể cả chờ hiệu lực. Customer query lọc trước phân trang, giữ lịch sử/hủy; trang chi tiết dự thảo quay lại Yêu cầu thuê. Không đổi điều kiện ký/activation.
-74backend/175frontend/TypeScript/build/4MCPdesktopmobilePASS, ảnhmobileđãxem; SQLtest/API fixtures, không ký/đổi appDB. ADR contract-tabs-after-signing-v1. Cầnrestartbackend/reloadfrontend, chưapush. Commit fix(contract): chuyển tab hợp đồng sau khi hai bên ký đủ, hashgitlog.


## Tích hợp origin/main vào duy/contracts-after-signing — 24/11/2026

- Gộp nhánh origin/main (chu kỳ thuê linh hoạt 1-12 tháng, cảnh báo 48h hoàn tất chữ ký, tùy chọn gõ tên ký số) vào nhánh local; ưu tiên giữ trải nghiệm báo lỗi cạnh ô nhập, cuộn tới lỗi, bỏ hướng dẫn dài và điều hướng tab hợp đồng/yêu cầu thuê theo bản local.
- 179/179 frontend tests PASS; TypeScript & Vite build đạt 100%. Commit merge: `f24c7fa3`.


## Tương thích parse lịch sử hóa đơn cũ — 24/11/2026

- Thêm `@JsonIgnoreProperties(ignoreUnknown=true)`, giá trị mặc định cho record và cơ chế fallback an toàn khi deserialize chuỗi JSON của hóa đơn cũ trong bảng `invoice_events`; ngăn lỗi thiếu trường mới làm sập API lịch sử hóa đơn (HTTP 500). Giao diện hiển thị an toàn khi dữ liệu trước/sau thiếu.
- 46/46 ca BillingIntegrationTests đạt, 179/179 frontend tests đạt, Vite build đạt. Commit: `fix(billing): tương thích deserialize lịch sử hóa đơn cũ và tránh lỗi 500`.
