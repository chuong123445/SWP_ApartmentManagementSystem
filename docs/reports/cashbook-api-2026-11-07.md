# FIX-01 — Sổ quỹ dùng API thật

Ngày: 07/11/2026. Nhánh `fix/cashbook-api`, từ main `9138d17`.

## Thay đổi

Giao diện Sổ quỹ trước đây đọc `initialTransactions` và thêm vào state bộ nhớ; tải lại trang mất phiếu, tổng và nhãn lợi nhuận lấy từ dữ liệu mẫu. Nay Owner đọc/ghi qua Cash API sẵn có:

- Danh sách theo tháng, tài sản đang chọn, loại và trạng thái; phân trang 20 phiếu. Hỗ trợ mở trực tiếp `/app?tab=finance` và `propertyId` theo navigation hiện có.
- Tổng thực thu, thực chi, dòng tiền ròng do server tổng hợp toàn phạm vi POSTED; không cộng một trang và không gọi dòng tiền ròng là lợi nhuận. Lỗi tải không biến thành số 0 hoặc dữ liệu mẫu.
- Tạo phiếu DRAFT với ngày thực thu/chi, tài sản, đối tác, nội dung, phương thức, số tiền dạng chuỗi và mã tham chiếu. Không xác nhận ngay khi lưu.
- Giữ `requestKey` khi thử lại cùng nội dung sau lỗi mạng; form giữ nguyên nội dung để retry. Cache retry tồn tại trong workspace, không lưu thông tin phiếu vào localStorage. Tải lại toàn bộ trình duyệt sẽ mất cache retry; nếu mất phản hồi cần kiểm tra danh sách trước khi tạo lại.
- Xem chi tiết/audit; xác nhận DRAFT và hủy DRAFT/POSTED bằng version, hủy cần lý do. Xung đột hoặc mất phản hồi thao tác làm tải lại version/trạng thái từ server.
- Hook sổ quỹ đặt trong shared workspace: đổi tab giữ bộ lọc, chỉ tải Cash API khi tab sổ quỹ được mở; cleanup bỏ phản hồi cũ khi đổi phạm vi. Owner shell được giữ.

Không thay đổi backend/API/schema, quy tắc thu từng phần, cọc/refund, payment provider, trạng thái hóa đơn hoặc DB ứng dụng. Phiếu hủy là sửa sai sổ, không chuyển tiền hoàn. Sổ thủ công chưa tự đồng bộ các giao dịch SePay/ledger.

## File chính

- `src/types/finance.ts`: DTO theo CashDtos.
- `src/services/finance/cashService.ts`: list/summary/detail/create/post/cancel và retry intent.
- `src/hooks/useCashbook.ts`: bộ lọc, phân trang, loading/error, chống phản hồi cũ.
- `src/components/finance/CashEntryForm.tsx`, `src/pages/owner/finance/FinancePage.tsx`: tạo nháp, danh sách, tổng, chi tiết và thao tác.
- `useRentalWorkspace`, `WorkspacePage`, `WorkspaceRoutes`, `useWorkspaceNavigation`: bỏ mock khỏi luồng sổ quỹ, nối shared hook và deeplink.
- `tests/cashService.test.ts`: scope summary so với pagination/status, retry khi mất phản hồi, version/lý do và lỗi API.

Các đường dẫn `src` và `tests` ở trên thuộc frontend trong `frontend-v2`.

## Kiểm tra thực tế

| Kiểm tra | Kết quả |
|---|---|
| TypeScript `tsc --noEmit` | PASS |
| Frontend Node test suite | 112 PASS, 0 fail; gồm 3 bài Cash mới. Bài diagnostics có sẵn chưa track được giữ nguyên. |
| Vite production build | PASS; còn cảnh báo kích thước chunk >500 kB |
| `CashEntryIntegrationTests` | 4 PASS, 0 fail/error/skip, 21,27 giây; database SQL Server test có sẵn `ancu_settlement_test_20261103`, test transaction rollback; không dùng DB ứng dụng |
| Playwright MCP 1440 và 390 px | Cả hai PASS các tình huống phía dưới; không có lỗi JS/console bất ngờ, request thất bại bất ngờ hoặc tràn ngang trang; đã xem ảnh hai kích thước |
| Git diff whitespace | PASS |

Browser dùng API fixtures giữ state qua reload: 21 phiếu kiểm tra tổng toàn bộ và trang thứ hai; tạo nháp với lỗi 503 sau khi giả lập đã lưu rồi retry cùng key; post trả 409 và reload version rồi post lại; reload vẫn đọc phiếu từ nguồn API; lọc và hủy với lý do; phiếu hủy không tính tổng; giữ bộ lọc khi đổi tab; phản hồi tài sản cũ bị trì hoãn không ghi đè tài sản mới; tháng rỗng và lỗi tải có thông báo thật. Các HTTP 503/409 cố ý tạo được kiểm tra riêng, không tính là lỗi bất ngờ. Browser không gửi ghi nghiệp vụ tới backend thật.

Giới hạn: chưa đăng nhập và tạo phiếu qua UI nối DB ứng dụng thật; chưa kiểm tra ngân hàng/provider, tải lớn hoặc đủ mọi thao tác đồng thời trên nhiều instance. Backend contract và UI được kiểm tra riêng như trên, không gọi fixtures là bằng chứng tích hợp live toàn tuyến.

Lượt test ban đầu bị chặn child process `EPERM` ở Node/tsx, đã chạy lại thành công bằng native TypeScript transform + alias loader có sẵn, `--test-isolation=none`. Build native CLI vướng `__dirname` của config hiện có, đã dùng Vite programmatic native loader với cùng config và `__dirname` được cấp trong runner; không sửa dependency/config dự án để né lỗi môi trường. Runner Maven cũ bị PowerShell 5 coi dòng stderr JVM là lỗi dừng; chạy lại bằng PowerShell 7 thành công. Browser harness ban đầu giả định deeplink finance có sẵn và nhầm menu mobile còn mở sau chọn tài sản; đã bổ sung deeplink vào whitelist và sửa harness, rồi chạy lại cả hai kích thước thành công.

Bằng chứng local ngoài Git: `tmp/cashbook-api-20261107-browser.js`, `tmp/cashbook-api-{1440,390}.png`, `tmp/cashbook-fe-tests-native.log`, `tmp/cashbook-build.log`, `tmp/cashbook-api-backend-20261107.log`; báo cáo Surefire ở backend `target/surefire-reports/...CashEntryIntegrationTests.txt`. Server Vite riêng được dừng sau kiểm tra; không dừng server người dùng.

## Tiếp tục

FIX-01 hoàn thành phạm vi UI nối Cash API. Đầu việc tiếp theo theo tracker gốc là FIX-02: sửa bảng người thuê/nhãn chứng thực/cọc và key nhiều hợp đồng. Các AI mới thuộc nội dung bổ sung thực hiện sau, chưa triển khai trong unit này. Không push hoặc tạo PR trong phiên này.
