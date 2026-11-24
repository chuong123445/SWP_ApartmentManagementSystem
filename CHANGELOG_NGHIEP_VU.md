# Nhật ký sửa nghiệp vụ

Đọc file này cùng WORK_PROGRESS.md khi tiếp tục. Sau mỗi phần sửa, thêm một dòng ngắn: ngày, mã, hành vi đã sửa, kiểm tra thực tế và commit. Không ghi hoàn thành cho phần chỉ đề xuất hoặc chưa kiểm tra. Giữ các dòng cũ; chi tiết kỹ thuật nằm trong báo cáo/ADR.

| Ngày | Mã | Nội dung đã sửa | Kiểm tra | Commit |
|---|---|---|---|---|
| 21/11/2026 | RA01 | Chặn ngày bắt đầu đã qua ở cả phát OTP và ký; OTP qua nửa đêm không ký được, giữ nguyên chữ ký cũ. | 56 backend đạt; 4 biên ngày chạy lại đạt; 4 Playwright Owner/Customer desktop/mobile đạt. | `5f5f0082` |
| 21/11/2026 | RA02 | Ký đủ trước ngày thuê: giữ phòng, hiển thị chờ hiệu lực, tự kiểm tra/chuyển đúng ngày; hỗ trợ hủy song phương khi đang chờ. | 73 backend đạt qua các lượt; 165 frontend/TypeScript/build và 4 Playwright desktop/mobile đạt. | `fdc5caa7` |
| 21/11/2026 | RA03 | Chặn điện nước khi hợp đồng chưa bắt đầu hoặc kỳ vượt tháng hiện tại, dùng chung cho chỉ số/tạo/gửi/AI; nháp cũ vẫn hủy được. | 77 backend đạt, 1 scheduler skipped; 4 Playwright desktop/mobile đạt; RENT D-7 giữ nguyên. | `b5d22553` |
| 25/11/2026 | FIN01 | Sửa biểu đồ báo cáo tài chính bị lỗi domain [0, 0] không hiện cột; chuẩn hóa màu SVG cột, tăng chiều rộng ô chọn tháng và đồng nhất phạm vi tiền nhận theo kỳ. | 7/7 backend OwnerFinancialSummaryIntegrationTests đạt; 182/182 frontend tests và Vite build đạt. | `f849006c` |
| 25/11/2026 | FIN02 | Chuẩn hóa Combo Chart trải đều doanh thu tiền phòng phân bổ và tiền điện nước theo từng tháng sử dụng thực tế. | 182/182 frontend tests và Vite build đạt. | `577edb66` |
| 25/11/2026 | BIL01 | Ẩn khối công thức toán 'Cách tính tiền thuê' rườm rà; đổi tên cột thành 'Chu kỳ' và hiển thị số tháng chu kỳ rõ ràng trên chi tiết hóa đơn. | 182/182 frontend tests và Vite build đạt. | `cb5badaa` |
| 25/11/2026 | BIL02 | Chuyển chu kỳ tính hóa đơn tiền phòng sang chu kỳ tròn theo ngày vào ở (Anniversary Cycle); thu đủ trọn chu kỳ không cắt lẻ ở tháng đầu, chỉ tính ngày lẻ khi chu kỳ cuối không đủ chu kỳ; cập nhật hóa đơn #95 về 3.000.000 đ kỳ 25/11/2026–24/02/2027. | 10/10 backend tests (CalendarRentScheduleTests + RentScheduleTests) đạt; 182/182 frontend tests đạt; DB đã cập nhật và kiểm tra thực tế. | `7af1b3d5` |
| 25/11/2026 | CON01 | Sửa lỗi modal đề nghị kết thúc sớm bị trắng; hiển thị trực tiếp form nhập liệu (ngày kết thúc, điều khoản, phạt/bồi thường, bên chịu, lý do và cam kết) khi mở modal từ danh sách hợp đồng. | 182/182 frontend tests và Vite build đạt; kiểm tra render JSX độc lập với initialAction. | `adb9f60e` |
| 25/11/2026 | CON02 | Bỏ ô nhập căn cứ/điều khoản thời hạn báo trước trong form kết thúc sớm; cố định quy tắc báo trước tối thiểu 3 tuần (21 ngày) và tự động tính ngày kết thúc mặc định; cập nhật hạn kết thúc hợp đồng #26 đến 30/11/2027 để thử nghiệm. | 182/182 frontend tests và Vite build đạt. | `e5695a67` |
| 25/11/2026 | BIL03 | Bổ sung cột 'Đơn giá / tháng' trên chi tiết hóa đơn tiền thuê để hiển thị đủ 3 mục (đơn giá - chu kỳ - thành tiền); tạo bổ sung các hóa đơn tiền phòng và điện nước cho các kỳ trước của hợp đồng HH205.RENEW (Hữu Hà & Văn Chương). | 182/182 frontend tests và Vite build đạt; DB đã cập nhật và kiểm tra thực tế. | `db8ba858` |
| 25/11/2026 | CON03 | Cập nhật thông báo sau khi gửi đề nghị kết thúc sớm thành 'Đề nghị kết thúc sớm đã được gửi · Chờ bên còn lại xác nhận' với giao diện thẻ trạng thái màu xanh; xóa bỏ toàn bộ phần lịch sử kết thúc thuê/bàn giao theo yêu cầu. | 182/182 frontend tests và Vite build đạt. | `53c11e84` |
| 25/11/2026 | CON04 | Cho phép chọn ngày kết thúc trong thời gian còn lại đến khi hết hạn nếu hợp đồng còn không quá 3 tuần (<= 21 ngày); backend cho phép ngày kết thúc sớm lên đến ngày kết thúc hợp đồng; chỉ áp dụng quy tắc báo trước 3 tuần khi hợp đồng còn hơn 3 tuần. | 182/182 frontend tests và Vite build đạt. | `e50c34d9` |
| 25/11/2026 | BIL04 | Tính đúng tiền phòng ngày lẻ kỳ cuối cho hợp đồng HH205.RENEW (cập nhật hóa đơn #101 về 2.833.333 đ cho 10 ngày lẻ từ 21/11–30/11); hiển thị chu kỳ '10 ngày' trực quan; sửa công thức Combo Chart tài chính để phản ánh đúng phần tiền phòng chưa thanh toán vào cột 'Hóa đơn còn nợ' thay vì gộp nhầm vào đã thu. | 183/183 frontend tests và Vite build đạt; DB đã cập nhật và kiểm tra thực tế. | `7f30c7f4` |

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

- 24/11/2026 — Phí bảo trì vào hóa đơn: khách nghiệm thu mới tạo khoản phải thu theo hợp đồng gốc và tháng thu; tự cộng vào hóa đơn mới/nháp, giữ nguyên hóa đơn đã gửi, hủy hóa đơn trả khoản phí về chờ thu; 7 kiểm thử SQL trên database riêng PASS. Commit: Tự động đưa chi phí sửa chữa đã nghiệm thu vào hóa đơn.

- 24/11/2026 — Giao diện phí sửa chữa: chọn tháng và phần khách chịu khi báo sửa xong; khách xác nhận cả khoản phí; lập hóa đơn thấy sẵn từng sự cố và tổng dự kiến; hóa đơn chi tiết hiện phí riêng. TypeScript/build, 175 unit và 8 E2E desktop/mobile PASS. Commit: Hiện chi phí sửa chữa và tổng tiền trong hóa đơn tháng.

- 24/11/2026 — Kiểm chứng phân bổ phí bảo trì: test API tạo phiếu gắn đúng hợp đồng, chủ chia 600.000 đ thành 400.000/200.000 đ, chỉ ghi khoản phải thu sau khách nghiệm thu; database riêng PASS. Commit: Kiểm tra luồng chia tiền sửa chữa và khách nghiệm thu.

- 24/11/2026 — Hiện mục Chi phí sửa chữa kể cả khi chưa có khoản thu, giải thích điều kiện nghiệm thu/tháng và thêm lối mở Sự cố & Bảo trì. TypeScript/build và 2 E2E phí sửa desktop/mobile PASS. Commit: Hiện lý do chưa có phí sửa chữa khi lập hóa đơn.

- 24/11/2026 — Phân công thợ: sửa biểu thức kiểm tra điện thoại trên trình duyệt, báo lỗi ngay tại ô nhập và chặn gửi chuỗi chữ; nhập số hợp lệ phân công thành công. TypeScript/build và 2 E2E PASS. Commit: Báo lỗi điện thoại ngay trong biểu mẫu phân công thợ.

- 24/11/2026 — Phân công thợ: chặn ngày giờ hẹn đã qua tại trình duyệt và server theo thời điểm thực, báo lỗi cạnh lịch hẹn; giữ nguyên lịch sử cũ. 2 backend SQL riêng, 2 E2E, TypeScript/build PASS. Commit: Chặn lịch phân công thợ trong quá khứ.

- 24/11/2026 — Sổ quỹ sửa chữa: phiếu chi lấy toàn bộ tiền chủ nhà trả cho thợ, kể cả khách chịu 100%; phần khách được thu riêng qua hóa đơn. Giữ nguyên phiếu lịch sử. 6 backend SQL database riêng, TypeScript và 2 E2E desktop/mobile PASS. Commit: Ghi đủ tiền chủ nhà thanh toán cho thợ.

- 24/11/2026 — Tháng thu phí sửa chữa: chặn tháng sau tháng kết thúc hợp đồng gốc, giữ phép chọn tháng cuối kể cả hợp đồng kết thúc giữa tháng. 3 backend SQL riêng và 2 E2E bảo trì PASS. Commit: Chặn tháng thu phí sửa chữa sau hạn hợp đồng.

- 24/11/2026 — Nhận tiền mặt hóa đơn: API dành cho đúng chủ nhà, khóa giao dịch và chống xác nhận trùng; cập nhật công nợ và ghi một phiếu thu đã xác nhận trong cùng transaction, lưu người xác nhận/ghi chú, không cộng số dư SePay. Migration V75 giữ dữ liệu chuyển khoản. 5 billing (có đồng thời), 26 SePay (có webhook đến muộn), 6 sổ quỹ trên SQL test riêng PASS. Commit: Xác nhận tiền mặt và ghi sổ thu hóa đơn đồng bộ.

- 24/11/2026 — Giao diện thu tiền mặt: Chi tiết hóa đơn có nút Đã nhận tiền mặt, chọn ngày/ghi chú và xác nhận đã nhận đủ; cập nhật danh sách hết nợ, khách thấy phương thức tiền mặt. 175 frontend unit, TypeScript/build và 6 E2E desktop/mobile PASS; ảnh mobile đã xem. Commit: Thêm xác nhận đã nhận tiền mặt trong chi tiết hóa đơn.

- 24/11/2026 — Chọn mẫu hợp đồng: bỏ lựa chọn Mặt bằng kinh doanh và Ở ghép / Share phòng; chỉ còn Nhà nguyên căn, Chung cư / Căn hộ, Phòng trọ. TypeScript/build PASS; không thay đổi dữ liệu hợp đồng cũ. Commit: Bỏ hai mẫu hợp đồng kinh doanh và ở ghép khỏi giao diện.

- 24/11/2026 — Kết thúc đơn phương: thông báo mới chờ 14 ngày, hết hạn không phản đối tự kết thúc và mở lại phòng; giữ công nợ/chữ ký, thông báo rõ cả hai bên, API danh sách đề nghị chờ riêng tư. Hạn thông báo đã gửi giữ nguyên. 34 ca backend SQL riêng PASS qua hai lượt (lượt đầu 1 lỗi đồng hồ fixture, đã sửa và chạy lại PASS); giao diện đang làm.

- 24/11/2026 — Sau backend 76a8f106: đề nghị kết thúc thuê hiện đầu danh sách hợp đồng, Phản hồi ngay cho đúng bên; thông báo mở thẳng phần xử lý, nhãn 14 ngày và tự mở lại phòng. 181 FE, TypeScript/build PASS; 4 Playwright inbox/deeplink hai vai trò × desktop/mobile + 6 kịch bản đơn phương PASS bằng API fixture; không ghi appDB.

- 24/11/2026 — Hủy trước thuê: đã nhận khách thì luôn gửi đề nghị, kể cả chưa ký/chưa lập hợp đồng; chờ bên kia phản hồi, sau 3 ngày không trả lời mới tự hủy. Khóa giao dịch, không đổi trạng thái qua GET, chặn bộ đếm hết hạn ký 48h hủy trong lúc chờ đề nghị. 89 backend (76 hợp đồng +13 hủy), 181 FE/TypeScript/build và 6 kịch bản Playwright hủy desktop/mobile PASS. Hai lượt browser đầu sai fixture vai trò/URL redirect, đã sửa fixture và chạy lại PASS; không sửa dữ liệu đã hủy trong appDB. Backend14ngày76a8f106, UI3784b896.

- 24/11/2026 — Đồng bộ vai trò chủ nhà: chỉ tài khoản có ít nhất một tài sản được duyệt mới có quyền OWNER; tài khoản không còn tài sản hợp lệ trong danh sách tự động đồng bộ về CUSTOMER, ẩn liên kết Trang quản lý và chặn vào /app. 16 Auth integration tests, 4 unit tests OwnerRoleReconciliation, 181 frontend tests và build đạt 100%.

- 24/11/2026 — Đăng tải tài sản: bỏ khung quét đối chiếu AI tự động ở bước cuối (Kiểm tra trước khi gửi), người dùng xem trước thông tin và bấm gửi duyệt trực tiếp mà không bị báo lỗi quét tệp; giữ nguyên bước đọc trích xuất giấy tờ ban đầu. 181 frontend unit tests, TypeScript/build và Playwright E2E PASS. Commit: Bỏ quét AI đối chiếu ở bước cuối đăng tải tài sản.

- 24/11/2026 — Dừng làm hợp đồng inline: thay nút Hủy / lịch sử làm hợp đồng bằng nút Dừng làm hợp đồng inline; khi có đề nghị dừng hiển thị thông báo kèm 2 nút Có/Không, từ chối dừng sẽ trở lại trạng thái ban đầu; gỡ bỏ khối Lịch sử xử lý hủy khỏi giao diện. 181 frontend unit tests, TypeScript/build PASS. Commit: Hiển thị thao tác dừng làm hợp đồng inline và gỡ lịch sử hủy.

- 25/11/2026 — Danh sách hợp đồng: gỡ bỏ nút Hủy / lịch sử làm hợp đồng và modal popup hủy trên thẻ danh sách hợp đồng (ContractDraftList). 182 frontend unit tests, TypeScript/build PASS. Commit: Gỡ nút Hủy trên thẻ danh sách hợp đồng.

- 25/11/2026 — Lập biên bản bàn giao: cố định ngày bàn giao là ngày lập biên bản (hôm nay), ẩn ô chọn ngày trên biểu mẫu, hiển thị ngày trên biên bản PDF bàn giao. 29/29 ContractExitIntegrationTests và 181 frontend tests PASS.

- 25/11/2026 — Rà soát nút hủy và kết thúc sớm: xóa hoàn toàn nút Hủy trên chi tiết hợp đồng chưa active (ContractDocument); hợp đồng đang trong thời hạn (ACTIVE) có nút Đề nghị kết thúc sớm trực tiếp; chỉ hiện nút Biên bản bàn giao / ký khi đã tạo biên bản bàn giao. 182 frontend tests và build PASS. Commit: Đồng bộ nút kết thúc sớm và ẩn nút hủy trên hợp đồng chưa active.

- 25/11/2026 — Quy trình đăng tải tài sản 3 bước: bỏ bước 4 (Xem trước & gửi); ở bước 3 (Căn/phòng) có nút Gửi hồ sơ kiểm duyệt trực tiếp kèm ghi chú duyệt; 182 frontend tests, TypeScript/build và E2E PASS. Commit: Rút gọn quy trình đăng tải tài sản về 3 bước và gửi duyệt tại bước Căn phòng.
