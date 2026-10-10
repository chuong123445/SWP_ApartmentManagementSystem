# An Cư PropTech React

React 19/TypeScript/Vite. Trang quản lý Owner được giữ nguyên; đăng nhập qua Spring Boot và đăng xuất trong menu Role.

## Cấu trúc src

```text
App.tsx                   Ghép AuthProvider và AppRoutes
pages/
  auth/                   LoginPage, AccountVerificationPage
  owner/                  Dashboard, Rooms, Tenants, Contracts, Maintenance, TrustGuard, Settings
    billing/              InvoicesPage, UtilitiesPage
    finance/              FinancePage, ReportsPage
  resident/               ResidentPortalPage
  customer/               ApartmentListingPage
  WorkspacePage.tsx       Ghép hooks/layout/routes và modal dùng chung
components/
  navigation/             Header, Sidebar
  rooms/                  AddRoomModal, RoomDetailModal
  billing/                CreateInvoiceModal, InvoiceDetailModal
  workspace/              WorkspaceModals
  feedback/               SessionLoading
layouts/                  ManagementLayout dùng chung cho các role
hooks/                    useAuth, useWorkspaceNavigation, useRentalWorkspace
services/                 auth/, rooms/, http/
providers/                AuthProvider
contexts/                 AuthContext
routes/                   AppRoutes (auth gate), WorkspaceRoutes (tab dispatch)
types/                    auth, models, navigation; index.ts export chung
data/                     mockData
utils/                    kiểm tra role hiển thị, sinh URL VietQR
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

Access JWT chỉ ở bộ nhớ. Refresh cookie HttpOnly khôi phục phiên khi reload; refresh/logout đi kèm CSRF. Role trải nghiệm không cấp quyền backend. Các module ngoài phòng/auth vẫn còn dữ liệu demo, xem WORK_PROGRESS ở thư mục workspace.
