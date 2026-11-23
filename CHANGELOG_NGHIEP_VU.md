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
