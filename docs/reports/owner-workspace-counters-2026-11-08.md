# FIX-03 — Bộ đếm trên menu Owner

Ngày 08/11/2026. Nhánh `fix/owner-workspace-counters` từ `dd38a1b`. Người dùng yêu cầu tiếp tục unit kế tiếp trong SYSTEM_IMPROVEMENT_TRACKER.

## Vấn đề và kết quả

Trước đây menu đếm mọi hóa đơn SENT trong trang 20 dòng làm số “nợ”, kể cả đã thanh toán. Số sắp hết hạn lọc `contract.status === 'expiring'` nhưng adapter chỉ tạo active/draft/terminated, nên luôn bằng 0.

Menu nay đọc `GET /api/v1/owner/workspace-summary`, chỉ GET được allow trong SecurityConfig và cần xác thực. Service kiểm tra eligible Owner và tài sản thuộc đúng người gọi; property khác chủ/không tồn tại trả 404. Owner không có dữ liệu nhận các số 0 thật. Cache-Control no-store; không thay schema hoặc dữ liệu ứng dụng.

- **Chưa thu:** tổng số hóa đơn tháng SENT chưa có payment.paidAt và phiếu bổ sung chưa paidAt gắn đúng contract/customer/owner. Dùng cùng predicate với lịch sử hóa đơn/phiếu bổ sung, count tại DB toàn bộ scope, không theo page/size/trang đang xem. Phiếu owner-only cũ, sai customer/owner, invoice DRAFT và khoản đã paidAt không được tính. Tạo QR chưa có paidAt vẫn là chưa thu. Nghĩa vụ chưa thu của hợp đồng cũ/đã kết thúc vẫn được tính nếu còn bản ghi hợp lệ. Nhãn “chưa thu” không kết luận quá hạn.
- **Sắp hết:** hợp đồng ACTIVE đã bắt đầu, endDate từ hôm nay đến hôm nay+20, gồm cả hai đầu; lấy ngày server Asia/Ho_Chi_Minh, thống nhất mốc nhắc 20/10 hiện có.
- **Hết hạn:** hợp đồng vẫn ACTIVE nhưng endDate trước hôm nay; tách badge đỏ khỏi sắp hết. Không tự ENDED/release phòng. Hợp đồng kết thúc đúng hôm nay vẫn nằm nhóm sắp hết, phù hợp lifecycle.expired hiện dùng endDate<today.
- DRAFT/ENDED và ACTIVE chưa đến startDate không vào bộ đếm kỳ hạn. Có bản ký tiếp DRAFT không tự ẩn hợp đồng cũ còn ACTIVE; khi kỳ mới thực sự ACTIVE, kỳ cũ ENDED không bị đếm tiếp. Không thay gate gửi yêu cầu thuê tiếp D-10, ký, kích hoạt hoặc bàn giao.
- Tooltip giải thích thành phần hóa đơn và khoảng ngày. Bộ đếm hiển thị riêng loading/lỗi/retry; lỗi hoặc đổi tài sản không hiển thị số 0 giả hoặc giữ số của tài sản cũ.
- Shared hook tự tải lại khi thay inventory/billing revision, focus, visibility, sự kiện tenancy-changed và mỗi 10 giây khi trang visible. Cleanup bỏ kết quả cũ và tránh chồng request trong cùng lượt tải.

Phạm vi là **badge menu Owner**, không phải tổng tiền/biểu đồ dashboard/report. Các số dashboard còn dùng dữ liệu trang/nhãn mẫu là FIX-04/05. Bộ lọc trạng thái phòng trong RoomsPage là dữ liệu cấp phòng khác số hóa đơn/hợp đồng; không đồng nhất các loại số đếm hoặc đánh dấu các bộ lọc đó đã được nối bởi unit này. Không sửa nhắc nợ, thu từng phần, cọc/refund hoặc AI.

## File và contract

