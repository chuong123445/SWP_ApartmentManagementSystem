# Tổng kết: tạo tài sản, ảnh, giá thuê và ID tăng dần

**Ngày hoàn thành:** 28/10/2026. **Dự án:** An Cư PropTech. **Kết quả:** triển khai Backend/Frontend, chuyển database chính có giữ dữ liệu và hoàn tất kiểm thử trong phạm vi dưới đây.

## 1. Các đầu việc đã làm

| Yêu cầu | Thực hiện | Nơi sử dụng |
|---|---|---|
| Không tạo tài sản trong box nhỏ | Chuyển các lối vào tạo tài sản sang trang riêng; bỏ gate/modal tạo cũ | `/account/properties/new` |
| Chọn quan hệ với tài sản trước | Ba lựa chọn Chính chủ / Người được ủy quyền / Người thuê lại; mỗi lựa chọn có URL/form riêng | Các trang con `/ownership`, `/authorization`, `/sublease` |
| Chính chủ dùng nguồn Auth0 | Giữ chọn tài sản nguồn, hoàn thiện giá/điện/nước/công tơ; bổ sung ảnh và công khai theo quy tắc hiện có | Trang chính chủ; tài khoản thường đi qua consent/nâng cấp Owner trước |
| Ủy quyền/thuê lại có form phù hợp | Tạo Self application nháp từ trang; sau lưu mở bước hồ sơ giấy tờ/thời hạn tương ứng | Trang hồ sơ quyền cho thuê, Admin duyệt theo luồng đã có |
| Từ1đến4ảnh | Chọn nhiều ảnh, xem trước, xóa/chọn lại, kiểm tra giới hạn; ảnh đầu làm đại diện | Bộ ảnh theo tài sản, dùng chung các căn trong Property |
| Lưu ảnh an toàn | `property_images` lưu metadata/bytes SQL; kiểm tra JPEG/PNG thật, mã hóa lại; gắn ảnh trong transaction tạo tài sản | Ảnh staging/nháp riêng tư; ảnh quảng bá chỉ công khai sau khi đủ điều kiện |
| Hiển thị bộ ảnh | Ảnh đại diện trên danh sách/Owner; public detail hiển thị gallery; ảnh nháp tải bằng Bearer/blob | Quản lý căn hộ và chi tiết tin đăng |
| Sửa giá căn chưa thuê | Form sửa giá thuê/điện/nước; PATCH có ownership/version/khóa căn hộ/kiểm tra VACANT | Quản lý căn hộ → chọn căn trống → Chỉnh sửa giá thuê, điện và nước |
| Yêu cầu thuê đã gửi | Áp dụng lựa chọn của người dùng: còn PENDING thì chặn thay cả giá thuê/điện/nước | Backend trả409 và UI giải thích cần xử lý yêu cầu trước |
| Giữ lịch sử giá yêu cầu mới | Lưu `quoted_monthly_rent` lúc gửi; yêu cầu mới không hiển thị lại theo giá quảng cáo đã đổi | Danh sách/lịch sử yêu cầu thuê |
| Đơn giá hợp đồng | Không sửa các đơn giá đã chốt trong hợp đồng/hóa đơn khi sửa giá niêm yết | Giữ cơ chế hợp đồng và billing hiện có |
| Chuyển ID model | `Long` + `BIGINT IDENTITY` ở bảng gốc; PK/FK phụ kế thừa ID; API dùng chuỗi số | Tất cả model đang chạy, bao gồm PK module Escrow cũ |
| Giữ dữ liệu khi chuyển | Backup COPY_ONLY/VERIFYONLY, restore clone để thử, mapping, transaction, khôi phục index/unique/FK; backup mới ngay trước live | `tools/identity-migration.ps1`; V19 |
| Tách xác thực CCCD | Thêm `auth_accounts.identity_verified`, backfill/cập nhật cùng Auth0; gate vẫn kiểm tra evidence VERIFIED | Khác với `contact_verified`, email_verified và phone_verified |
| Tài liệu database | Giải thích đủ29bảng, nhóm chức năng, quan hệ, dữ liệu riêng tư và phụ lục cột SQL thực tế | `docs/database/database-guide-2026-10-28.md` |
| Đồng bộ tài liệu | OpenAPI/ADR/API_DOCUMENT/plan/project/AGENTS/WORK_PROGRESS; giữ RDS/diagrams | Các file bàn giao hiện hành |

## 2. Quy tắc giá đã chốt

Người dùng chọn **khóa đổi giá khi còn yêu cầu thuê chờ xử lý**. Owner xử lý từng yêu cầu hoặc Customer tự hủy theo luồng hiện có. Hệ thống không tự từ chối hàng loạt, không tự chọn FIFO và không đổi giá âm thầm cho người đã gửi yêu cầu.

