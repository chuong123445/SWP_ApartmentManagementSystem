# Rà soát sâu tạo tài sản và thêm căn hộ — 21/11/2026

Source: `b73d7046`, giữ nguyên runtime trong lượt này. Người dùng yêu cầu đánh giá khả năng vận hành sản phẩm đăng tải/quản lý cho thuê và chuẩn bị ba bộ file mẫu cho Thu Hà. Không coi test xanh là đủ để kết luận toàn bộ nghiệp vụ đã đúng.

## Kết luận

Mô hình tài sản → căn cho thuê và tách người khai thác khỏi chủ sở hữu gốc phù hợp với ba hình thức đang hỗ trợ. Các chốt phân quyền, nháp riêng tư, duyệt tài sản, quyền theo thời hạn, khóa giá khi còn yêu cầu thuê và nhập phòng nguồn có nhiều kiểm tra đúng. Tuy nhiên **chưa thể kết luận luồng tạo/thêm căn hộ sẵn sàng vận hành thật**: điều kiện hoàn thiện và phát hành căn chưa thống nhất giữa wizard, thêm căn trực tiếp và publication; vẫn có các điểm hở RA10/RA11 đã báo trước.

## Phát hiện mới đã tái hiện

### RA14 — Trung bình: thêm căn được đăng với giá thuê 0 và thiếu đơn giá điện/nước

- `dto/apartment/OwnerApartmentCreate.java`: advertisedMonthlyRent cho phép `0`, điện/nước nullable; khác `OwnerPropertyCreate.Unit`, `VneidPropertyImportRequest.Unit` và PATCH `ApartmentPrices` đòi giá thuê >=0.01.
- `OwnerApartmentService.createInternal`: với tài sản thủ công APPROVED, có ảnh riêng là tạo được căn PUBLISHED, chưa kiểm tra đủ bộ giá.
- Tái hiện `ApartmentCreationAuditTests.audit14AppendPublishesZeroRentWithoutDeclaredUtilities`: tạo trên tài sản APPROVED, ảnh staging đúng chủ, monthlyRent=0, không gửi điện/nước, publication=PUBLISHED → **201**, GET public detail → **200**; cùng căn đó PATCH monthlyRent=0 → **400**.
- Hệ quả: tin miễn phí/thiếu giá có thể xuất hiện dù luồng thông thường yêu cầu giá dương và bộ giá rõ ràng. Thiếu đơn giá khác với đơn giá 0 đã được khai báo; không nên tự đổi NULL thành 0.
- Hướng sửa: một policy cho đầu vào căn mới và một policy đủ điều kiện công khai, dùng ở tất cả command tương ứng. Không làm tròn tiền, thay hợp đồng đang ký hoặc reset các tin cũ để xử lý lỗi này.

### RA15 — Trung bình: công khai không kiểm tra lại ảnh riêng và thông tin hoàn thiện

- `OwnerApartmentService.publication` kiểm tra owner/version/quyền hiện tại/APPROVED, không kiểm tra ảnh riêng, giá hoặc bộ thông tin thương mại trước khi đổi PUBLISHED.
- Tái hiện `ApartmentCreationAuditTests.audit15PublicationDoesNotRecheckRequiredUnitImage`: thêm căn nháp vào tài sản DRAFT không có ảnh riêng; fixture chuyển tài sản sang APPROVED để cô lập bước publication; API publication → **200**, public detail → **200**, gallery ảnh riêng vẫn rỗng. Đây **không phải** test trọn quy trình Admin duyệt tài sản không có ảnh.
- Wizard complete và thêm trực tiếp vào tài sản đã APPROVED lại yêu cầu ảnh riêng. DTO unit của nguồn Auth0 cũng chỉ giới hạn tối đa số ảnh, chưa đòi tối thiểu ở backend; phần này mới đối chiếu source, chưa có probe riêng.
- Hướng sửa: chặn công khai căn mới chưa đủ dữ liệu, kể cả căn đã lưu nháp qua đường cũ. Tách hoàn thiện tin khỏi việc xác minh giấy tờ và khỏi việc có người ở. Không yêu cầu công tơ phải có lúc đăng tin vì user đã chọn bổ sung ở bước hợp đồng/bàn giao.

