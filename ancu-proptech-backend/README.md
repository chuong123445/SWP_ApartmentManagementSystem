# An Cư PropTech backend

Backend Java 21/Spring Boot, SQL Server, React REST client. Tổ chức **layer → domain** trong `src/main/java/com/ancu/proptech`:

```text
controller/
  auth/         AuthController
  apartment/    ApartmentController, OwnerApartmentController
  property/     OwnerPropertyController
  rental/       RentalRequestController
  escrow/       EscrowController
service/
  auth/         AuthService
  apartment/    ApartmentService, OwnerApartmentService
  property/     OwnerPropertyService
  rental/       RentalRequestService
  escrow/       EscrowService
  billing/      VietQRService
repository/
  auth/         AuthAccountRepository, AuthSessionRepository, RefreshCredentialRepository
  apartment/    ApartmentRepository
  property/     PropertyRepository
  rental/       RentalRequestRepository
  escrow/       EscrowRepository
model/
  auth/         AuthAccount, AuthSession, RefreshCredential, legacy UserRole
  apartment/    Apartment
  property/     Property
  rental/       RentalRequest
  escrow/       EscrowDeposit, EscrowStatus
  tenant/       Tenant
  billing/      Invoice
dto/auth/       LoginRequest, AuthUserResponse, TokenResponse
exception/auth/ AuthException, AuthErrorHandler
config/auth/    SecurityConfig
config/bootstrap/ LocalDataInitializer
service/bootstrap/ LocalDataService
```

Luồng request: Controller → Service → Repository → SQL Server. Controller giữ HTTP/validation/response; Service giữ nghiệp vụ và transaction; Repository truy vấn dữ liệu. Entity không chứa xử lý HTTP. Config quản lý security/bootstrap. Các domain chưa có API không được tạo Controller/Service/Repository rỗng.

API auth `/api/v1/auth/*`, `/api/v1/me`, catalog/rental và legacy `/api/trustguard/escrow` đang dùng. Đã bỏ `/api/rooms` và Room entity/repository/service/controller. Owner quản lý qua `/api/v1/owner/apartments` (GET/POST), `/api/v1/owner/properties` (GET), cùng Apartment UUID với Home và yêu cầu thuê. Owner được xác định từ JWT; Property phải thuộc Owner khi tạo. Legacy Escrow vẫn cần DTO và isolation từng Owner trong task riêng.

Chạy local: `tools/start-local.ps1` nạp file ignored `.env.local`; tài khoản local là fixture phát triển. Production cần env DB/JWT và HTTPS. Test: `mvn clean test` với SQL Server; fixtures API rollback. Test packages tương ứng controller/auth, controller/apartment, controller/rental và service/bootstrap. Sau khi đổi package cần clean build để loại class cũ.

### Chạy từ terminal hoặc IDE

Account/SMTP mới thêm `spring-boot-starter-mail`: Reload Maven project trong IDE trước Run nếu IDE chưa tự nạp dependency. V6 bổ sung private profile/per-channel verified fields/email challenges. Gmail host/port/user/from đã cấu hình local; MAIL_PASSWORD phải là App Password riêng, không password Google thông thường. Xem docs/setup/gmail-otp.md ngoài module. Thiếu cấu hình thì OTP trả503, không fallback code local; các chức năng khác vẫn khởi động.

Registration: POST `/api/v1/auth/register` + CSRF, fields email/password/fullName/optional phone/requestedRole OWNER hoặc CUSTOMER. Trả201 pending/unverified User, không token; login để gửi/confirm Self email OTP. SMTP thất bại không xóa tài khoản đã tạo; dùng login và gửi lại. Chặn ADMIN/TENANT/readonly fields/numeric role, email trùng409. Không tự duyệt Property. RegistrationIntegrationTests gồm8 trường hợp, mock mail chỉ dùng trong test.

Ảnh căn hộ local: file ở `src/main/resources/static/apartment/images`, URL public GET/HEAD `/apartment/images/{filename}`. Cột `rental_apartments.cover_image_path` lưu URL tương đối này; list/detail dùng cùng ảnh. Đã cập nhật12căn hộ hiện có theo5file lần lượt bằng `tools/sql/replace-apartment-images.sql`; giữ nguyên các tên `department2.jpg`/`department5.webp`. Script này là cập nhật dữ liệu một lần theo yêu cầu, không chạy khi startup và không tự ghi đè ảnh mới. Snapshot đường dẫn/version cũ lưu riêng trong ignored `target/apartment-images-before-*.csv`; update tăng version căn hộ, không đổi quyền/giá/hợp đồng. Owner tạo căn hộ mới vẫn placeholder cho tới khi có ảnh được gán.

