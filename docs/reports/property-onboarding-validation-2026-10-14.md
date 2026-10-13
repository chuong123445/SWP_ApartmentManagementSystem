# Nghiệm thu luồng tài sản và kiểm tra lại bảng tổng kết — 14/10/2026

Phạm vi: đăng ký/xác thực Owner → quản lý → tài sản một/nhiều căn nháp → hồ sơ riêng tư → Admin kiểm duyệt → Owner công khai/ẩn căn; bộ chọn tài sản và các màn hình đã nối API. Đây là nghiệm thu phần được yêu cầu, không chứng nhận mọi task T01–T30 hoặc các màn hình prototype là tích hợp thật.

## Kết quả chạy thực tế

| Bộ kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| 12 test classes đang tồn tại trong source backend | **86/86 PASS**, 0 fail/error/skip | Maven BUILD SUCCESS, 14/10 00:00:30 UTC+7; ignored `target/property-full-audit-tests.log` và Surefire reports |
| Backend tích hợp SQL Server | **79 PASS** trong 86 trên | Auth8, Account10, Registration9, OwnerApartment5, DiscoveryRental22, OwnerProperty7, PropertyDossier9, Billing9 |
| Backend unit/bootstrap/SMTP/context | **7 PASS** trong 86 trên | LocalAdmin3, LocalData2, SMTP loopback1, context1; không Gmail inbox |
| Frontend unit | **32/32 PASS** | `npm test`, 14/10 |
| TypeScript và production build cuối | **PASS** | `npm run lint`, `npm run build`, working tree cuối; warnings Vite __dirname và bundle>500KB có từ trước |
| Playwright Edge | **9 workflow riêng biệt PASS** qua các lượt | Auth2, navigation2, Home1, OwnerImages1, Settings/pending Customer1, property-filter1, full property/dossier1 |
| OpenAPI JSON/internal references | **PASS** | inventory30, dossier47, billing45, discovery/rental52 references |
| SQL cleanup và preservation check | **PASS** | 0 property test accounts/properties/dossiers/evidence metadata/bytes; 12 apartments, 2 contracts, 3 invoices hiện hữu; Customer canonical vẫn pending/version1/ba flags false |

Không cộng báo cáo/class audit đã bị xóa khỏi source vào tổng86. Không xóa toàn bộ target bằng clean vì có các snapshot/evidence cần giữ; Maven chọn chính xác tất cả test classes hiện tại qua `rg --files src/test/java -g '*Tests.java'`.

## Đối chiếu từng phần trong tổng kết

| Phần | Trạng thái | Đã kiểm tra |
|---|---|---|
| Owner đăng ký và bị hạn chế trước xác thực | **PASS** | SQL registration/role/CSRF/pending tests; browser đăng ký thật, vào /app thấy gate |
| OTP server và đi tới quản lý sau xác minh | **PASS core/UI**, **Gmail inbox NOT_RUN** | SQL test-mail adapter tiêu thụ OTP/kích hoạt/revoke sessions thật; browser mô phỏng transport OTP, kiểm tra returnTo/app và đăng nhập lại. Không debug/local OTP endpoint |
| Chưa có tài sản → CTA thêm tài sản | **PASS** | Browser Owner mới chưa có Property, selector disabled, CTA đúng |
| Một căn/nhà nguyên căn | **PASS** | Atomic Property DRAFT +1 Apartment DRAFT/VACANT; ngăn thêm căn thứ hai qua API và form |
| Tài sản nhiều căn/phòng | **PASS** | Tạo nhiều căn cùng transaction; duplicate/invalid/null/forged DTO400, private drafts, null readings được giữ; có thể thêm căn sau |
| Bộ chọn dùng dữ liệu thật | **PASS** | Không bld-1/2/3; option UUID thuộc Owner; switch/mobile/reload; dữ liệu shared giữ nguyên |
| Lọc căn/khách thuê/hợp đồng | **PASS** | Read-only browser đối chiếu số row với apartments và contract relationships từng Property có dữ liệu thật |
| Lọc yêu cầu và hóa đơn | **PASS** | Backend lọc trước count/page, ownership luôn bắt buộc; browser đối chiếu rows, UUID, invoice choices, quay lại all/reload |
| Upload và tải chứng từ riêng tư | **PASS** | Genuine PNG/JPEG decode/re-encode, kích thước/invalid SVG/empty/oversize; guest/other Owner/customer access gates; Admin chỉ xem file đã gửi trong dossier; no-store/nosniff/attachment; public DTO không chứa bank/files |
| Gửi hồ sơ và khóa pending | **PASS** | Current propertyVersion, own/purpose refs, strict fields/enum/integer version, duplicate submission/upload khi pending bị chặn |
| Admin yêu cầu bổ sung, Owner gửi lại | **PASS** | Browser API thật; reason và submission cũ giữ nguyên, resubmit snapshot mới; stale/old review bị chặn |
| Admin phê duyệt/từ chối | **PASS** | ACTIVE ADMIN only, per-property, reason nonapproval, persisted reviewer/time/version; browser chạy đủ ba quyết định |
| Hai quyết định Admin đồng thời | **PASS** | Full isolated E2E cuối17.3s: UI REJECT và HTTP REJECT cùng version → đúng [200,409]; UI detail về REJECTED, không duplicate decision |
| Công khai/ẩn căn sau duyệt | **PASS** | Approval không auto-publish; Owner publication/version/ownership gate; giữ availability; public detail200 sau publish/404 sau hide; tài sản khác chưa duyệt không public |
| Legacy Property pending nhưng chưa có hồ sơ | **PASS** | SQL9 và browser prepare-legacy trên UUID test riêng; upload/submit đầu tiên được phép, không reset asset/căn/status/version/history; pending có dossier thì vẫn khóa |
| Home city/giá/bedrooms/địa chỉ/ward | **PASS** | Read-only Home4.9s, dữ liệu thiếu city/ward có fallback/option rỗng; full isolated workflow kiểm tra ward cascade dương tính trên căn test được duyệt/publish thật; mobile390 |
| Auth/account/discovery/rental/billing regression | **PASS phạm vi đã có** | Full server86 + frontend32; browser auth/navigation/settings/images/Home chỉ đọc dữ liệu. Billing concurrent create201/409/send200/200+unique notification chạy SQL với fixture mới |
| Admin local provisioning | **PASS code/unit**, opt-in chưa tạo tài khoản thật | Local profile/env only; không promote Owner/Customer, không reset Admin/hash/status/history, không fake email verification. E2E Admin là fixture cách ly, đã xóa |
| Prototype finance/reports/maintenance/TrustGuard | **Chỉ smoke render** | Owner shell mở các tab không crash; không chứng nhận API/integration hay property filtering của dữ liệu mock |

