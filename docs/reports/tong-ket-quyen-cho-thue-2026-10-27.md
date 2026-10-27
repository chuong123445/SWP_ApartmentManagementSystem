# Tổng kết triển khai hồ sơ quyền cho thuê

**Dự án:** An Cư PropTech — Apartment Rental and Management System  
**Ngày:** 27/10/2026  
**Kết quả:** đã triển khai backend, frontend, kiểm thử và tài liệu cho luồng ủy quyền/thuê lại, quyền có thời hạn và nhắc hạn. Giữ luồng chính chủ từ Auth0 đã có.

## 1. Những đầu công việc đã hoàn thành

| Nhóm công việc | Nội dung đã làm | Kết quả sử dụng |
|---|---|---|
| Điều kiện nộp hồ sơ | Kiểm tra ACTIVE + CCCD VERIFIED đã được Backend ghi nhận từ Auth0 | Email OTP hoặc hồ sơ CCCD tự khai không thay thế xác thực VNeID |
| Lối vào cho tài khoản thường | Trang Hồ sơ quyền cho thuê; Self API riêng; tạo Property/Apartment nháp | Người không có tài sản chính chủ vẫn nộp hồ sơ ủy quyền/thuê lại, chưa có quyền quản lý Owner |
| Phân loại quyền | AUTHORIZATION và SUBLEASE theo từng tài sản; không thêm role tài khoản mới | Một người có thể chính chủ một tài sản và được ủy quyền/thuê lại tài sản khác |
| Giấy tờ ủy quyền | Giấy tờ sở hữu gốc và giấy ủy quyền riêng | Backend kiểm tra đủ loại file, đúng property và người nộp |
| Giấy tờ thuê lại | Giấy tờ sở hữu gốc, hợp đồng thuê gốc, văn bản cho phép cho thuê lại riêng | Không dùng điều khoản trong hợp đồng thay cho văn bản riêng |
| Thông tin chủ thể | Người nộp dùng họ tên/CCCD đã xác thực; chủ gốc có họ tên/CCCD riêng trong hồ sơ | Admin có dữ liệu đối chiếu, thông tin riêng tư không xuất hiện trên tin công khai |
| Upload PDF/ảnh | PDFBox3.0.8; PDF/JPEG/PNG tối đa10MB/file; PDF1–100trang, raster20MP | Từ chối file sai định dạng, PDF mã hóa/nội dung chủ động nhận diện, quá dung lượng/trang |
| Lưu trữ và tải xuống | Metadata và bytes trong SQL Server; attachment/no-store/nosniff; kiểm tra quyền | Chỉ người nộp và Admin đối với hồ sơ đã gửi được đọc file; không có URL giấy tờ công khai |
| Admin duyệt | Khóa account/property/dossier, kiểm tra phiên bản và điều kiện, xác nhận quyền/thời hạn | Duyệt hồ sơ đầu tiên cấp OWNER và approve đúng tài sản cùng transaction; không tự công khai |
| Thời hạn quyền | Ngày bắt đầu/kết thúc bắt buộc; quyền thuê lại nằm trong hợp đồng gốc | Không tự suy ra một năm từ giấy tờ thiếu thời hạn, không tự cắt ngày sai |
| Hợp đồng | Khóa/tải lại quyền trước snapshot mới; chặn tạo/sửa vượt khoảng đã duyệt; UI hiển thị giới hạn | Hợp đồng mới ưu tiên căn cước Auth0 VERIFIED, trường nguồn thiếu để trống; snapshot cũ không bị sửa |
| Khi hết quyền | Loại khỏi search/bộ lọc địa chỉ; chặn công khai mới, nhận/chấp nhận khách và hợp đồng không hợp lệ | Direct detail vẫn đọc được lịch sử và báo không nhận khách; không hủy hợp đồng, xóa lịch sử hay đổi availability |
| Gia hạn quyền | Tạo hồ sơ mới, giữ nguyên hồ sơ đã duyệt | Hồ sơ gia hạn chờ duyệt/bị từ chối không làm mất quyền cũ còn hạn; quyền mới chỉ hiệu lực sau Admin duyệt |
| Nhắc hạn | Thông báo trong ứng dụng trước tối đa30ngày và sau hết hạn; unique theo hồ sơ/loại | Có trang thông báo riêng; lịch sử thông báo cũ được giữ |
| Email nhắc hạn | Outbox, chỉ email verified/current, retry tối đa5, lease/attempt guard | SMTP lỗi không mất thông báo; bỏ mail khi địa chỉ/hồ sơ đã đổi; chưa nghiệm thu inbox thật |
| Minh bạch tin đăng | Nhãn Chính chủ / Đại diện theo ủy quyền / Bên cho thuê lại | Chỉ công khai loại quyền và thời hạn, không công khai chứng từ/CCCD/ngân hàng |

