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
