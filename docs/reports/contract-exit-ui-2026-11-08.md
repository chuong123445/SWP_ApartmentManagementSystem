# FIX-09 giao diện và kiểm tra — 08/11/2026

Sau backend aedfadf trên nhánh feat/early-termination-handover, từ nhánh test chung. Thêm ContractExitPanel/client/types; mở theo yêu cầu tại chi tiết ACTIVE/ENDED contract, và thay popup lập bàn giao từ danh sách Owner bằng luồng cư trú. Chỉ lấy quyền/capabilities/sourceVersion từ backend; không gửi actor/status/refund flags. Không tạo hoặc thay đổi dữ liệu cọc.

## Giao diện

- Đề nghị kết thúc sớm: ngày, lý do, căn cứ điều khoản/thời hạn báo trước hoặc thỏa thuận, khoản phạt đề xuất và bên chịu. Cho xem điều khoản đã ký. Bên còn lại xác nhận/từ chối hoặc người đề nghị rút. Không có thao tác Admin phân xử.
- Owner lập biên bản gồm ngày thực tế, điện/nước đầu-cuối, phòng/thiết bị/chìa khóa, ảnh chứng cứ tùy chọn. Customer xác nhận hoặc ghi bất đồng; Owner lập lại/hủy, giữ các vòng trước/sau trong history. Mốc thiếu không tự điền0. Số tiền điện/nước hiển thị là đối chiếu, chưa thu tiền/quyết toán.
- Consent mới cho mỗi thao tác; stale/uncertain errors khóa gửi tiếp đến khi tải lại. POST thành công nhưng GET contract lỗi giữ kết quả đã lưu, không mở lại nút xác nhận. Abort/epoch bỏ response cũ khi đổi contract/đóng panel. Tải ảnh qua authenticated client/blob, không dùng URL public.
- Ẩn form tạo bàn giao có cọc legacy trong chi tiết hợp đồng mới; legacy PENDING đã tồn tại vẫn có phần đọc/xác nhận cũ. Cập nhật ba bộ fixture E2E cũ cho luồng mới; không xóa kiểm tra renewal hoặc legacy confirmation.

## Kết quả thực tế

- 143 frontend unit, TypeScript noEmit (gồm test/fixtures TS), production build và kiểm tra cú pháp JS mới PASS. Build chỉ còn cảnh báo chunk>500kB có sẵn. Log ngoài Git tmp/fix09-final-fe.log/fix09-final-build.log.
- Playwright MCP **4 kịch bản PASS** (early/expired ×1440/390); expired đi từ Owner `/app?tab=contracts` → card → popup mới, early từ trang chi tiết. Kiểm tra đề nghị/từ chối/rút/đồng ý, không tự xác nhận, upload/chọn ảnh, bất đồng/chỉnh lại biên bản/Customer xác nhận, history các vòng, stale409 và không tự retry, POST thành công+GET503 giữ kết quả, không tràn ngang hoặc page/console/network error ngoài lỗi mô phỏng đã dự kiến. Helper ngoài Git tmp/fix09-browser.js được sinh từ e2e/contract-exit.spec.js; ảnh tmp/fix09-exit-{early,expired}-{1440,390}.png. Đã xem trực quan PNG mobile early. Không đánh giá pixel PDF iframe trong headless browser.
- Native Playwright CLI được thử cho contract-lifecycle/contract-list-actions/renewal-requests, nhưng môi trường chặn spawn worker với EPERM trước khi chạy test. **Không đánh dấu suite CLI này PASS**. Nguồn fixtures/assertions được cập nhật và TypeScript kiểm tra; MCP là bằng chứng thực thi trình duyệt cho luồng mới. Log tmp/fix09-legacy-e2e.log.
- Backend:99 test khác nhau PASS (13 mới+86 hồi quy), chi tiết trong contract-exit-backend-2026-11-08.md. Đợt này browser dùng API fixtures, backend dùng SQL testDB; không UI nối appDB thật, không provider hoặc dữ liệu người dùng gửi ra ngoài.

## Chạy thử

Chạy backend nhánh mới để nạp V60, tải lại frontend. Dùng contract ACTIVE đã bắt đầu và có bản nội dung đã lưu; Owner/Customer mở `/contracts/{id}` → **Kết thúc thuê / bàn giao cư trú**. Ngày trước endDate: tạo đề nghị và bên còn lại đồng ý; đến ngày thỏa thuận Owner lập biên bản, Customer phản hồi/xác nhận. Hết hạn thông thường: Owner cũng có nút Lập biên bản bàn giao từ danh sách hợp đồng. Hủy/gửi hóa đơn DRAFT và xử lý renewal/legacy handover đang mở trước khi bàn giao; SENT còn nợ không bị xóa hoặc chặn trả phòng.

Không reset tài khoản/fixtures hoặc áp migration thủ công DB ứng dụng trong task. Vite test3197 đã dừng. Ba VNeID diagnostics chưa track được giữ nguyên. Không push/PR.
