# FIX07 — Giao diện và bàn giao

Nhánh `feat/rental-selection-cancellation`, backend `42dee53`; xem `selection-cancellation-backend-2026-11-08.md` và ADR `initial-selection-cancellation-v1.md`.

## Thay đổi

Owner/Customer mở **Hủy / lịch sử làm hợp đồng** từ yêu cầu hoặc danh sách/chi tiết hợp đồng. Lấy trạng thái/quyền/source mới từ server; hủy trực tiếp và mọi phản hồi đều có bước xác nhận riêng. START và REJECT cần lý do, ACCEPT/WITHDRAW cho ghi chú tùy chọn. Pending khóa ký theo DTO và backend; cancel hiện nhãn riêng, chỉ xem bản đã lưu/lịch sử, không gọi thu/hoàn cọc. Các lựa chọn gia hạn giữ flow riêng. Nhãn CANCELLED đồng bộ ở contract list/document/review, tenancy types và Admin account history; không bị hiểu thành ACTIVE/expired/ENDED.

409 giữ lý do trong state, khóa gửi đến khi người dùng tải lại/xác nhận; không tự retry với token mới. Validation400 cho phép sửa lại. Nếu POST đã thành công nhưng tải lại màn hình liên quan lỗi, UI giữ kết quả đã hủy, báo riêng lỗi đọc và vẫn chặn ký. Các request PENDING cũ dùng API hủy cũ; thông báo và dữ liệu không được chuyển tự động sang quy trình mới.

## Kiểm tra thực tế

- 137 frontend unit tests PASS, TypeScript `--noEmit` PASS, Vite build PASS (cảnh báo chunk >500kB có sẵn), JS e2e syntax/diff check PASS. Logs ngoài Git: root `tmp/fix07-final-fe-tests.log`, `fix07-final-tsc.log`, `fix07-final-build.log`.
- Playwright MCP 6 kịch bản (1440/390 × chưa có hợp đồng/nháp unsigned/một chữ ký) với API fixtures. Kiểm tra confirm, stale409 không auto retry, tải lại, direct readonly, đề nghị→đổi bên đăng nhập→reject→ký mở lại→đề nghị/withdraw→đề nghị/other accept, lịch sử6bước, pending/cancelled không có nút ký. Nháp unsigned đã hủy vẫn chặn ký khi GET contract503. Không overflow/pageerror/console/network ngoài HTTP409/503 được cố ý mô phỏng.
- Scenario lưu `frontend-v2/.../e2e/selection-cancellation.spec.js`, chạy MCP qua helper `tmp/fix07-browser.js` cùng logic. Dùng PDF fixture được backend tests tạo; không khẳng định render pixel của PDF trong headless plugin. Đã xem trực quan PNG desktop direct và mobile agreement; ảnh `tmp/fix07-{direct,unsigned,agreement}-{1440,390}.png`.
- Backend91 tests liên quan khác nhau qua các lượt đã đạt theo báo cáo backend, gồm SQL transaction/version/concurrency/PDF/private access. Chưa chạy UI nối backend/DB ứng dụng thật; browser dùng fixtures. Không có provider/payment/refund/email/SMS call.

## Chạy và giới hạn

Chạy backend nhánh mới để startup nạp V59 rồi tải lại frontend. Owner: Yêu cầu thuê → đang làm hợp đồng, hoặc Hợp đồng & Ký → **Hủy / lịch sử làm hợp đồng**. Customer: Yêu cầu & hợp đồng → yêu cầu đã chấp nhận hoặc bản hợp đồng tương ứng. Một bên ký thì bên còn lại cần phản hồi; không có tự hết hạn. ACTIVE/hợp đồng đã đủ hai chữ ký vẫn dùng FIX09; cọc thực thu/hoàn cọc vẫn FIX10/11.

Không apply thủ công database ứng dụng hoặc reset fixture. Ba file VNeID diagnostics untracked có sẵn giữ nguyên. Không push/PR/merge; server Vite3197 của task được dừng khi bàn giao. Root tracker/work progress/API/CODING_PLAN cập nhật.
