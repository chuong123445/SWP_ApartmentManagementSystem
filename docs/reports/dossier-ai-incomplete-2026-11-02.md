# Kiểm tra lỗi AI quét hồ sơ — 02/11/2026

## Bằng chứng thực tế

- Main bắt đầu tại `1e626fe`, working tree sạch. SQL chỉ đọc đúng source hash người dùng cung cấp: dossier 2, một tệp PNG, model `gemini-2.5-flash`, prompt `dossier-review-v1`, FAILED, `PROVIDER_INCOMPLETE`, attempts 2, version 7.
- Tạo hàng quét 30/10/2026 18:08:07 UTC (31/10 01:08:07 UTC+7). Lượt cuối bắt đầu 02/11 07:40:44 UTC, kết thúc 07:41:04 UTC: khoảng 20 giây. Khoảng hai ngày hiển thị không phải thời gian của một HTTP request.
- Code chỉ phát `PROVIDER_INCOMPLETE` sau HTTP 200 khi candidate không dừng bằng STOP. Key/model local có cấu hình. Đây không phải nhánh lỗi xác thực HTTP 401/403 hay thiếu cấu hình.
- Bản cũ không lưu/log finishReason hoặc usageMetadata. Không thể chứng minh MAX_TOKENS, SAFETY, SPII hay thiếu candidate là nguyên nhân chính xác của lượt cũ. Không suy ra lỗi tài liệu hoặc giấy tờ không hợp lệ.
- Kiểm tra gọi provider trực tiếp thất bại tại kết nối HTTPS: WebException/ReceiveFailure. Không nhận được phản hồi Gemini để so sánh trước/sau; không có kết quả quét thật mới. Chẩn đoán không thay đổi database.
- Playwright MCP mở localhost:3000 được, API công khai trả 200; refresh 401 và chuyển login vì không có phiên Admin. Ngoại mạng ảnh/font ERR_INTERNET_DISCONNECTED. Chưa kiểm tra được thao tác quét thật trong phiên Admin.

## Sửa cấu hình và khả năng chẩn đoán

GeminiDossierAiClient gửi tối đa 4096 token và không giới hạn suy luận. Tài liệu Google qua Context7 xác nhận Flash 2.5 mặc định suy luận động; suy luận và kết quả dùng chung ngân sách output. Đây là nguy cơ cắt JSON, chưa phải bằng chứng nguyên nhân của lượt cũ.

- Riêng Flash 2.5 stable/preview: output limit 16384, thinking budget 1024. Model khác giữ nguyên, không gửi tham số có thể không tương thích.
- Log enum finish/block đã allowlist và số token khi phản hồi chưa hoàn tất; không log key, nguồn, tên tệp hoặc trích xuất. Mã lỗi/API/UI giữ nguyên.
- Giữ quy tắc chỉ nhận STOP và JSON đúng cấu trúc; không nhận phần JSON bị cắt, không tự kết luận/phê duyệt, không thay quyền hoặc quyết định Admin.
- Không đổi prompt/schema, không migration, không sửa trạng thái hồ sơ/tài sản/fixtures hay tự chạy lại bản ghi FAILED. Không restart server của người dùng.

## Kiểm tra

- `DossierAiClientTests`: 12 tests PASS, HTTP server tổng hợp. Bao gồm budget Flash, không áp tham số Flash lên Pro/3/image, từ chối MAX_TOKENS dù body là JSON hợp lệ, key không nằm trong URL, đính kèm/schema, phân tích và bảo mật log. Đây không phải gọi Gemini thật.
- `PropertyDossierIntegrationTests`: 15 tests PASS trên SQL clone `ancu_identity_verify_20261027213854`, profile test, seed/mail/scheduler tắt, AI client mock. Có retry tối đa ba lần, snapshot/hash, quyền Admin, không tự duyệt, stale worker. Không chạy trên proptech_db.
- Không sửa frontend; kiểm tra browser live chỉ đọc như ghi ở trên. Chưa xác nhận quét thành công sau bản sửa vì kết nối provider chưa thực hiện được.

## Tiếp tục

Khởi động lại backend để nạp bản sửa. Admin mở dossier 2 → Quét lại hồ sơ. Nếu vẫn lỗi, log mới phân biệt hết token với provider block/thiếu candidate. Cần kết quả Gemini thật trước khi kết luận tính năng đã hoạt động hoàn toàn.

Tài liệu chính thức: [Thinking budget](https://ai.google.dev/gemini-api/docs/generate-content/thinking), [FinishReason và BlockReason](https://ai.google.dev/api/generate-content#FinishReason). Java21/SpringBoot4.1.1, gọi Gemini v1beta bằng Java HttpClient, không dùng SDK Gemini cho luồng backend này.
