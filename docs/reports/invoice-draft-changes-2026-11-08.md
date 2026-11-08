# FIX-08 — Owner sửa/hủy hóa đơn nháp

Nhánh `fix/invoice-draft-edit-cancel` từ `441f8ca`. Phạm vi nghiệp vụ và API: [quyết định triển khai](../decisions/invoice-draft-changes-v1.md), [billing OpenAPI](../api/billing.openapi.json).

## Backend đã kiểm tra

- 99 integration tests PASS trên SQL Server `ancu_settlement_test_20261103`: Billing 25, SePay 22, ContractDraft 46, OwnerFinancialSummary 3, OwnerWorkspaceSummary 3. Log ngoài Git: `F:/2026/Fa26/DTD/tmp/fix08-final-backend-20261108.log`, exit 0; các surefire report tương ứng trong backend `target`.
- Bao gồm tính lại BigDecimal từ snapshot, nước theo người, đồng bộ chỉ số lưu, kỳ sau lấy end của SENT đã sửa, stale invoice/chain, giảm chỉ số, hạn sai, field tampering, foreign Owner/Customer, Tenant không thấy CANCELLED, hủy lặp, hủy→lập lại hai lần cùng tháng/ID khác, gửi CANCELLED/SENT edit-cancel bị chặn. Kiểm tra gửi/hủy và sửa/hủy đồng thời: một lệnh thành công, một 409, không có partial meter write/lịch sử lặp. Gửi/lập đồng thời hiện có tiếp tục đạt.
- Source V57 chạy qua startup SQL init nhiều lần trên test DB; unique filtered index cho phép giữ nhiều CANCELLED cùng kỳ nhưng vẫn chặn current duplicate. Chưa chạy thủ công schema/data trên DB ứng dụng. V56 giữ dành cho task baseline riêng.
- Lượt đầu phát hiện sai tên bảng trong cleanup test và hai kỳ vọng decimal scale. Đã sửa cleanup đúng `billing_meter_readings`, so tiền hợp đồng theo BigDecimal và dựng webhook nguyên VND thay vì scale SQL. Lượt cuối 99/99 đạt; không thay đổi quy tắc xử lý tiền của provider. Ba fixture commit tạm do cleanup lỗi ở lượt đầu được dọn riêng với exact-ID/time/database guards; không dọn dữ liệu ứng dụng hoặc fixture trước đó.

## Giao diện đã kiểm tra

- 126 frontend unit tests PASS, TypeScript `--noEmit` PASS, Vite production build PASS (cảnh báo chunk >500 kB có sẵn). Node native type loader ngoài repo dùng thay tsx vì môi trường chặn spawn; không thêm dependency.
- Playwright MCP dùng API fixtures ở 1440px và 390px: tải mới dữ liệu, sửa chỉ số/hạn/lý do, 409 giữ form và khóa thao tác đến khi tải lại, lấy version mới, tổng do server trả, audit trước/sau, hủy cần xác nhận, trạng thái/lọc CANCELLED và read-only history, lỗi history 503 và tải lại. Không có page/console/network failure ngoài HTTP lỗi được chủ động mô phỏng; không tràn ngang. Scenario lưu tại `frontend-v2/.../e2e/invoice-draft-changes.spec.js`; thực thi MCP qua bản fixture cùng nội dung trong root `tmp/fix08-browser.js`.
- Đã xem trực quan ảnh desktop hủy và mobile sửa/lịch sử trong `tmp/fix08-{edit,cancel}-{1440,390}.png`. Chưa chạy UI nối backend/database ứng dụng thật hoặc gọi SePay thật; backend xác minh riêng qua MockMvc + SQL Server test.

## Vận hành và giới hạn

Owner → Hóa đơn & Thu → bản nháp → **Sửa / hủy · Lịch sử**. Cần chạy backend nhánh mới để startup nạp V57 và trả `billingVersion`; frontend tự khóa sửa nếu máy chủ cũ thiếu trường này. Hóa đơn cũ không được dựng lịch sử quá khứ. Hủy chỉ là bỏ chứng từ nháp; không giải phóng phòng, thay hợp đồng, hoàn tiền hoặc ghi cọc thực thu.

Ba file VNeID diagnostics untracked có sẵn giữ ngoài commit. Không push/PR/merge trong task này.