Chuột phải vào `ProptechApplication` → **Run** để chạy local. `spring.profiles.default=local` áp dụng khi chưa chỉ định active profile, tự nạp `application-local.properties` và file ignored `.env.local` trong thư mục backend. Working directory của IDE nên là thư mục backend chứa `pom.xml`.

Nếu muốn chạy bằng PowerShell trong thư mục backend:

```powershell
.\tools\start-local.ps1
```

Hoặc dùng Maven trực tiếp từ cùng thư mục:

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

IDE không cần thêm Program arguments hoặc Active profiles cho local. Nếu Run Configuration cũ đã đặt profile khác, xóa cấu hình đó hoặc đổi thành `local`. Không cần truyền password/JWT secret qua arguments.

Local CORS cho phép frontend tại `localhost` và `127.0.0.1` trên các cổng **3000, 3001, 3002** (Vite có thể tăng cổng khi cổng trước đang bận). Có thể ghi đè bằng `APP_ALLOWED_ORIGINS`, danh sách origin đầy đủ phân cách bằng dấu phẩy. Nếu gặp `403 Invalid CORS request`, đối chiếu URL frontend với danh sách này. Sau khi sửa properties, Stop rồi Run lại backend trong IDE.

Khi triển khai, chỉ định `SPRING_PROFILES_ACTIVE=prod` (hoặc active profile môi trường tương ứng). Active profile chỉ định rõ thay thế default local, không chạy local initializer hoặc import `.env.local`. Cung cấp `APP_JWT_SECRET` là Base64 của ít nhất 32 random bytes. Lỗi `Set APP_JWT_SECRET or use the local profile for development` ở môi trường ngoài local có nghĩa là thiếu JWT key.

## Catalog và yêu cầu thuê

Layer/domain mới: model/property, model/apartment, model/rental; repository tương ứng; service/apartment, service/rental, service/auth/AccountAccessService; controller/apartment và controller/rental; dto/common/apartment/rental; exception/common. Public listing/detail trả DTO, lọc property approval + Owner hiện tại. Request nhận principal từ JWT, chỉ verified Customer; Owner inbox query theo ownership, không nhận ownerId từ client.

`V2__discovery_rental.sql` tạo catalog/request tables idempotent, không sửa Room legacy. `config/bootstrap/LocalDataInitializer` thay initializer Owner cũ, gọi `service/bootstrap/LocalDataService` trong profile local. Chỉ chạy khi **cả ba bảng mới đều trống**; có dữ liệu hoặc dữ liệu dở dang sẽ bỏ qua hoàn toàn. Giữ email/password/status account đã tồn tại, không xóa/reseed dữ liệu. Tạo 8 apartment, chỉ 7 published; không khởi tạo yêu cầu thuê, yêu cầu phát sinh từ Customer. Property APPROVED và account VERIFIED là fixtures local, không phải OTP/admin approval thật.

Owner local: `LOCAL_OWNER_EMAIL`, `LOCAL_OWNER_PASSWORD`. Customer local: `LOCAL_CUSTOMER_EMAIL`, `LOCAL_CUSTOMER_PASSWORD`. Đặt `APP_SEED_DATA=false` để tắt. Secrets ở file ignored `.env.local`; không ghi secret vào source/progress. Production không chạy initializer này. Accept/reject/FIFO, apartment update/delete và property review vẫn pending.

## Tenant billing (12/10/2026)

`RentalContract` liên kết Apartment và AuthAccount CUSTOMER; Tenant suy ra từ quan hệ này, không dùng bảng Tenant độc lập. `RentalInvoice` lấy giá hợp đồng và baseline/reading kỳ SENT trước, tính BigDecimal tiền thuê/điện/nước; `InvoiceNotification` được tạo cùng transaction gửi. Packages model/repository/service/controller/dto contract và billing tuân theo layer/domain. V5 schema giữ các bảng tenant/invoice cũ ở archive, không xóa dữ liệu.

Owner: GET /api/v1/owner/tenancies; GET /owner/contracts/{id}/billing-context; POST /owner/contracts/{id}/invoices; POST /owner/invoices/{id}/send; GET /owner/invoices. Customer: GET /api/v1/me/tenancies, /me/invoices; GET /invoices/{id} kiểm tra đúng bên của hóa đơn. Tất cả business endpoints dùng JWT; auth vẫn CSRF/cookie. Xem docs/api/billing.openapi.json và docs/decisions/billing-v1.md trong workspace. Kỳ tháng lẻ/sửa hóa đơn/thanh toán/provider ký số chưa hỗ trợ.