Khi ACCEPT, căn chuyển CONTRACT_IN_PROGRESS nên không sửa được giá. OCCUPIED/MAINTENANCE cũng bị chặn. Khi không còn PENDING và căn VACANT, Owner sửa cả ba đơn giá với version mới nhất. Không đổi chỉ số công tơ, cọc hay lịch sử hợp đồng.

Phương án còn lại đã trao đổi là cho đổi niêm yết và giữ giá từng yêu cầu để accept theo giá cũ; **không triển khai phương án đó** trong lần này. Snapshot giá yêu cầu mới vẫn được lưu để giữ lịch sử. Yêu cầu cũ không có snapshot giữ NULL; API fallback giá hiện tại, không khẳng định đó là giá lúc đã gửi.

## 3. Ảnh được lưu ở đâu?

- SQL Server `property_images.content` dạng `varbinary(max)`; không lưu ảnh giới thiệu vào Auth0 hay thư mục public của source.
- Nhận JPEG/PNG tối đa5MB/file và20MP; canonical PNG tối đa10MB. Tài sản mới bắt buộc1–4IDảnh riêng, đúng uploader, chưa gắn tài sản, không trùng/null.
- Upload trước khi tạo: chỉ uploader được xem; bind cùng transaction tạo Property. Không để tạo Property nửa chừng nếu ảnh không hợp lệ.
- Ảnh đầu làm thumbnail; trang chi tiết hiển thị cả bộ. Album theo Property, không phải bộ riêng cho từng căn trong cùng Property.
- Giấy tờ pháp lý/CCCD dùng các bảng private cũ, không đưa vào gallery.
- Staging riêng tư có quota100ảnh chưa gắn/tài khoản; chưa có lịch dọn staging hay giao diện thay bộ ảnh của tài sản đã lưu. Dữ liệu/ảnh cũ không bị ép tải lại.

## 4. Kết quả chuyển database chính

Đã thực hiện trên `proptech_db`, không reset database hoặc tạo lại tài khoản:

| Kiểm tra | Kết quả |
|---|---|
| Số bảng sau chuyển | 29 |
| Cột IDENTITY trên bảng gốc | 16 |
| Cột SQL kiểu uniqueidentifier còn lại | 0 |
| FK disabled/untrusted | 0 |
| Ánh xạ ID cũ được giữ | 692 |
| Số tài khoản / tài sản / căn hộ | Giữ nguyên6 /8 /15 |
| Yêu cầu thuê / hợp đồng / bản nháp | Giữ nguyên36 /3 /1 |
| Fingerprint password hash, JSON snapshot, ảnh CCCD/chứng từ | Đối chiếu trước/sau đạt |

Backup live mới, đã RESTORE VERIFYONLY trước chuyển:

```text
C:\Program Files\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQL\Backup\ancu_before_identity_live_20261028000829.bak
```

Manifest/bằng chứng local: `ancu-proptech-backend/target/identity-migration-manifest.json`, `schema-before-identity.json`, `schema-after-identity.json`. Không commit backup hoặc credentials.

Phiên cũ đã thu hồi; OTP đổi email còn chờ bị invalidate vì ID tham gia JWT/HMAC đã đổi. Cần **đăng nhập lại**, không cần đổi mật khẩu hay đăng ký lại. Snapshot hợp đồng/ảnh giấy tờ/archive giữ nguyên; UUID trong JSON lịch sử vẫn đọc được. API hiện hành trả ID chuỗi số để tránh mất chính xác JavaScript. IDENTITY có thể có khoảng trống và ID sau backfill không phải ngày tạo.

Backend đã khởi động lại cổng8080 trên database chính; GET csrf và public apartments trả200. Seed/fixture bị tắt ở tiến trình khởi động lại để không tác động dữ liệu. Frontend người dùng cổng3000 được giữ nguyên.

## 5. Kiểm thử và bằng chứng

| Nhóm | Kết quả thực tế |
|---|---|
| Toàn bộ Backend tests | **203 đạt**,0fail/error/skip, chạy trên bản sao database đã chuyển ID; log `target/identity-full-tests.log` |
| Sau tối ưu thumbnail | **21 đạt** ảnh/giá + import; `target/creation-final-backend-tests.log` |
| ID ảnh null/validation | **7 đạt** kiểm tra lại ảnh/giá; `target/creation-null-image-tests.log` |
| Frontend | **44unit đạt**, TypeScript/lint đạt, production build đạt; cảnh báo native config/bundle lớn đã có trước |
| Playwright | **29đạt/45.8s**, desktop1440/mobile390, thao tác chính, không tràn ngang và không có page/unexpected network-console errors |
| Backend/SQL qua browser thật | Một luồng tài khoản thử riêng → trang tạo →4ảnh thật → private preview → sửa giá → reload giữ giá; ID số được xác nhận |
| Source/Auth0 | Hồi quy qua HTTP/mock và unit/integration; không đăng nhập Auth0 thật/ghi dữ liệu nguồn trong task này |
| Cleanup fixture | Tài khoản/tài sản thử còn0 sau từng lượt, chỉ trên clone; dữ liệu dùng chung/database chính không dùng làm fixture |

