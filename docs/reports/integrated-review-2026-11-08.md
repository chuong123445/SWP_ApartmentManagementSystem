# Rà soát nhánh kiểm thử chung, 08/11/2026

Phạm vi: main9138d17 đến nhánh test/system-improvements-20261108; FIX-01–08, TECH-01, AI-01, AI-04. Bảo toàn ba file diagnostics chưa track; không chạy ứng dụng với DB chính hoặc gọi provider thật.

## Lỗi nhãn hợp đồng hủy — đã sửa

`tenancyViews` đổi CANCELLED thành terminated, khiến bảng “Quan hệ thuê đã lưu” của Owner hiển thị “Đã kết thúc”, dù bản này chưa có hiệu lực. Giữ riêng trạng thái cancelled trong model giao diện và nhãn “Đã hủy trước hiệu lực”; ENDED vẫn “Đã kết thúc”. Không thay trạng thái backend, quyền hoặc dữ liệu.

Kiểm tra hồi quy trước sửa thất bại đúng actual “Đã kết thúc”; sau sửa 5 test selection-cancellation và TypeScript PASS. Playwright MCP API fixtures tại 1440/390 PASS: hai hàng CANCELLED/ENDED khác nhãn, không tràn ngang hoặc lỗi trình duyệt. Helper ngoài Git: tmp/review-cancel-label-browser.js; regression test trong tests/selection-cancellation.test.ts.

## Bộ lọc AI được người dùng bổ sung — đã sửa

Nút áp dụng chỉ dựa vào `result.canApply` tại thời điểm AI trả về, nên kết quả AI rỗng khóa nút ngay cả khi người dùng đã nhập bộ lọc hợp lệ. Đã tái hiện qua Playwright trước sửa: “Reviewed filter remains disabled after empty AI suggestion”. Giao diện giờ tính khả năng áp dụng từ các giá trị đang được người dùng rà soát; không gửi bộ lọc rỗng, vẫn kiểm tra form và dùng API validate/audit hiện có. Giá 0/studio 0 vẫn được tính là bộ lọc.

Thêm unit regression và mở rộng e2e/ai-search.spec.js. Playwright MCP 1440/390 PASS: kết quả rỗng khóa nút, nhập diện tích mở nút, xóa lại khóa, xác nhận thủ công mới truy vấn catalog. Các luồng consent/sửa bộ lọc/kết quả rỗng/lỗi provider cũng đạt. Helper ngoài Git tmp/review-ai01-browser.js.

Sau hai sửa: 139 frontend unit, TypeScript noEmit, cú pháp e2e AI và production build PASS. Build còn cảnh báo chunk >500kB có sẵn. Không thêm dependency hoặc thay cấu hình provider.

## Kiểm tra tổng hợp

- Maven offline, SQL Server DB riêng `ancu_settlement_test_20261103`, exit 0: **150 test**, 0 failure/error/skipped, từ 14 class: Billing25, SelectionCancellation10, ContractDraft46, DiscoveryRental28, Notification5, OwnerWorkspaceSummary3, OwnerFinancialSummary3, TenancySummary2, Maintenance2, OwnerPrecheck4, AiSearch3, GeminiAssistanceClient4, DossierAiClient13, ContractPdfLayout2. Log ngoài Git `tmp/integrated-review-backend.log`.
- Kiểm tra thêm các phần dùng chung, Maven exit0: CashEntry4, Sepay22, PropertyDossier15 = **41 test**, 0 failure/error/skipped. Log `tmp/integrated-review-boundaries.log`. Tổng cộng lượt rà soát này **191 test backend khác nhau**, 17 class qua hai lệnh; không phải toàn bộ test suite.
- **139 frontend test**, TypeScript, cú pháp e2e AI và production build PASS. Log `tmp/integrated-review-final-fe.log`, `integrated-review-build.log`; production build chỉ có cảnh báo chunk lớn có sẵn.
- **24 kịch bản Playwright MCP PASS** trên 1440/390: hai lỗi hồi quy nêu trên; sổ quỹ; summary/CSV; bộ đếm; hóa đơn nháp; Owner precheck; hủy trực tiếp/nháp chưa ký/đồng thuận một chữ ký; người thuê/cọc/định danh; bỏ search không hoạt động. Kiểm tra thao tác chính, stale/error/retry theo từng scenario, console/page/network và tràn ngang. Browser dùng API fixtures, các lỗi 409/503/401 chủ đích được kiểm tra theo scenario.
- Rà soát luồng gọi/quyền/version/lock/status liên quan trong các service, repository và các trang đã đổi. Context7 đối chiếu service transaction/repository locking với Spring Data JPA4.1.0, là bản gần dependency4.1.1 mà catalog có; không đổi thư viện.

Không coi những kết quả này là kiểm thử production hay toàn bộ test suite của repository. Không chạy UI nối DB ứng dụng thật, không gửi giấy tờ ra Gemini hoặc gọi SePay thật. Không chỉnh DB ứng dụng/fixture/tài khoản. Server Vite riêng 3197 đã dừng; các test Maven tự kết thúc.

Hai commit sửa chức năng: `1ea9dc0` (nhãn hủy), `e87d0fc` (bộ lọc AI được bổ sung). Chưa phát hiện thêm sai sót trong phạm vi đã đọc và kiểm tra; kết quả không bảo đảm các luồng/provider chưa thử sẽ hoạt động. Không push/PR trong lượt này.
