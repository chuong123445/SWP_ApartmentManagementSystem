# Tài khoản nhiều vai trò — 03/11/2026

## Kết quả

Follow-up được người dùng duyệt: mô hình cuối có `auth_accounts`, danh mục `auth_roles(id,code,name)` và `auth_account_roles(account_id,role_id)` với composite PK và 2 FK. V52 chuyển đúng membership V50 đã có sang ID; JPA ManyToMany dùng role chung bất biến, không cascade tạo/xóa danh mục. Chưa thêm TENANT; quyết định đó để sau. Xem [sơ đồ và cấu trúc ba bảng](../database/account-role-catalog.md).

Nhánh độc lập `feat/account-multiple-roles` từ `origin/main d422930`; không đưa pending database-readiness/payment rename V46–49, thay đổi VNeID chưa commit hoặc fixture cleanup khác vào PR này. Backend/migration `a688a80`; giao diện `9935ade`. Chỉ chuẩn bị để review/deploy, chưa merge hay áp V50 trên database ứng dụng.

- V50 backfill membership ban đầu; V52 thêm `auth_roles` và chuẩn hóa `auth_account_roles(account_id,role_id)` với composite PK/2FK. Chuyển vai trò hiện có: CUSTOMER → CUSTOMER; OWNER → OWNER+CUSTOMER; ADMIN → ADMIN. Giữ cột `auth_accounts.role` làm projection tương thích, không dùng để cấp quyền.
- Đăng nhập/refresh/profile/me trả đầy đủ roles; JWT có roles nhưng phân quyền vẫn đọc account/session/membership hiện tại từ DB. Claim giả hoặc token trước khi mất quyền không vượt qua kiểm tra hiện tại. PENDING/LOCKED/INACTIVE, CSRF, rotation/reuse và contact/identity gates giữ nguyên.
- Chuyển các kiểm tra/query role đơn sang membership, gồm public catalog/address filters, Property onboarding/duyệt/import, contract, notification, bootstrap và tài chính. Quyền từng object vẫn dựa exact owner/customer, không dựa role toàn cục.
- Chỉ luồng tài sản hợp lệ đã có mới thêm OWNER; không mất CUSTOMER, không có API tự cấp role hoặc Admin, không có TENANT enum. Owner tự gửi yêu cầu thuê căn của mình vẫn bị chặn.
- Menu có không gian Tìm thuê căn hộ / Quản lý cho thuê theo quyền thật, Admin có route riêng. Không gửi command đổi role khi chuyển không gian. Không phụ thuộc thứ tự roles; Tenant label lấy từ ACTIVE contract. Người có role Owner nhưng là bên thuê của hợp đồng được điều hướng về hợp đồng của mình.

## Kiểm tra thực tế

SQL integration chạy trên database riêng `ancu_account_roles_20261103`, không dùng proptech_db. Các bộ có giao nhau; kết quả cuối của từng lớp:

| Lớp kiểm thử | PASS |
|---|---:|
| AuthIntegrationTests | 13 |
| RegistrationIntegrationTests | 9 |
| AccountIntegrationTests | 10 |
| VneidIntegrationTests | 18 |
| DiscoveryRentalIntegrationTests | 28 |
| ContractDraftIntegrationTests | 41 |
| PropertyDossierIntegrationTests | 15 |
| PropertyRightsOnboardingIntegrationTests | 15 |
| VneidPropertyImportIntegrationTests | 26 |
| BillingIntegrationTests | 16 |
| SepayIntegrationTests | 20 |
| MaintenanceIntegrationTests | 2 |
| CashEntryIntegrationTests | 4 |
| **Tổng số test riêng biệt sau follow-up catalog** | **217** |

Lượt đầu 89 test có 2 assertion đọc nguyên mảng JSON không tương thích harness dù response đúng; đổi thành length/index, Auth11 chạy lại PASS. Lượt mở rộng119 có3 lỗi cleanup fixture xóa parent account trước membership mới; sửa các cleanup chính xác scope test, giữ FK, chạy lại Billing16+Sepay20+Vneid18=54 PASS (2m02s). Không bỏ/hạ assertion bảo mật hoặc tắt constraint để đạt PASS; không gọi toàn bộ các lượt lỗi là PASS.

Follow-up catalog chạy lại 91 test PASS; bộ mở rộng139 có1 ca import tìm theo tên mẫu chung nên thấy2 căn từ lần test trước ngoài căn hiện tại (3 ID khác nhau). Đổi fixture thành tên có assetId duy nhất, giữ kỳ vọng1 và không xóa dữ liệu; chạy lại Auth13+Import26=39 PASS. Kết quả cuối217 test riêng biệt trong bảng trên, không cộng các lượt chạy trùng thành số test mới.

