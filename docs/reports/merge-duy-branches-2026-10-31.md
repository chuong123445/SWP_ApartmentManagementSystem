# Hợp nhất các nhánh Duy vào chuong — 31/10/2026

Đã fetch toàn bộ remote, sau đó tập trung vào các nhánh Duy theo chỉ dẫn mới nhất. Không push. Nhánh `NgocAnh` đã được thử merge nhưng **merge --abort hoàn toàn**, không có commit hoặc thay đổi của lượt merge đó trong kết quả.

| Nhánh | Đầu nhánh đã lấy | Trạng thái |
|---|---|---|
| Duy/all | ce4049f | Local cập nhật fast-forward; đã vào chuong |
| duy/ai-manual-dossiers | ce4049f | Local tracking; đã nằm trong Duy/all |
| duy/resident-rental-hub | 69e43ae | Local tracking; đã nằm trong Duy/all |
| duy/ui-invoices-maintenance | 06873e4 | Local tracking; đã nằm trong Duy/all |

`git merge-base --is-ancestor` xác nhận cả bốn đầu nhánh trong `chuong`. GitHub phân biệt Duy/all và duy/...; đã chuẩn hóa refs/tracking trên Windows. Fetch cuối không có thay đổi code mới hơn.

## Các checkpoint local

- `chuong` ban đầu fcb37ca, working tree sạch. Fast-forward tới nhánh local SePay 6dea34e để giữ toàn bộ phần thanh toán đang làm.
- **254c111**: merge Duy/all, giải quyết 15 file conflict: auth, security, repository, cấu hình, route, hóa đơn và workspace. Giữ Google/VNeID, BIGINT dạng chuỗi trên API, quyền riêng tư, source consent, kho tài sản và khóa Escrow legacy.
- **8f07f8d**: merge HuuHa/owner-reports-chart f48b245, đã hoàn thành trước khi user đổi phạm vi. Giữ escaping HTML/PDF hiện hành; chuyển test báo cáo từ Vitest chưa được khai báo sang node:test đang dùng. Historical invoice seed cần bật riêng `app.billing.report-fixtures=true`, mặc định false, tránh tự thêm dữ liệu khi khởi động.
- **afa4d72**: thêm GO cuối bốn script SePay V23–V26, khắc phục lỗi Spring fallback tách SQL theo dòng.
- **6c7c7ef**: hợp nhất thanh toán cư dân: giữ QR/trạng thái SePay, khi NOT_CONFIGURED mới hiện tài khoản từ snapshot hợp đồng; giữ đường quay về đúng phòng và trạng thái trả tiền ở Owner.

Migration hiện hành: V20–V22 giữ receiving-account/reauth/source-consent; V23–V26 SePay; V27 signatures, V28 lifecycle, V29–V33 maintenance, V34 dossier AI. Chỉ thay thứ tự/đường dẫn phần mới để tránh trùng số; không chạy vào database ứng dụng thật.

## Kiểm tra thực tế

| Kiểm tra | Kết quả |
|---|---|
| Backend unit: Auth0 asset/reauth, Google config/login, VNeID, SePay HTTP, dossier AI client | 44 PASS |
| SQL Server clone: Escrow security, billing, SePay, contract drafts/lifecycle, maintenance | 62 PASS, 2 phút 5 giây |
| Frontend unit, gồm 30 test báo cáo | 85 PASS |
| TypeScript và production build | PASS; cảnh báo bundle lớn hiện có |
| Playwright MCP: resident home, maintenance, invoice UI, dossier AI | 12 scenario PASS |
| Playwright MCP: SePay QR → PAID ở 1440 và 390 px | 2 scenario PASS |
| Responsive, page errors, API fixture | Không tràn ngang/uncaught page error ở 12 scenario; AI lỗi tải cố ý trả 500, vẫn cho Admin quyết định thủ công |
| Visual | Đã xem ảnh mobile biểu mẫu báo sự cố |

SQL clone: `ancu_identity_verify_20261027213854`; seed/mail/schedulers tắt. Không reset fixtures, không gọi AI/Auth0/SMTP/SePay thật và không chuyển tiền. Các test browser dùng API fixture, không chứng minh tích hợp provider thật.

Môi trường chặn Node child processes với EPERM: dùng Node native TypeScript với alias loader để chạy unit, Vite native config loader để build/serve, và Playwright MCP với assertion harness tạm để thực thi các scenario browser hiện có. Không thêm dependency. Maven dùng lock factory noop trong lệnh và forkCount=0; không sửa cấu hình build của project. Context7 React19.3 và Spring7.0.5 được đối chiếu với React19.3/Spring7.0.9 thực tế; không có đúng bản Spring7.0.9 trong nguồn đã tra.

Lượt SQL đầu thất bại ở script SePay thiếu GO; đã sửa và chạy lại đạt. Lượt browser SePay đầu dùng fixture chưa giữ QR sau GET refresh nên timeout; fixture đã sửa, hai viewport chạy lại đạt. Bốn AI scenario đầu thiếu matcher trong harness, bổ sung matcher và chạy lại cả bốn đạt.

Vite kiểm thử riêng cổng3007 được dừng khi bàn giao. Các server người dùng không được restart. Để dùng bản code mới, restart backend/Vite của người dùng. WORK_PROGRESS.md tại workspace gốc có checkpoint tiếp tục. RDS và diagrams giữ nguyên.