### RA16 — Trung bình: thêm căn vào wizard đang soạn làm wizard không hoàn tất được

- `OwnerApartmentService.createInternal` chưa kiểm tra tài sản có `property_listing_drafts.completed=false` khi gọi API thêm căn trực tiếp bằng tài khoản đã có OWNER.
- Tái hiện `WizardUnitCreationAuditTests.audit16ExistingOwnerCanAddRoomBeforeWizardCompletion`: Owner có danh tính hợp lệ mở wizard SINGLE_UNIT; gọi POST `/owner/apartments` vào chính tài sản đang soạn → **201**; complete wizard với ảnh/giấy tờ đã đạt gate và dữ liệu hợp lệ → **409 SINGLE_UNIT_LIMIT**. Nháp vẫn chưa completed, chỉ tồn tại căn thêm ngoài wizard, chưa có submission.
- Với MULTI_UNIT, source cũng cho thấy căn thêm ngoài payload có thể nằm ngoài danh sách xem trước của wizard; chưa chạy probe riêng cho biến thể đó.
- Hướng sửa: trong lúc có wizard chưa hoàn tất, quản lý danh sách căn qua payload của wizard; backend chặn command thêm căn khác. Không tự xóa căn đã lưu hoặc bỏ qua giới hạn SINGLE_UNIT để né xung đột.

## Ma trận nghiệp vụ đã đối chiếu

| Hạng mục | Đánh giá và giới hạn |
|---|---|
| Tài sản và căn cho thuê | Property là phạm vi khai thác, Apartment là đơn vị nhận yêu cầu/hợp đồng/hóa đơn riêng. SINGLE_UNIT chỉ một căn; MULTI_UNIT cho nhiều căn độc lập. Không gán sở hữu cả tòa nhà chỉ vì sở hữu một căn. |
| Ba hình thức quyền | OWNERSHIP/AUTHORIZATION/SUBLEASE là quan hệ theo tài sản. `Property.owner` là tài khoản đăng/khai thác; principalName/documentNumber mô tả chủ sở hữu gốc của hai loại sau. Chưa có FK tự nối principal với tài khoản khác; trùng tên/CCCD không tự cấp quyền truy cập cho tài khoản đó. |
| Điều kiện tài khoản | Người nộp phải hoạt động và có bằng chứng danh tính được policy chấp nhận; email riêng không thay giấy tờ tài sản. Bằng chứng LOCAL_DEMO chỉ được policy chấp nhận đúng local profile, không dùng làm chuẩn production. |
| Chính chủ nguồn so với thủ công | Nguồn Auth0 được server đọc lại, sourceVersion, exact binding và ID phòng nguồn; tự duyệt/công khai theo quyết định user đã có. Nhập thủ công vẫn phải qua dossier/Admin, không tạo dấu duyệt nguồn giả. |
| Nháp/hoàn tất/thử lại | Start dùng requestKey, save có version, complete transaction và retry không tạo trùng. Nháp không cấp Owner hoặc công khai. RA16 là command khác phá điều kiện đầu vào của wizard. |
| Ảnh và giấy tờ | Ảnh chung/riêng tách giấy tờ, ảnh thuộc uploader, không lấy ảnh tài khoản khác, giới hạn file và định dạng. Giấy tờ private không dùng làm ảnh quảng cáo. Thiếu policy phát hành thống nhất ở RA15. |
| Giá và chi phí | Giá căn tách giá hợp đồng. Thay giá khi VACANT và không PENDING request; điện/nước 0 có khai báo khác NULL. RA14 và sự khác nhau của các DTO chưa ổn. Cọc đang do hai bên quản lý ngoài hệ thống, không có chứng cứ thu cọc chỉ vì nhập số cọc. |
| Mã và phòng nguồn | Chặn trùng mã; property lock bảo vệ SINGLE_UNIT. Nguồn dùng ID phòng ổn định, không thêm phòng tùy ý vào nguồn, chặn nguồn stale/thay đổi pháp lý/đã nhập. Không suy diễn tất cả kiểm tra đồng thời đã chạy từ annotation. |
| Duyệt và quyền hiện tại | Không auto-public hồ sơ thủ công sau duyệt; public lại cần quyền còn hiệu lực. **RA10** duyệt kỳ quyền tương lai thay kỳ hiện tại và **RA11** gửi lại giấy mới không quét còn mở, xem báo cáo trước. |
| Sửa sau đăng | Sửa giới thiệu bằng version, không sửa diện tích/địa chỉ/giấy chứng nhận bằng endpoint giới thiệu. Hợp đồng dùng snapshot riêng. Thay đổi hiện trạng hoặc phạm vi pháp lý cần luồng đối chiếu riêng, không dùng sửa mô tả làm phụ lục quyền. |

