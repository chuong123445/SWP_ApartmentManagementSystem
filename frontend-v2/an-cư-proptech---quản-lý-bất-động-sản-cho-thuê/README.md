# An Cư PropTech React

React 19/TypeScript/Vite. Trang quản lý Owner được giữ nguyên; đăng nhập qua Spring Boot và đăng xuất trong menu Role.

## Cấu trúc src

```text
App.tsx                   Ghép BrowserRouter, AuthProvider và AppRoutes
pages/
  auth/                   LoginPage, AccountVerificationPage
  owner/                  Dashboard, Rooms, Tenants, Contracts, Maintenance, TrustGuard, Settings, RentalRequestsPage
    billing/              InvoicesPage, UtilitiesPage
    finance/              FinancePage, ReportsPage
  resident/               ResidentPortalPage
  customer/               HomePage, ApartmentDetailPage, MyRentalRequestsPage; ApartmentListingPage preview cũ
  WorkspacePage.tsx       Ghép hooks/layout/routes và modal dùng chung
components/
  navigation/             Header, Sidebar
  rooms/                  AddRoomModal, RoomDetailModal
  billing/                CreateInvoiceModal, InvoiceDetailModal
  workspace/              WorkspaceModals
  feedback/               SessionLoading
  apartments/             ApartmentCard
  rental/                 RequestList
  common/                 Pagination
layouts/                  ManagementLayout, CustomerLayout
hooks/                    useAuth, useWorkspaceNavigation, useRentalWorkspace, useApartments, useRentalRequests
services/                 auth/, http/, apartments/, rental/
providers/                AuthProvider
contexts/                 AuthContext
routes/                   AppRoutes (auth gate), WorkspaceRoutes (tab dispatch)
types/                    auth, models, navigation, apartment, rental; index.ts export chung
data/                     mockData
utils/                    kiểm tra role hiển thị, sinh URL VietQR, format, navigation
styles/                   index.css
```

`components` giữ các phần có thể dùng ở nhiều trang; `pages` là màn hình. Layout giữ shell và vị trí modal; hooks giữ shared state để chuyển tab không làm mất dữ liệu. Services là nơi gọi API, không đặt fetch trong pages. Alias `@/` trỏ tới src, cùng cấu hình Vite/TypeScript và unit tests. Admin hiện dùng chung trang quản lý Owner; chưa có admin screens mới. Không tạo thư mục/lớp trống để làm đầy cây project.

## Chạy

1. Khởi động SQL Server và backend bằng `tools/start-local.ps1` trong thư mục backend.
2. `npm install`, `npm run dev`, mở `http://localhost:3000`.
3. Owner local được provision từ `.env.local` của backend. Không đặt mật khẩu hoặc JWT vào frontend env.

Vite proxy `/api` tới `http://localhost:8080`; đổi `API_PROXY_TARGET` nếu backend ở địa chỉ khác. Production phải có reverse proxy `/api` cùng origin và cookie Secure/HTTPS. Frontend auth không dùng Gemini; API key Gemini không cần để login/logout.

## Kiểm thử

- `npm run lint`: TypeScript.
- `npm test`: API client/auth/phòng.
- `npm run build`: production bundle.
- `npm run test:e2e`: cần backend local và Vite đang chạy, Owner fixture trong backend `.env.local`; mặc định dùng Edge headless đã cài. `E2E_BROWSER_CHANNEL`/`E2E_BASE_URL` có thể đổi khi test ở môi trường khác.

Access JWT chỉ ở bộ nhớ. Refresh cookie HttpOnly khôi phục phiên khi reload; refresh/logout đi kèm CSRF. Role trải nghiệm không cấp quyền backend. Các module ngoài phòng/auth/catalog/rental vẫn còn dữ liệu demo, xem WORK_PROGRESS ở thư mục workspace.

## Home và luồng thuê thật

Shared account pages: `/account/profile`, `/account/settings`, `pages/account`, AccountLayout/useAccountProfile/services/auth/accountService. Access cho Self kể cả pending onboarding; Profile version giữ phiên, credential/contact change logout all. Email OTP chỉ SMTP backend; disabled rõ khi chưa có provider credentials, không hiển thị raw code. Profile/header cập nhật cùng dữ liệu thật. E2E account.spec.ts chỉ bật E2E_ACCOUNT_FIXTURE=true với tài khoản thử cách ly, không đổi password fixture thực.

Billing hiện dùng SQL qua services/billing/billingService.ts, không dùng initialInvoices/initialTenants/initialContracts. Owner workspace lấy quan hệ thuê thật, chọn hợp đồng ACTIVE, nhập chỉ số cuối/hạn đóng, lưu nháp hoặc lập và gửi. Chỉ server tính totals; modal/Owner list dùng cùng hóa đơn với Tenant. Payment/checkout/assign Tenant qua prototype không ghi trạng thái giả.