## 2. Cách sử dụng

### Chính chủ có tài sản trong Auth0

Giữ luồng đã triển khai: Trở thành chủ cho thuê → Backend kiểm tra nguồn → Thêm tài sản → Chọn tài sản VNeID → hoàn thiện giá và chỉ số → Thêm và cho thuê. Nhánh này không phải nộp hồ sơ Admin.

### Được ủy quyền hoặc thuê lại

1. Đăng nhập và hoàn tất xác thực CCCD qua VNeID mô phỏng.
2. Mở menu tài khoản/Cài đặt → **Hồ sơ quyền cho thuê**; hoặc chọn nhánh này từ trang nâng cấp/thêm tài sản.
3. Chọn quan hệ ủy quyền/thuê lại, tạo tài sản và căn nháp.
4. Nhập thông tin chủ gốc, thời hạn, tài khoản nhận tiền và tải đủ giấy tờ theo loại quyền.
5. Gửi hồ sơ; theo dõi Chờ duyệt/Cần bổ sung/Bị từ chối và gửi lại nếu cần.
6. Admin mở **Kiểm duyệt tài sản**, đối chiếu giấy tờ/ngày, xác nhận và phê duyệt.
7. Người nộp bấm **Tải lại hồ sơ và quyền tài khoản** để nhận trạng thái Owner, vào quản lý và chủ động công khai căn hộ.
8. Khi cần kéo dài quyền cho thuê, mở hồ sơ tài sản và gửi hồ sơ gia hạn mới.

## 3. Dữ liệu, API và cấu hình

- **V16:** flag Self application, loại quyền/thời hạn hiện hành trên Property; thời hạn hợp đồng thuê gốc, thông tin chủ gốc/người nộp và flag renewal trên dossier. Không backfill ngày hoặc đổi role fixture cũ.
- **V17:** property_right_notices và unique(dossier_id,kind), email outbox state/attempt/lease.
- **Self API:** GET/POST `/api/v1/me/rental-properties`; GET/POST `/{id}/verification-dossiers`; POST `/{id}/evidence-files`.
- **Thông báo:** GET `/api/v1/me/property-notices`, tối đa100 thông báo gần nhất của chính tài khoản.
- **API hiện có:** Owner dossier/file và Admin review mở rộng purpose, SUBLEASE, ngày và rightsConfirmed; Owner/public DTO thêm nhãn/thời hạn; contract context thêm rightsValidFrom/Until.
- **Lưu file:** property_evidence_files + property_evidence_content `VARBINARY(MAX)` trong SQL Server. Giấy tờ không được gửi Auth0/GDrive hoặc provider khác.
- **Scheduler trong Spring Boot:** lần đầu sau1phút, mỗi1giờ sau khi lượt trước kết thúc. Có thể cấu hình `app.property-rights.scheduler-enabled`, `app.property-rights.initial-delay-ms`, `app.property-rights.interval-ms`. App phải đang chạy; không tạo lịch trong Codex/Windows. Chặn giao dịch hết quyền hoạt động trực tiếp, không cần chờ scheduler.
- **SMTP:** dùng cấu hình mail hiện có; chỉ gửi đến email đã xác thực trong hệ thống. Không yêu cầu gửi password/secret trong chat. Test profile và server kiểm thử đã tắt scheduler/mail thật.
- **Để áp dụng:** Stop/Run Backend IDE để nạp code/migration, tải lại React. Không cần reset CSDL/tạo lại tài khoản.

## 4. Kiểm chứng đã thực hiện

### Backend — 116 test riêng biệt đạt qua các lượt theo phạm vi

| Nhóm | Số test đạt |
|---|---:|
| Hồ sơ quyền cho thuê và PDF | 15 |
| Nhắc hạn/email outbox | 10 |
| Spring Scheduler thực sự kích hoạt | 1 |
| Hồ sơ/Admin review hồi quy | 10 |
| Tạo tài sản Owner hồi quy | 7 |
| Hợp đồng nháp/căn cước/thời hạn | 18 |
| Discovery/yêu cầu thuê | 25 |
| Import tài sản Auth0 | 14 |
| Nâng cấp Owner từ nguồn | 10 |
| Adapter tài sản Auth0 | 6 |
| **Tổng** | **116** |

Bằng chứng: `target/rights-final-backend-tests.log`111PASS; `rights-lock-regression.log`56PASS; `rights-final-safety-tests.log`25PASS; `rights-contract-final-tests.log`18PASS; `rights-scheduler-test.log`1PASS. Các lượt trùng test không cộng lặp. Scheduler test dùng service giả lập và tự đóng context; outbox dùng SMTP giả lập, không gửi mail thật.

### Frontend và trình duyệt

