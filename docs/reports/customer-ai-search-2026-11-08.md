# AI-01 — Kết quả triển khai

Nhánh `feat/maintenance-ai-search-precheck`, sau TECH01 `a0ac59e`. Thực hiện tìm tự nhiên → bộ lọc có thể sửa → xác nhận → truy vấn catalog thật; diện tích/sức chứa cùng phòng, không tạo kết quả bằng AI. Xem ADR `customer-ai-search-v1.md`.

PASS 35 backend tests trên SQL Server test: AiSearchIntegration 3 (nhiều trường hợp dữ liệu sai/quyền hiển thị), GeminiAssistanceClient 4 (REST loopback/thinking/schema/STOP/config/rate limit), DiscoveryRental 28. PASS 129 frontend unit, TypeScript, Vite build (cảnh báo chunk có sẵn). Log ngoài Git `tmp/ai01-final-backend.log`, `ai01-fe-tests.log`, `ai01-tsc.log`, `ai01-build.log`.

Playwright MCP 1440/390 API fixtures PASS: consent, không tự áp dụng, sửa trước xác nhận, query cùng giá/diện tích/capacity, thay diện tích riêng vẫn refetch, kết quả rỗng, lỗi provider và bộ lọc thường. Không lỗi page/console/network ngoài 401/503 đã mô phỏng, không tràn ngang. Đã xem PNG mobile `tmp/ai01-390.png`; scenario trong e2e. Kiểm tra phát hiện và sửa step giá thường phải nhận decimal và tên truy cập textarea cần ổn định sau khi nhập. Lượt đầu integration test lỗi do Mockito restub exception; sửa fixture, lượt cuối exit0.

Không gọi Gemini thật hoặc chạy UI nối database ứng dụng; chỉ provider HTTP loopback và integration SQL test. V58 đăng ký startup nhưng không apply thủ công lên database ứng dụng. Chạy lại backend nhánh mới để nạp schema/API; dùng cấu hình Gemini đã có hoặc tắt riêng bằng ASSISTANCE_AI_ENABLED=false. Không push/PR.