Customer đang thuê có panel hóa đơn trên Home và menu /my/invoices; /my/invoices/:id hiển thị chi tiết. Chỉ SENT của đúng Customer; refresh sau focus và mỗi 30 giây khi tab visible, có nút làm mới. Đổi tài khoản không giữ cache của người trước. Địa chỉ chọn phân tầng city/district/ward từ API address-options; submit để lọc, đổi cấp cha xóa lựa chọn con. Options chỉ thuộc catalog đang đăng, không phải danh mục toàn quốc.

Hai tài khoản thử: tenant1@ancu.local (T.101), tenant2@ancu.local (T.102), mật khẩu xem ignored .env.local backend. Luồng hợp đồng/OTP/payment đầy đủ chưa có; ACTIVE contracts là local fixtures. Kiểm tra E2E mới e2e/billing.spec.ts và unit tests/billing.test.ts.

- `/`: HomePage công khai, tìm/lọc/phân trang căn hộ từ SQL Server.
- `/apartments/:id`: chi tiết công khai; Guest đi login rồi trở lại căn hộ; verified Customer gửi lời nhắn thuê.
- `/my/rental-requests`: Customer xem yêu cầu đã lưu, giữ sau reload.
- `/app`: workspace Owner/Admin giữ bố cục cũ. Owner có menu **Yêu cầu thuê**, xem/lọc/làm mới inbox theo ownership.
- Owner **Quản lý Phòng** lấy cùng Apartment với Home qua `ownerApartmentService`, gồm cả nháp/ẩn. Property selector lấy dữ liệu của Owner từ backend; thêm căn hộ không gửi ownerId/client ID/availability. Checkbox đăng công khai chỉ bật khi Property APPROVED. Bỏ `/api/rooms` và mock-room fallback; API lỗi hiển thị lỗi/retry. Room trong types chỉ là view model của giao diện cũ, không phải bảng hoặc API riêng.
- `/login`: login hiện có; Owner vào /app, Customer vào Home, returnTo giới hạn route nội bộ.

React Router dùng cho các URL mới; tab navigation quản lý trong workspace giữ nguyên. Services/apartments dùng public fetch không gửi JWT; services/rental dùng Bearer/refresh client. hooks/useApartments, hooks/useRentalRequests và layouts/CustomerLayout giữ loading/error/empty/pagination. Phần Home/rental không dùng mockData. ApartmentListingPage/ResidentPortalPage prototype còn trong source nhưng không được mở bằng role menu/quick links Owner.

Navigation: components/navigation/AccountMenu dùng chung cho Owner header, Customer và Profile/settings; hiển thị role server, không switch ba role demo. Customer giữ Trang chủ trực tiếp, còn requests/invoices/profile/settings/logout nằm trong menu biểu tượng; chỉ Customer có tenancy thật mới có mục hóa đơn, nhãn Tenant theo ACTIVE contract. Menu đóng khi chọn link, click ngoài hoặc Escape. AccountLayout có Quay lại trang quản lý (/app) cho Owner/Admin và Quay lại trang chủ (/) cho Customer, kể cả tải URL trực tiếp/reload.

Ảnh local Home/detail lấy từ thumbnail/images trong API, URL `/apartment/images/{filename}` của backend. Vite proxy cả `/api` và `/apartment/images` tới API_PROXY_TARGET (default localhost:8080); restart Vite khi thêm cấu hình proxy và Run lại backend để nạp static files/security rule. Deployment cần route `/apartment/images` tới backend cùng origin; không sao chép hoặc hardcode URL ảnh trong React.

Backend local initializer cung cấp dữ liệu mẫu khi ba bảng catalog/request mới đều trống. Customer/Owner credentials đọc từ file `.env.local` backend. Submission chưa giữ chỗ và chỉ tạo PENDING. Inbox đang read-only; accept/reject là task riêng. API OpenAPI ở docs/api/discovery-rental.openapi.json ngoài thư mục frontend. E2E rental dùng hai browser contexts để xác minh request đi từ Customer đến Owner.

Home uses the supplied HomePage_new design/icons, with server catalog and existing auth/account/tenant flows. City tiles apply an exact catalog city filter immediately, clear district/ward, preserve other criteria and reset page. Budget accepts inclusive min/max VND per month; bedrooms matches exact count, including Studio (0). No browser-local prototype accounts/data are used. City illustrations retain the source Unsplash URLs.

Rental request update (13/10/2026): ApartmentDetailPage tải own active requests từ server khi refresh/login/chuyển căn hộ, chặn form khi đang tải/lỗi/đã PENDING hoặc ACCEPTED; giữ thông tin căn hộ. Cancel own PENDING ở detail và MyRentalRequestsPage với version server. Hủy được lưu vào history; có thể gửi lại khi không còn active request. Playwright e2e/rental-cancel.spec.ts kiểm tra real SQL concurrent submit, reload, cancel detail/history và mobile390. Các request kiểm thử được hủy trong finally, giữ lịch sử local.