29ca Playwright gồm8ca tạo/ảnh/giá mới,1SQL/browser thật,8import hồi quy,6rights UI,6Owner upgrade. Không cộng lặp các lượt chạy lại. Đã xem ảnh chụp form mobile. Một lượt real đầu thất bại vì monitor coi401 của refresh khi chưa đăng nhập là lỗi bất thường; chỉ allowlist đúng endpoint/status đó, lượt cuối đạt.

Context7 đã đối chiếu Spring7.0.5 gần phiên bản đang dùng7.0.9/Boot4.1.1, React Router (catalog chưa có tài liệu ghim8.4), SQL Server IDENTITY. Playwright MCP mở trang; CLI chạy các suite. Backend kiểm thử ban đầu gặp lỗi socket loopback Windows; đã chạy được bằng thư mục socket tạm ngắn, không thay cấu hình deployment trong source.

## 6. Giới hạn và những phần giữ nguyên

- Auth0 vẫn là VNeID mô phỏng; không thêm kết nối dữ liệu dân cư/đất đai thật, OCR, SMS, ký số/thanh toán hay kiểm tra công chứng tự động.
- Không nghiệm thu email nhắc hạn/inbox thật trong task này; tests tắt mail/scheduler thật.
- Không tự duyệt tài sản thủ công, không bỏ bước giấy tờ/thời hạn của ủy quyền/thuê lại.
- Không tự đổi/hủy hợp đồng đang có hoặc sửa snapshot để đổi UUID cũ thành số. Link bookmark UUID cũ không có alias; mở lại từ danh sách mới.
- Archive và reference văn bản `contract_id`/`room_id` của module Escrow cũ giữ nguyên; PK Escrow đã là IDENTITY. Đây chưa phải tích hợp Escrow với hợp đồng mới.
- Một số fixture/script E2E lịch sử giả định UUID/đăng ký Owner cũ chưa được port/nghiệm thu lại. Bộ203Backend và29browser nêu trên là bằng chứng đã chạy; không gọi đây là toàn bộ E2E của repository. Không chạy các script lịch sử để sửa dữ liệu hiện hành.
- Bản clone dùng kiểm thử được giữ riêng để đối chiếu; backup được giữ trên SQL Server. Không đẩy dữ liệu đó lên Git.

## 7. File/module và commit

- Backend: PropertyImage model/repository/service/controller; ApartmentPrices DTO + OwnerApartmentService/controller; V18/V19; model/repository/DTO/Auth session/OTP/snapshot sang ID số; fixture và tool migration.
- Frontend: PropertyCreatePage, PropertyCreateForm, VneidAssetImportForm, PropertyImagesField, ApartmentPriceForm, Account/Workspace routes, gallery/private image loader và services.
- API chi tiết: `docs/api/property-images-prices.openapi.json`; các OpenAPI hiện hành đã đổi schema UUID sang ID số, trừ chuỗi ID snapshot lịch sử.
- Quyết định: `docs/decisions/property-create-images-prices-identity-v1.md`.

| Commit local | Đầu việc |
|---|---|
| `94850ea` | Backend IDENTITY, migration, ảnh/giá, cờ danh tính và tests |
| `c6178fe` | Trang tạo theo vai trò, chọn ảnh, gallery, sửa giá và browser tests |
| `5616196` | Backup mới ngay trước live migration, fixture SQL/browser riêng |
| `b70a461` | Từ chối ID ảnh null và bổ sung kiểm thử |
| `b074989` | Kiểu tham số ID số cho công cụ cleanup identity; syntax/type check đạt, không nghiệm thu lại E2E legacy |

Chỉ commit local, chưa push. Commit tài liệu được ghi tại WORK_PROGRESS sau khi hoàn tất.

## 8. Cách dùng sau bàn giao

1. Tải lại React và đăng nhập lại bằng tài khoản cũ.
2. Chọn **Thêm tài sản cho thuê** → chọn quan hệ → điền form/nguồn và1–4ảnh.
3. Với ủy quyền/thuê lại: tiếp tục hồ sơ pháp lý/Admin; với nguồn chính chủ: giữ luồng bổ sung giá rồi công khai.
4. Muốn đổi giá: **Quản lý căn hộ** → chọn căn đang trống → **Chỉnh sửa giá thuê, điện và nước**. Nếu có PENDING, xử lý yêu cầu trước rồi tải lại căn.