- TypeScript/lint đạt;44unit test đạt; production build đạt. Vite vẫn có cảnh báo native config và bundle lớn đã có trước.
- **23 kịch bản Playwright riêng biệt đạt**:2 luồng SQL thật (ủy quyền/thuê lại),6 nhánh UI lỗi/validation,1 hợp đồng giới hạn thời hạn,6 hồi quy nâng cấp Owner,8 hồi quy import Auth0. Lượt20PASS/23.7s và lượt cuối9PASS/24.8s có6 ca trùng, không cộng lặp.
- Desktop1440/mobile390, kiểm tra thao tác chính, reload, không tràn ngang/page errors/unexpected network-console errors. Chỉ phân loại riêng favicon404 có sẵn và các lỗi API cố ý trong từng test. Đã xem PNG hồ sơ thuê lại mobile.
- Hai luồng SQL thật đăng ký account thử mới, cấp evidence VNeID có kiểm soát trong fixture, upload PDF thật, Admin duyệt, nhận Owner và công khai; fixture không phải đăng nhập Auth0 thật hoặc xác minh pháp lý. Mỗi lượt cleanup xác nhận0account/0property, manifest còn0; không sửa fixture/tài khoản dùng chung.
- Một lần rerun gặp locator `role=status` trùng giữa thông báo thành công và trạng thái tải Admin; đã sửa selector theo đúng thông báo, lượt cuối9 đạt. Không sửa code nghiệp vụ để chiều test.
- Context7 đối chiếu PDFBox3.0.8/React19.3, Spring docs7.0.5 gần bản cài7.0.9/Boot4.1.1. Playwright MCP đã mở trang, CLI thực thi các suite.

## 5. Giới hạn được giữ rõ

- Auth0 là VNeID mô phỏng; không kết nối CSDL dân cư/đất đai thật, OCR, kiểm tra công chứng tự động hoặc quét antivirus.
- SMTP adapter/outbox được kiểm thử bằng transport giả lập; chưa gửi/đọc email nhắc hạn thật. Email từ Auth0 không tự thành emailVerified. Tài khoản external-only vẫn theo giới hạn xác thực email/đổi mật khẩu hiện có; thông báo trong app luôn là kênh chính.
- SMTP đã nhận mail rồi process crash trước DB ack có thể gây gửi lại. Không cam kết exactly-once/inbox delivery. Không tích hợp SMS hoặc push provider.
- Không triển khai ký số, kích hoạt/thanh toán, hủy hợp đồng hiện hành hoặc workflow gia hạn hợp đồng mới; chặn khoảng thời gian áp dụng trên create/update bản nháp hiện có và có thể dùng lại cho workflow sau.
- Giấy tờ/snapshot cũ và fixtures được giữ nguyên; không tự suy ra ngày hết hạn cho dữ liệu cũ. Hồ sơ mới/gia hạn phải đủ ngày và được Admin xác nhận.
- Chưa có dedicated race test cho duyệt quyền đồng thời với tạo hợp đồng; có account/property/dossier locks, version checks và test chống stale theo phạm vi hiện có. Không gọi đây là kiểm chứng production concurrency đầy đủ.
- Chặn nhận khách là điều kiện hiệu lực, không đổi availability/approval để tránh phá lịch sử. Direct detail giữ đọc lịch sử với thông báo hết quyền.
- Auto-review từng từ chối phương án xóa rồi tạo lại service upload; đã sửa tại chỗ an toàn và hoàn thành toàn bộ chức năng, không có bước nào còn bị chặn bởi sự từ chối này.

## 6. Commit và tài liệu bàn giao

| Commit | Đầu việc |
|---|---|
| `1f92f55` | Backend hồ sơ quyền cho thuê, PDF, thời hạn và nhắc hạn |
| `a758dc1` | Khôi phục lượt gửi outbox và kiểm tra PDF bổ sung |
| `42ba261` | Căn cước xác thực trong hợp đồng và khóa quyền trước snapshot |
| `b068824` | Giao diện, điều hướng, form hồ sơ, nhãn/thời hạn và browser fixtures/tests |
| `949bcdc` | Kiểm chứng Spring Scheduler và khởi động nhắc hạn sau1phút |

Chỉ commit local, không push. API chi tiết: `docs/api/property-rights.openapi.json`, cập nhật `property-dossiers.openapi.json`, `contract-drafts.openapi.json`; ADR `docs/decisions/property-rights-onboarding-v1.md`. Root API/plan/project/AGENTS/WORK_PROGRESS được đồng bộ; RDS template và diagrams giữ nguyên, các mô tả cũ về Owner-only/image-only được ghi nhận bằng override mới.

Máy chủ kiểm thử riêng Backend8082/Vite3002 được dừng trước bàn giao; server người dùng8080/3000 và SQL Server được giữ nguyên.