## Quy tắc cần chốt cho sản phẩm thật

1. **Phạm vi quyền đến từng căn khi bổ sung:** hiện quyền/thời hạn nằm ở cấp Property; chưa có cấu trúc ràng buộc giấy ủy quyền/hợp đồng gốc chỉ cho khai thác một tập con căn hoặc một phần diện tích. Cần phân biệt “thêm căn thuộc phạm vi đã duyệt” với “mở rộng phạm vi giấy tờ”. Đây là khoảng trống mô hình cần quyết định, không tự bắt mọi căn phải có một giấy chứng nhận hoặc tự đổi quy tắc property-level approval.
2. **Điều kiện tin được công khai:** thống nhất mức bắt buộc về ảnh riêng, giá, sức chứa và đơn giá/phí đã khai báo. Chưa có test chứng minh toàn bộ chi phí người thuê nhìn thấy ở tin bằng mọi cấu hình property/invoice; không coi trường phí trống là miễn phí.
3. **Đổi chủ/chuyển người khai thác/ngừng khai thác:** chống trùng giấy chứng nhận toàn cục vẫn xét tài sản APPROVED kể cả quyền đã hết; chưa có luồng chuyển giao/phê duyệt lại đầy đủ. Không tắt chống trùng hoặc đổi owner_id trực tiếp để giả lập nghiệp vụ chuyển tài sản thật.

Không tự bổ sung các điều kiện này vào runtime trong một task review. Không sửa RA04 tài chính trả phòng đang được user giữ cần cân nhắc.

## Ba bộ file mẫu cho Thu Hà

Theo câu trả lời cuối cùng của user: **chỉ file để tự upload từ đầu**, không để lại nháp trong ứng dụng.

| Bộ | Chủ sở hữu trong chứng từ | Tệp bắt buộc | Căn dự kiến |
|---|---|---|---|
| 01 Chính chủ Thu Hà | Danh tính đã lưu của Thu Hà | RIGHT_DOCUMENT | A.101 |
| 02 Ủy quyền | Danh tính đã lưu của chuongaln; Thu Hà nhận ủy quyền | RIGHT_DOCUMENT + AUTHORIZATION_DOCUMENT | B.101, B.102 |
| 03 Thuê lại | Danh tính đã lưu của chuongaln; Thu Hà thuê và cho thuê lại | RIGHT_DOCUMENT + ORIGINAL_LEASE + SUBLEASE_CONSENT | C.201, C.202 |

