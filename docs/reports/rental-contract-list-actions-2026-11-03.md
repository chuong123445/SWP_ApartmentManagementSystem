# Tách tab yêu cầu/hợp đồng và thao tác vòng đời từ danh sách

## Phạm vi đã chốt với người dùng

Giữ **một mục Yêu cầu & hợp đồng** trong menu tài khoản. Trong trang có2tab Yêu cầu thuê đã gửi/Hợp đồng, ưu tiên cách1 theo steering mới nhất. Nhắc20/10ngày **vẫn ở chuông thông báo**, không có mục nhắc hạn riêng và không thêm banner đếm ngày trên danh sách. Các thẻ có tên “[Mẫu] Nhắc hạn...” trong ảnh là dữ liệu mẫu đã có hợp đồng, không phải bản ghi thông báo; không đổi/xóa tên hoặc dữ liệu fixture để che vấn đề.

Nhánh độc lập feat/rental-contract-list-actions từ origin/main c4891c7, worktree tmp/rental-contract-actions-20261102. Không gộp main, không dùng nhánh VNeID/PR31/PR32 làm base, không sửa AI hoặc database app. Công việc bắt đầu02/11, hoàn tất kiểm tra03/11 sau nửa đêm.

## Thay đổi

- Backend `/me/rental-requests` loại các selection đã có ContractDraft bằng NOT EXISTS trong cả data/count query trước phân trang. Giữ request gốc và tài liệu, gồm nội dung đã ký/kết thúc; không chuyển chúng lại inbox. ACCEPTED chưa có tài liệu vẫn là yêu cầu đang làm hợp đồng. Exact Customer/Owner-as-renter scope giữ nguyên.
- Tab Hợp đồng dùng danh sách tài liệu riêng, không mount vào tab yêu cầu nữa. Query param giữ tab khi reload/back; tablist có aria-selected/controls/panel, ArrowLeft/Right/Home/End. `/my/contracts` tương thích cũ, mở cùng màn hình ở tab hợp đồng. Pagination yêu cầu giữ khi đổi tab trong cùng trang.
- Tenant thấy nút **Gửi yêu cầu thuê tiếp** trên đúng thẻ đủ điều kiện. Owner thấy **Lập biên bản bàn giao** trên thẻ và trong dòng bảng khi server handoverAvailable=true. Không bật chỉ vì thấy ngày hết hạn. Chưa có saved document chỉ xem lịch sử cũ; không tự tạo hợp đồng/chữ ký hoặc nút nghiệp vụ không được backend hỗ trợ.
- Nút mở native dialog tại danh sách; GET private contract lấy phiên bản/trạng thái mới nhất trước khi hiện form. Dùng lại ContractLifecyclePanel và service/consent/version/guards đang có; không có API ghi thay thế hoặc tự POST khi mở dialog. Fresh state đã bị chặn thì chỉ giải thích và liên kết trạng thái, không cho gửi lệnh. Lỗi409 được giữ và hiển thị, không báo thành công.
- Sau gửi hiển thị trạng thái yêu cầu/bàn giao và cập nhật danh sách qua sự kiện hiện có. Không tự chấp nhận thuê tiếp, ký hộ, kết thúc thuê, trả căn trống, thu/hoàn tiền hoặc giả lập provider.
- Thông báo hết hạn giữ ID/read state/schedule; URL Tenant mở `/my/rental-requests?tab=contracts&contractId=...`, Owner mở đúng `/app?tab=contracts&propertyId=...&contractId=...`. Thẻ liên quan được focus/đánh dấu, không đưa người dùng sang tab yêu cầu hoặc buộc mở PDF.
- Tab Hợp đồng cũng hiển thị quan hệ thuê legacy từ TenancyContext khi không có document, không làm mất2legacyfixtures chỉ vì danh sách ContractDraft không chứa chúng. Giữ thông báo không có nội dung gốc; không suy diễn chữ ký.

## Bằng chứng thực tế

- Backend unit1: **67 SQL-clone integration tests PASS**, gồm ContractDraftIntegrationTests39 và DiscoveryRentalIntegrationTests28,1m31. Test mới kiểm tra loại selection đã có doc trước pagination size1/count2, foreign account0, tài liệu và selection gốc vẫn tồn tại. Commit6d3c031.
- Backend unit2: **6 targeted tests PASS**,53s: NotificationIntegrationTests5 + expiry scoped/dedup test1 chạy lại với assertion URL riêng Tenant/Owner. Không cộng thành73test độc lập vì expiry test đã thuộc bộ67. Commit63af2ef.
- **91frontend unit/TypeScript PASS**. Test mới cho exact party, trạng thái hợp đồng và xung đột renewal/handover. Native-config Vite build PASS922ms, cùng React/Tailwind/alias, cảnh báo bundle>500kB có sẵn; không thay dependency. Dùng Node native transform-types/alias loader do môi trường.
- **14Playwright MCP spec callbacks PASS**,1440/390px: requesttab không tải doc; bấm chuông→contracttab/focus; tenant gửi với consent/version; pending không có nút trùng; Owner gửi handover với chỉ số/đồng ý;409 không thành công giả; fresh state changed không có form; legacy đọc được. Kiểm tra không overflow/pageerror/console error hoặc API ngoài fixture. POST dùng API fixtures, không gửi quyết định trên dữ liệu người dùng hoặc chuyển tiền.
- Đã xem ảnh mobile renewal/handover. VisualQA phát hiện dialog có2vùng cuộn và thông báo “không đủ điều kiện” sau gửi thành công; sửa một vùng cuộn/nút Đóng ở header cố định, khóa cuộn nền, phân biệt fresh-state warning với kết quả cập nhật;14ca chạy lại PASS. Dialog native có cleanup StrictMode, Escape và focus trap của browser; không khẳng định đã có một test tự động riêng cho mọi tổ hợp assistive technology.
- CLI Playwright runner không được chứng minh chạy thành công trong unit này; dùng chính callbacks của spec qua MCP/harness assertion, không gọi đó là CLI E2E PASS. Không dùng session người dùng. Không rerun full Backend ngoài các suite trên hoặc load/performance/provider tests.
- Test JVM đã shutdown; browser mocks/listeners được gỡ/tab about:blank. Vite test riêng3007 dừng trước handoff; user servers không restart. Không SQL mutation trên appDB, không migration mới, không tạo/reset fixture. SQL clone được dùng cho integration rollback fixtures; schema/additions từ unit khác được giữ, không drop.

## Nạp thay đổi

Sau khi review/gộp PR, restart Backend cho request query và notification link mới, reload Frontend cho tab/modal. Không cần migration hoặc chạy lại script mẫu. Đây là PR hướng main độc lập; không tự gộp các PR khác hoặc triển khai VNeID. Hướng dẫn nghiệp vụ cập nhật tại [contract-renewal-handover.md](../guides/contract-renewal-handover.md).