LocalBillingInitializer chạy sau initializer catalog, bổ sung hai fixture được user yêu cầu dù DB đã có dữ liệu. T.101 → tenant1@ancu.local; T.102 → tenant2@ancu.local, đều thuộc Owner local. Password ngẫu nhiên lưu ignored `.env.local` ở LOCAL_TENANT_1_PASSWORD/LOCAL_TENANT_2_PASSWORD. Không reset account, contract hoặc invoice khi restart. APP_BILLING_FIXTURES=false hoặc APP_SEED_DATA=false tắt bổ sung. ACTIVE/APPROVED/contactVerified fixtures chỉ là dữ liệu phát triển, không phải tích hợp ký số/OTP/admin review thật.

Address filters: Property có ward nullable; catalog hỗ trợ city/district/ward và /api/v1/apartments/address-options, chỉ trả tuple từ listing public eligible. Không tự gán ward cho địa chỉ cũ.

## Hợp nhất Room vào Apartment

Quan hệ ownership chuẩn: `rental_apartments.property_id → rental_properties.owner_id → auth_accounts.id`. Không cần cột owner_id trùng lặp trong Apartment. Thêm room_number/floor/deposit/meter readings/max_occupants vào Apartment để giữ thông tin quản lý.

`V3__unify_apartments.sql` đổi tên rooms/room_amenities thành legacy_rooms_archive/legacy_room_amenities_archive; dữ liệu vẫn giữ để đối chiếu, không còn entity hoặc API ghi vào chúng. `V4__import_legacy_rooms.sql` theo xác nhận người dùng chuyển P.999/P.303 cho owner@ancu.local, giữ UUID/giá/chỉ số/amenities, tạo Property PENDING_APPROVAL và Apartment DRAFT. Chạy lại không nhập trùng và không nâng approval/publication. Không công khai hoặc giả địa chỉ/pháp lý cho dữ liệu cũ.

Owner chọn Property thật khi thêm căn hộ. DRAFT mặc định; chỉ Property APPROVED được PUBLISHED, frontend và backend đều chặn. Các chỉ số chưa có giữ NULL; UI hiển thị chưa nhập và không tính công tơ từ baseline giả. Xem OpenAPI `docs/api/owner-apartments.openapi.json` ở workspace.

Public discovery filters: q/city/district/ward, inclusive minRent/maxRent and exact nonnegative bedrooms (0 = Studio), combined in SQL before pagination. Invalid numeric values/ranges return 400.

Rental requests (13/10/2026): private GET /api/v1/me/apartments/{id}/rental-requests trả own PENDING/ACCEPTED. POST /api/v1/me/rental-requests/{id}/cancel chỉ own PENDING với version; giữ CANCELLED history, không đổi availability. Submit khóa Apartment và chặn trùng PENDING/ACCEPTED; hủy/từ chối cho phép gửi lại nếu còn eligible. Không sửa/xóa legacy duplicates. Backend 12 DiscoveryRentalIntegrationTests đạt; accept/reject vẫn task riêng.

13/10/2026: public search and address options only VACANT (SQL before count/page); direct public details keep non-vacant information for history. AccountVerificationPolicy centralizes business verification; current Customer method requires emailVerified evidence. Auth roles/User/Profile, application access and activation share the policy. Registration and new local demo Customer remain pending. Owner/Tenant billing fixtures stay unchanged; explicit one-off tools/sql/unverify-local-customer.sql reset customer@ancu.local and revoked sessions, without changing password/history. Do not run this as startup migration. Full SQL suite58 passed after updating the old occupied-catalog expectation. OTP still uses real SMTP; Gmail inbox confirmation is not part of these tests.

OwnerApartment GET/list/create responses include readOnly thumbnail derived from cover_image_path, with placeholder when missing. Same persisted image as public catalog; no upload/gallery/create-image input added. OwnerApartmentIntegrationTests5 PASS.

Rental decisions rework: V7 adds nullable NVARCHAR(2000) decision_reason, no existing record/state/account reset. RentalDecision rejects numeric enums/unknown fields and requires version; optional reason is trimmed and returned as decisionReason only in scoped DTOs.21 DiscoveryRentalIntegrationTests rollback cases pass. tools/rental-e2e-fixture.ps1 is local-only test support: unique public-registered accounts + exact GUID/email/name/property guards, refuses unrelated business references; never run as startup migration. Isolated E2E finally cleanup deletes only its own fixture. For interrupted runs, ignored target/rental-e2e-fixtures/<key>.json contains only IDs; use its fields with -Mode cleanup. No OTP/signup activation backdoor endpoint is added. SMTP/API delivery is not tested by this fixture.