- Chỉ đọc đúng hai tài khoản để khớp tên/số căn cước trong tài liệu mẫu; không sửa mật khẩu/role/xác thực. Không đưa số căn cước hoặc bản giấy tờ vào Git.
- Đầu ra riêng tư tại `F:/2026/Fa26/DTD/output/pdf/Thu_Ha_3_bo_ho_so_test_2026-11-21` và ZIP cùng tên: 6 PDF, 6 PNG tương ứng, 8 sơ đồ ảnh minh họa, hướng dẫn và JSON nhập form. Chỉ chọn một định dạng của mỗi giấy khi upload.
- Ba số giấy chứng nhận/địa chỉ là mẫu khác nhau; phạm vi căn và thời hạn trên giấy ủy quyền/cho thuê lại rõ ràng. Cho thuê lại nằm trong khoảng thuê gốc; bản thuê gốc là chứng từ ngoài hệ thống mô phỏng, không tạo một hợp đồng nội bộ lùi ngày.
- Watermark trên tất cả giấy: dữ liệu test, không giá trị pháp lý, không có dấu/chữ ký thật. Ảnh quảng cáo là sơ đồ minh họa, không phải ảnh căn hộ thực. Không thay dữ liệu Auth0 để làm tài sản nguồn giả.
- PDF tạo bằng ReportLab 5.1.0/Arial Unicode; mở lại bằng pypdf, render bằng PyMuPDF, kiểm tra đủ sáu trang và xem contact sheet. Context7 đối chiếu API font/Platypus với tài liệu ReportLab; catalog không có đúng bản 5.1.0.
- Trước khi nhận lựa chọn file-only đã tạo ba wizard draft tạm 10027–10029, 6 evidence và 8 ảnh staging. Đã gỡ đúng các bản chưa bị sửa sau khi backup XML/mở lại kiểm tra; không có apartment thực, submission, AI check hoặc thanh toán được tạo. Hash dữ liệu account/identity/apartment/contract/invoice/dossier được bảo toàn trong transaction tạo và gỡ. Identity sequence có thể đã tăng; không reseed hay viết lại dữ liệu người dùng. Kết quả cleanup ở `tmp/thuha-files-only-cleanup-result.json`. Không chạy helper Apply lại nếu không có yêu cầu mới.

## Bằng chứng kiểm tra

- Backend **55 ca đạt, 0 failure/error/skipped** trên SQL Server test riêng `ancu_auto_rent_20261114`: 52 hồi quy và 3 tái hiện. Gồm ApartmentPricesImages 7, AssetManagement 8, OwnerProperty 7, PropertyListing 3, VneidPropertyImport 26, OwnerApartmentAppend 1 và 3 probe RA14–RA16.
- Probe PASS là xác nhận hành vi có vấn đề còn tồn tại, không phải đã sửa. Hai lớp probe nguồn và compiled đã gỡ khỏi project, giữ generator/bản sao ở tmp để không cố định hành vi sai trong regression.
- Playwright MCP **6 ca đạt**: ba loại hồ sơ × 1440/390, quét mô phỏng từng nhóm giấy, thông tin chủ gốc đúng, số căn/giá/ảnh giữ riêng, xác nhận đối chiếu và đến trang xem trước, không submit; không tràn ngang hoặc lỗi page/console/network bất ngờ trong lượt cuối. Đã xem ảnh mobile thuê lại. Đây là SPA thật với API fixtures, **không phải UI nối DB/provider thật** và không chứng minh AI thật chấp nhận các giấy mẫu.
- Lượt browser đầu dùng require/import không có trong VM; đã chuyển sang fixture inline. Lượt sau fixture precheck thiếu review/runId tạo cảnh báo React key; bổ sung fixture đúng DTO rồi chạy lại toàn bộ sáu ca đạt, không sửa app để né cảnh báo.
- Evidence: `tmp/apartment-creation-deep-audit-20261121.log`, `generate-apartment-deep-audit.py`, `ApartmentCreationAuditTests.java`, `WizardUnitCreationAuditTests.java`, `thuha-three-types-browser-inline.js`, ảnh `thuha-{type}-{width}.png`; file mẫu và helpers riêng tư ngoài Git. Vite 3196 đã dừng.

Ưu tiên sửa tiếp: thống nhất policy hoàn thiện/công khai (RA14/RA15), giữ một đường quản lý căn khi wizard chưa xong (RA16), rồi xử lý RA10/RA11 và chốt phạm vi quyền khi thêm căn. Chưa sửa runtime trong lượt này.