13/10/2026: /account/settings is a hub with no command forms. /account/settings/password has current/new/confirm fields; /email handles verify/update and resumable OTP; /phone handles update with reauthentication. Registration redirects to /account/settings/email. Each route supports direct URL/reload/back, and contact changes revoke sessions as before. Pending Customer sees an email verification link instead of a rental form; eligibility is server policy. E2E settings-verification.spec.ts covers pending local Customer and mobile routes; E2E_SETTINGS_MUTATIONS=1 enables isolated account password/phone commands requiring guarded SQL cleanup. Rental positive tests use verified LOCAL_TENANT_1_* fixture because LOCAL_CUSTOMER_* is deliberately pending for user testing. A .local address needs a reachable staged email for real OTP; no fixed/debug OTP endpoint exists.

13/10 follow-up: Customer chưa xác thực vẫn có form/nút Gửi yêu cầu thuê ở detail căn VACANT. Khi nhấn gửi, kiểm tra server verification summary, hiện thông báo cần xác thực + nút Xác thực email (/account/settings/email); không tạo request. Backend CONTACT_NOT_VERIFIED cũng dẫn tới cùng thông báo. Backend policy/duplicate guard giữ nguyên. Playwright pendingCustomer click/mobile/reload/email navigation và directAPI403 đạt; lint/build đạt.

Owner apartment images (13/10): Quản lý căn hộ / Danh sách căn hộ uses API thumbnail mapped into existing Room.image; ApartmentImage handles missing/broken image fallback in cards and detail modal. Mobile management sidebar opens from Menu quản lý; desktop tabs/shared state preserved. Playwright owner-apartment-images.spec.ts checks persisted image URLs/loading/card count/modal, desktop/mobile390 and drawer navigation. No photo upload or DB reset.

Rental rework: Owner rejection dialog accepts optional reason; private cards show persisted decisionReason. Owner commands refresh both request list and common inventory. Customer history/detail silently refresh every10seconds while visible and on focus/visibility return; background polling is paused and listeners/timers cleaned on unmount. Contract creation is disabled with an availability note. e2e/rental-decision.spec.ts now creates unique local OWNER/CUSTOMER/property/apartment and cleans exact fixture data in finally; it no longer uses/cancels LOCAL_TENANT_1 requests or selects shared catalog apartments. Recovery IDs (no password) live in ignored backend target/rental-e2e-fixtures until cleanup succeeds. Run with E2E_BASE_URL against a dedicated local backend and SQL proptech_db; helper uses existing local datasource credentials and does not contact SMTP.
# Owner tài sản / hồ sơ / Admin review — 13/10/2026

Owner đăng ký/xác thực email qua flow hiện có, vào `/app`; nếu chưa có tài sản thì có CTA **Thêm tài sản cho thuê**. Form hỗ trợ một căn/nhà nguyên căn hoặc nhiều căn/phòng; API lưu Property + Apartment nháp nguyên tử. Tài sản cho thuê nguyên căn chỉ có một Apartment. Menu **Tài sản cho thuê** có chuẩn bị/xem hồ sơ, gửi lại theo ý kiến Admin và giữ lịch sử. Chứng từ PNG/JPEG≤5MB/ảnh, 20ảnh/hồ sơ, private authenticated downloads; không PDF, không legal identity/bank API proof.

**Tài sản đang chọn** dùng server UUID thật, lọc shared inventory/khách thuê/hợp đồng/choices lập hóa đơn và API yêu cầu thuê/hóa đơn trước phân trang. Chuyển tab giữ shared state; chọn tài sản đổi thì đóng editor cũ. Prototype finance/reports/maintenance không được coi là dữ liệu server đã lọc.

Admin đăng nhập role thật vào `/admin/property-dossiers`, xem chứng từ và quyết định phê duyệt/yêu cầu bổ sung/từ chối. Owner chỉ công khai căn sau khi tài sản được duyệt; trong chi tiết căn có **Công khai căn hộ / Ẩn tin căn hộ**, server version/ownership/approval gate. Public register không có ADMIN; provisioning local tùy chọn theo backend README. Không có demo role switch.

E2E `property-onboarding.spec.ts` dùng real SQL/API, Owner/Admin mới có UUID riêng, SMTP503 mô phỏng và local test verification provisioning (không chứng minh Gmail inbox), kiểm tra desktop/mobile390 và guarded cleanup. Chạy backend test8082/Vite3002, E2E_BASE_URL=http://localhost:3002. Backend test phải tắt sample seed/billing và Admin local provisioning. Xem [ADR](../../docs/decisions/property-onboarding-v1.md).

### Contract drafts — 14 October 2026
Owner: accepted rental request → Tạo hợp đồng → six-step template/party/asset/terms/review wizard. Saved identity/asset fields are read-only, missing structured identity fields are displayed honestly. Seven clauses can be edited/added/deleted/reordered/replaced. Save/reopen/edit real DRAFT; Customer account menu → Hợp đồng của tôi for exact-party review. Owner contracts tab links authoring to accepted requests. No signature/provider/activation flows. See ../../docs/decisions/contract-drafts-v1.md and ../../docs/api/contract-drafts.openapi.json. Isolated e2e/contract-draft.spec.ts covers real SQL persistence/concurrency and mobile; it creates fresh UUID accounts/property and uses guarded local-only cleanup with optional AllowContractDrafts. Verification in this fixture is simulated, not a Gmail inbox check.
