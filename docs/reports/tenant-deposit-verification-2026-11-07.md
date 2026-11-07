# FIX-02 — Cọc và nhãn xác thực trong bảng Khách thuê

Ngày 07/11/2026; nhánh `fix/tenant-deposit-verification`, từ `b600d50` (FIX-01). Người dùng đã yêu cầu triển khai sau khi làm rõ cọc thỏa thuận/thực thu và các nhãn viết cố định.

## Hành vi sau thay đổi

- Một dòng tương ứng một hợp đồng ACTIVE, key theo contract ID; account ID vẫn giữ để không làm sai quan hệ tài khoản. Một tài khoản thuê hai phòng không bị trùng key hoặc lấy nhầm quan hệ phòng. Tổng ghi riêng số hợp đồng và số tài khoản, không gọi số hợp đồng là số cư dân.
- Cọc theo hợp đồng lấy từ `contract_drafts.deposit` của đúng contract, không từ mức cọc đang quảng cáo của phòng. Số 0 thật được hiển thị 0; thiếu điều khoản hợp đồng cũ được hiển thị “Chưa có dữ liệu”. Chuỗi tiền được giữ cho hiển thị chính xác qua `billingMoney`.
- Cột cọc thực thu ghi “Chưa có dữ liệu thực thu”: hiện chưa có ledger cọc liên kết hợp đồng, không suy tiền đã nhận từ cọc thỏa thuận hoặc sổ quỹ thủ công.
- Bỏ nhãn cố định chip khớp 99.8%, VNPT SmartCA và Tiền cọc Escrow trong bảng. Bỏ form thêm/eKYC cục bộ chưa có quy trình backend, không tự gán eKYC/chứng thư cho người thuê.
- Xác thực email lấy `emailVerified` của tài khoản. Định danh dùng bằng chứng được `VerifiedIdentityPolicy` chấp nhận, không dùng `identityVerified` summary. Nguồn Auth0 mô phỏng và local demo có nhãn tương ứng; không nhận là đọc chip/VNeID chính phủ thật.
- Ký trong ứng dụng lấy timestamp đã lưu của đúng hợp đồng: chưa ký, một bên đã ký, hai bên đã ký. Thiếu authoring data là NO_DATA, không suy ra hai bên đã ký chỉ vì contract ACTIVE. Hợp đồng fixture được ghi “Hợp đồng dữ liệu mẫu”. Không khẳng định chứng thư ký số của nhà cung cấp.
- Có tìm kiếm tên/email/tài sản/phòng, bộ lọc tài sản hiện có, tải lại và trạng thái loading/lỗi/rỗng. Dữ liệu lỗi không hiển thị thành 0 khách hoặc bảng thành công cũ. Mobile cuộn ngang trong bảng, không tràn ngang toàn trang.

Phạm vi là bảng Owner Khách thuê và adapter/quan hệ phòng trực tiếp bị ảnh hưởng. Không mở rộng thành dự án dọn mọi màn hình prototype cũ. Các nhãn/cọc ở màn hình legacy khác cần review riêng khi thực hiện backlog liên quan.

## Backend và quyền

`GET /api/v1/owner/tenancies` và `/api/v1/me/tenancies` giữ nguyên quyền Owner/exact Self, thêm no-store và các trường đọc: `contractDeposit`, `customerEmailVerified`, `customerIdentityStatus`, `customerIdentitySource`, `inAppSigningStatus`, `localFixture`.

`TenancyService` lấy contract theo scope trước, sau đó projection `TenancyTerms` chỉ đọc cọc/timestamp cho các contract ID đó. Query không tải toàn bộ snapshot/chữ ký ảnh. Cache nguồn định danh trong mỗi lượt đọc theo account để một tài khoản nhiều hợp đồng không bị tra lại bằng chứng. Response không thêm số CCCD, ảnh, legal name/address từ provider, subject, snapshot, signature bytes hay token.

Không sửa schema, source evidence, trạng thái xác minh, chữ ký, hợp đồng, số tiền hoặc DB ứng dụng. Không triển khai thu cọc/hoàn cọc, ngân hàng hoặc provider ký số. Bản ghi lịch sử/fixture cũ giữ nguyên.