- `controller/owner/OwnerWorkspaceSummaryController`, `service/owner/OwnerWorkspaceSummaryService`, `dto/owner/OwnerWorkspaceSummary`.
- Repository count trong `RentalInvoiceRepository`, `TestPaymentRepository`, `RentalContractRepository`; tái sử dụng predicate owner history cho tiền. Không load ảnh/hồ sơ/chữ ký để đếm.
- SecurityConfig allow đúng GET mới; DiscoveryErrorHandler đăng ký domain controller.owner để trả JSON 403/404/400 đúng, giữ các denyAll khác.
- Frontend `types/owner`, `services/owner/workspaceService`, `hooks/useOwnerWorkspaceSummary`, `useRentalWorkspace`, `WorkspacePage`, `ManagementLayout`, `Sidebar`.
- `OwnerWorkspaceSummaryIntegrationTests`, `tests/ownerWorkspace.test.ts`.
- [OpenAPI](../api/owner-workspace.openapi.json); API_DOCUMENT trong DTD cập nhật riêng.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
|---|---|
| BillingIntegrationTests | 18 PASS |
| TenancySummaryIntegrationTests | 2 PASS |
| OwnerWorkspaceSummaryIntegrationTests mới | 3 PASS ở lượt cuối; tổng 23 bài backend khác nhau đạt qua các lượt |
| Frontend tests | 117 PASS, gồm 3 bài mới về scope/GET/breakdown/error/incomplete/zero |
| TypeScript và Vite build | PASS; còn cảnh báo chunk >500 kB |
| Playwright MCP desktop1440/mobile390 | Cả hai PASS; đã xem hai ảnh, không tràn ngang sidebar/trang, không lỗi JS/console hoặc request thất bại bất ngờ, không business write |
| OpenAPI JSON parse / Git diff whitespace | PASS |

SQL test sử dụng database test có sẵn `ancu_settlement_test_20261103`, transaction rollback, không DB ứng dụng. Test gồm 21 SENT chưa thu + paid + DRAFT, QR pending, phiếu bổ sung đúng/sai quan hệ, tài sản thứ hai, Owner khác/Customer/anonymous, ID sai, ngày hiện tại và biên D+20/+21/-1, ACTIVE chưa bắt đầu, ký tiếp DRAFT và kỳ mới ACTIVE/kỳ cũ ENDED. Sau thay đổi paidAt trong fixture, đọc lại số giảm đúng; API tổng hợp không thay trạng thái hợp đồng.

Lượt đầu test mới bị 403 vì chưa allow endpoint trong deny-by-default security; đã thêm đúng GET. Lượt thứ hai phát hiện controller.owner chưa được Advice xử lý ApiException; đã đăng ký domain vào handler để trả lỗi quyền/property/binding đúng. 18+2 regression đạt, 2/3 bài mới đạt ở lượt thứ hai; sau sửa handler chạy lại cả 3 bài mới đạt. Không bỏ qua test hoặc nới quyền theo wildcard để ép đạt.

Browser API fixtures: trang đầu có 20 hóa đơn PAID trong tổng 41 hóa đơn; summary vẫn hiển thị 21 monthly chưa thu +2 additional =23. Kiểm tra 3 sắp hết/1 hết hạn, tooltip, dữ liệu summary sau thanh toán, phản hồi tài sản cũ bị trì hoãn, lỗi 503 xóa badge cũ, nút thử lại và số 0 thật. Harness lần đầu dùng text locator exact trên alert có cả nút nên timeout dù thông báo hiện đúng; đổi sang role alert và chạy lại hai kích thước thành công.

Giới hạn: chưa kiểm tra UI nối backend/DB ứng dụng thật hoặc provider thật; không phải full-suite/security/performance audit. Ngày test là ngày runtime Asia/Ho_Chi_Minh; không gửi thời gian do client chọn vào API. Các số report/dashboard và dữ liệu cấp phòng khác chưa được xác nhận hoàn thiện bởi unit này.

Bằng chứng local ngoài Git: tmp/owner-counters-backend-20261108.log, owner-counters-backend-rerun-20261108.log, owner-counters-backend-final-20261108.log, owner-counters-fe-tests.log, owner-counters-build.log, owner-counters-20261108-browser.js, owner-counters-{1440,390}.png; Surefire reports tại backend target. Dùng native Node test/alias loader và Vite native config runner như FIX-01 do hạn chế child process, không thêm dependency/config mới. Context7 đối chiếu Spring Data JPA4.1.0 cho managed4.1.1 và Spring Security7.1.1 cho matcher GET/denyAll; APIs được chạy trên dependencies thật của project.

Vite test riêng được dừng; server người dùng giữ nguyên. Cần restart backend và tải lại frontend của nhánh mới để có endpoint summary; backend cũ sẽ hiển thị trạng thái số đếm chưa tải được thay vì dữ liệu giả. Không push/PR, không cập nhật fixture ứng dụng. Tiếp theo FIX-04 tổng hợp tài chính toàn scope, rồi FIX-05 định nghĩa chỉ số; AI vẫn thực hiện sau phần chính.