## Lỗi phát hiện và xử lý

1. **Lỗi thật:** khi xóa auth state sau OTP, BrowserRouter8.4 navigation chạy transition còn auth update urgent, RequireAccount ghi đè returnTo bằng route email cũ. Sửa bằng cùng `startTransition` cho auth clear + navigation. Test kiểm tra history returnTo/app và Owner đi vào CTA quản lý sau login; không lưu JWT/password vào storage.
2. **Lỗi tương thích dữ liệu thật:** tài sản import cũ PENDING_APPROVAL nhưng chưa có dossier bị khóa không gửi chứng từ được. Thêm điều kiện pending-without-any-dossier, giữ toàn bộ dữ liệu; SQL + browser đạt.
3. **Kỳ vọng test Home cũ:** ghi cứng TP.ĐàNẵng và ward có sẵn, không còn đúng sau VACANT-only catalog/selection. Test đối chiếu tên canonical/fallback với query và kiểm tra option rỗng khi không có ward; trường hợp ward có dữ liệu được chạy riêng trong fresh workflow. Không sửa/reset catalog để ép test xanh.
4. Các lượt E2E sớm có lỗi test accountStatus/inline gate/heading, PNG fixture sai CRC và selector status trùng loading/notice; sửa harness, guarded cleanup thành công. Chỉ các lượt cuối PASS được dùng nghiệm thu.

## Cách chạy lại và giới hạn

Backend: lấy tất cả source test class names bằng rg rồi `mvn test -Dtest=<names>`. Frontend: `npm run lint`, `npm test`, `npm run build`. Với backend test8082/Vite3002 chạy `E2E_BASE_URL=http://localhost:3002 npx playwright test e2e/property-onboarding.spec.ts e2e/property-filter-regression.spec.ts`; regression đã chạy auth/navigation/Home/images/settings read-only. Test backend tắt seed/billing/Admin provisioning/mail thật. Không chạy mù các E2E cũ billing/rental/credential-mutating trên canonical fixtures.

Full workflow dùng Owner/Admin UUID và tên/email test riêng, local helper có guards, refuse unrelated contracts/requests/reviewers rồi cleanup đúng rows. Simulated OTP transport chỉ kiểm tra UI; real server OTP được test bằng test delivery adapter. Gmail inbox/application confirmation thật chưa được quan sát; không ghi PASS cho live Gmail.

Chứng từ bản đầu chỉ PNG/JPEG≤5MB/20M pixels; hồ sơ≤20 ảnh; tổng200 uploads/property. Chưa PDF/Office/SVG/external antivirus/retention/deletion/approval revocation/approved-property editing/general apartment edit-delete/full Admin account management. Provider thanh toán/ký số, SMS và các business gates ngoài scope vẫn chưa có. RDS/diagrams/UC IDs giữ nguyên.

Các commit triển khai: `65a97aa`, `f5bb658`, `d833456`, `1f748f6`, `95a3ccc`; không push. Root WORK_PROGRESS/AGENTS/plan/API/ADR đồng bộ ngoài Git. Test servers8082 PID24592 và3002 PID29536 đã dừng sau kiểm tra command line, 0 dedicated listeners; không dừng SQL/app người dùng. `.env.local` và credentials thật không sửa. Canonical Customer vẫn pending; số invoices hiện tại3 được ghi theo SQL thực tế, không suy ra từ handoff cũ ghi2 và không xóa để ép khớp.