Index chính: backend `dto/contract/TenancyResponse`, `TenancyTerms`; `repository/contract/ContractDraftRepository`; `service/contract/TenancyService`; `controller/contract/TenancyController`; frontend `types/billing`, `types/models`, `services/billing/billingService`, `pages/owner/TenantsPage`, `pages/owner/RoomsPage`, `hooks/useRentalWorkspace`, `routes/WorkspaceRoutes`, `components/navigation/Sidebar`; tests `TenancySummaryIntegrationTests` và `tests/billing.test.ts`. Schema đọc cập nhật tại `docs/api/billing.openapi.json`; API_DOCUMENT ở thư mục DTD được cập nhật riêng.

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| SQL Server `BillingIntegrationTests` | 18 PASS, 0 fail/error/skip |
| SQL Server `ContractDraftIntegrationTests` | 46 PASS, 0 fail/error/skip |
| SQL Server `TenancySummaryIntegrationTests` mới | 2 PASS sau sửa fixture test, 0 fail/error/skip; tổng 66 bài backend khác nhau đạt qua các lượt |
| Frontend Node tests | 114 PASS, 0 fail, gồm 2 regression mới về nhiều phòng/cọc và legacy thiếu trường |
| TypeScript | PASS `tsc --noEmit` |
| Vite production build | PASS; còn cảnh báo chunk >500 kB |
| Playwright MCP 1440/390 px | Cả hai PASS; không lỗi JS/console bất ngờ, request thất bại bất ngờ hoặc tràn ngang trang; đã xem ảnh desktop, mobile và cuộn tới cột cọc |
| OpenAPI JSON parse, Git diff whitespace | PASS |

Backend chạy trên database test có sẵn `ancu_settlement_test_20261103`, transaction rollback. Ca mới kiểm tra cùng tenant ba contract với cọc khác nhau/0/thiếu, nguồn giá không lấy quảng cáo phòng, Owner/Self isolation/role gate, no-store, không lộ chứng từ/ảnh/subject, email độc lập với định danh, summary flag không thay bằng chứng và trạng thái ký không suy từ ACTIVE.

Lượt đầu có 65/66 bài đạt; một bài test mới cố ghi verification_status NOT_VERIFIED vào bảng evidence chỉ cho phép VERIFIED, bị CHECK constraint từ chối. Sửa test bằng xóa evidence do chính test tạo trong transaction rollback để mô phỏng không còn bằng chứng, giữ nguyên ràng buộc/schema ứng dụng; chạy lại cả 2 bài mới đạt. Hai suite 18+46 không sửa và đã đạt ở lượt đầu. Không che lỗi test hoặc nới constraint để ép đạt.

Browser dùng API fixtures: 4 hợp đồng ACTIVE/3 tài khoản, 1 ENDED bị loại, cùng tài khoản hai phòng, cọc 5.000.000,25/0/null, chưa có thực thu, xác thực email độc lập Auth0 mô phỏng, local fixture, ký riêng theo hợp đồng, tìm kiếm, lọc tài sản, lỗi tải và trang rỗng; không phát sinh business writes. Harness ban đầu dùng locator alert quá rộng vì workspace và trang cùng có alert; đã chọn đúng phần tử và chạy lại cả hai kích thước.

Giới hạn: chưa kiểm tra UI nối backend/DB ứng dụng thật hoặc provider thật; không gọi fixture là bằng chứng xác minh bên ngoài. API list tenancy hiện vẫn trả toàn bộ theo scope như trước, chưa thêm pagination. Test runner native TypeScript/alias loader và Vite native config runner được dùng như FIX-01 do giới hạn child process của môi trường; không thêm dependency dự án.

Bằng chứng local ngoài Git: `tmp/tenant-summary-backend-20261107.log`, `tmp/tenant-summary-backend-rerun-20261107.log`, `tmp/tenant-summary-fe-tests.log`, `tmp/tenant-summary-build.log`, `tmp/tenant-summary-20261107-browser.js`, `tmp/tenant-summary-{1440,390}.png`, `tmp/tenant-summary-390-deposit.png`; Surefire reports trong backend target. Context7 đối chiếu Spring Data JPA constructor projection bản 4.1.0 cùng dòng dự án Boot4.1.1/Data BOM2026.0.1 (JPA4.1.1); chức năng được chạy lại trên dependencies thật của dự án.

## Bàn giao

FIX-02 hoàn thành phạm vi trên. Cần restart backend và tải lại frontend của nhánh để nhận trường tenancy mới; backend cũ trả thiếu trường sẽ hiện chưa có dữ liệu thay vì gán verified/cọc 0. Vite kiểm tra riêng được dừng; không restart/dừng server người dùng. Chưa push/PR. Theo tracker, tiếp theo là FIX-03 về bộ đếm nợ/sắp hết hạn; AI mới vẫn thực hiện sau phần chính.