`tools/verify-account-roles.ps1` PASS trên SQL Server17.0.1000.7 với DB tổng hợp `ancu_roles_migration_20261103191736`: backfill, replay, không cấp lại role đã gỡ từ legacy projection, FK trusted, PK/CHECK chặn duplicate/orphan/TENANT, dữ liệu account/contract không đổi, writer cũ thiếu membership làm migration dừng. Parser PowerShell toàn bộ helpers PASS; fixture scripts ngoài các integration test chỉ kiểm tra cấu trúc/cách scope, chưa chạy đầy đủ qua UI.

Kiểm tra V52 hiện tại dùng lại `ancu_account_roles_20261103`: compare membership theo code/account-contract fingerprint trước/sau upgrade/replay PASS, đủ2FK trusted và một UNIQUE code, PK/FK/CHECK chặn dữ liệu sai. Nhánh khởi tạo membership mới V50→52 được thử bằng rename tạm trong transaction rồi rollback về đúng membership gốc; không tạo/reset database nào. Helper cũ nay chuyển sang `verify-role-catalog.ps1`, chỉ nhận DB kiểm thử đã tồn tại. Auth13 kiểm tra catalog dùng chung và migration không cấp lại quyền từ projection cũ.

Frontend: 103/103 unit PASS, TypeScript noEmit PASS, native-config Vite8.3.4 build PASS (cảnh báo bundle lớn có sẵn). Node test worker thường bị spawn EPERM; dùng Node native transform-types + alias loader và `--test-isolation=none`, không thêm dependency. Chưa dùng kết quả đó để khẳng định CLI Playwright suite PASS.

UI/API response roles không thay đổi trong follow-up catalog, nên không sửa source frontend hoặc chạy lại các kiểm tra frontend/Playwright trên; đây là bằng chứng checkpoint UI trước, không phải lượt chạy mới.

Playwright MCP chạy cùng 12 callback trong `e2e/account-roles.spec.ts`: 1440px/390px × dual/reverse-order/tenant/customer/admin/revoked. Tất cả PASS, không console/page/API error, không tràn ngang, không có command server ngoài refresh fixture. Mock API và PDF trống hợp lệ chỉ để kiểm tra navigation/party, không tuyên bố nghiệm thu ký số/provider/PDF content. Ảnh menu mobile được xem trực quan: hai workspace và Owner+Tenant vừa khung. Các lượt chuẩn bị fixture ban đầu thiếu ảnh/PDF hoặc trả [] thay vì PageResponse đã sửa trước lượt PASS đầy đủ.

## Triển khai và giới hạn

1. Backup và xác nhận phiên bản backend/frontend cùng thay đổi này; dừng writer backend cũ.
2. Chạy/start backend mới có V50 rồi V52. V50 backfill lần đầu, V52 chuyển sang role_id, sau đó không replay grant từ cột role cũ. Nếu bảng membership đã bị tạo trước hoặc có account thiếu role, điều tra và migration rõ ràng, không auto-promote.
3. Deploy frontend mới, refresh/đăng nhập lại để UI nhận mảng roles. Token đang tồn tại vẫn được kiểm tra quyền theo DB.

Không drop cột role cũ trong PR này. Không gọi provider thật, không sửa trạng thái xác minh, không reset tài khoản/fixture, không phục hồi 3 archive đã xóa, không đổi `legacy_tenants_archive`, không restart server của người dùng. Tenant vẫn là account + exact rental contract; thêm/đóng hợp đồng không biến đổi role tài khoản.

Không có màn hình quản trị role tổng quát, Admin tự đăng ký, hoặc cơ chế thu hồi Owner sau khi mất mọi tài sản trong phạm vi này. Cần quy tắc riêng nếu triển khai các chức năng đó. Bộ unit/integration ở trên kiểm chứng source trong test DB; chưa nghiệm thu tài khoản/provider/ứng dụng IDE đang chạy ở môi trường người dùng.

Context7 đối chiếu Spring Security7.1.1 đúng dependency, Hibernate7.4.5.Final (tài liệu không pin đúng patch), React19 (tài liệu hiện hành, không pin19.0.1) và SQL Server17. API/query được xác nhận bằng compile + SQL tests. [ADR](../decisions/account-multiple-roles-v1.md), [Profile OpenAPI](../api/account.openapi.json), [Owner context OpenAPI](../api/owner-upgrade.openapi.json).
