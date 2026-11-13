# Bàn giao thay đổi đăng tài sản, hóa đơn AI và hủy nháp — 13/11/2026

Nhánh `duy/listing-ai-invoice-drafts`, nền `1c498a58`.

- `2cf46fa4`: ảnh chung trong Thông tin & ảnh tài sản; ảnh riêng trong Căn/phòng; nháp cũ chuyển 5 → 4 bước; mô tả AI đọc tối đa 4 ảnh riêng thuộc tài khoản, kể cả form tài sản nguồn.
- `d6ebcb80`: Owner nhập mã phòng và chỉ số cuối kỳ vào AI tại modal hóa đơn điện nước. Thiếu số liệu yêu cầu bổ sung; Apply và Save/Send tách biệt. Đơn giá/tổng do backend hiện hành tính.
- `fee8adc2`: hủy lựa chọn thuê đầu chưa ký xóa contract+draft; giữ lịch sử yêu cầu. Có chữ ký thì không xóa. Nháp unsigned CANCELLED cũ được ẩn khỏi danh sách, không bulk-delete.

Kết quả cuối: **17 backend unit + 11 SQL integration = 28 tests PASS**, **162 frontend unit, TypeScript, production build PASS**, **12 Playwright MCP scenarios PASS** ở desktop 1440/mobile 390 (4 listing/source, 2 utility AI, 6 cancellation). Ảnh mobile listing/utility đã xem. Không lỗi trang/network/console ngoài lỗi API 503/409/422 được mô phỏng để kiểm tra xử lý. Cảnh báo Vite bundle lớn có sẵn. JSON OpenAPI và git diff --check PASS.

SQL dùng database riêng `ancu_listing_ai_20261113`; không thực hiện thao tác dữ liệu trên proptech_db. 4 integration tests cũ ban đầu thiếu OTP ký, đã cập nhật helper theo luồng thực với sender mock rồi 11 tests PASS; 1 unit có lỗi Mockito nested stubbing đã sửa và rerun17PASS. Context7 bị lỗi kết nối; Gemini REST inlineData đối chiếu nguồn chính thức. Provider dùng mock/loopback, **chưa xác minh Gemini thật hoặc UI với database ứng dụng thật**. Không đổi fixtures/credentials/RDS/sơ đồ, không push/merge. Ba file VNeID chẩn đoán untracked giữ nguyên.

API/ADR: docs/api/{billing,property-listing-assistance,selection-cancellation}.openapi.json; docs/decisions/initial-selection-cancellation-v1.md. Module chính: ListingDescription{Controller,Service,Dtos}/AssistanceClient/GeminiAssistanceClient/AiImageSupport; UtilityInvoiceAi{Controller,Service,Dtos}; ContractDraftService/TenancyService/SelectionCancellationService; PropertyListingWizard/DescriptionSuggestion/UtilityInvoiceAssistant/ContractDocument/ContractWizard/SelectionCancellationPanel.

Đã dừng Vite3197 dùng để kiểm tra; Maven/JVM test đã kết thúc. Chạy lại backend/frontend từ nhánh này để tải code mới. Sau đó Owner có thể thử câu “Phòng A.102, chỉ số điện cuối tháng 400, nước cuối tháng 25” trong Lập hóa đơn → Điện nước. Không bật thêm provider hoặc gửi hóa đơn tự động trong thay đổi này.
