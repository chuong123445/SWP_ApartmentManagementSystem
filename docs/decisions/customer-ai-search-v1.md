# AI-01 — Tìm phòng bằng tiếng Việt

User mô tả tối đa 1.000 ký tự và đồng ý gửi mô tả đến Gemini. Server chỉ gửi mô tả và các địa chỉ trong catalog công khai. Prompt `apartment-search-v1` yêu cầu JSON có cấu trúc; server kiểm tra lại khóa, kiểu, giới hạn, thứ tự min/max và địa chỉ đúng catalog. Không chấp nhận SQL, actor ID hoặc danh sách phòng do mô hình sinh ra. Yêu cầu không hỗ trợ/không rõ được nêu để người dùng xem lại; không có bộ lọc thì không được áp dụng.

`POST /api/v1/apartments/ai-search` nhận `{text,consent:true}`, trả `runId/sourceHash/model/promptVersion/createdAt/filters/notes/canApply`. Chưa truy vấn kết quả theo gợi ý. Người dùng được sửa bộ lọc rồi xác nhận `POST /api/v1/apartments/ai-search/{runId}/apply` với `{filters}`. Run UUID là capability riêng, hết hạn sau 15 phút; áp dụng lặp cùng nội dung được phép, khác nội dung sau khi áp dụng trả 409. Sau đó dùng search thông thường; không lưu mô tả gốc hoặc địa chỉ IP, chỉ hash nguồn và filter đã đề xuất/được áp dụng.

`GET /api/v1/apartments` bổ sung `minArea/maxArea/occupants`; capacity `maxOccupants >= occupants`. Tất cả điều kiện cùng áp vào một Apartment thỏa VACANT/PUBLISHED/Property APPROVED/Owner đủ điều kiện/quyền khai thác còn hiệu lực; không nới lỏng kết quả rỗng. Hook theo dõi cả ba filter mới. Frontend normal search hỗ trợ giá có phần thập phân để giữ ranh giới nghiêm ngặt dưới/trên do AI đề xuất.

V58 lưu metadata lượt AI và kết quả/filter được chấp nhận, độc lập dữ liệu hồ sơ Admin. Rate limit 10 lượt/phút/key, tối đa 4 HTTP đang chạy, map tối đa 2.000 key có dọn hạn; key IP được băm, không tin header proxy từ client. Giới hạn này theo process, không tuyên bố giới hạn toàn cụm. HTTP ngoài transaction; có timeout, giới hạn kích thước output, STOP-only và kiểm tra JSON. Lỗi không có dữ liệu giả; bộ lọc thường vẫn hoạt động.

Dùng cấu hình `app.dossier-ai` Gemini hiện có (enabled/key/model/baseUrl). `ASSISTANCE_AI_ENABLED=false` tắt riêng AI hỗ trợ; mặc định bật khi cấu hình Gemini hiện có đủ. Khóa chỉ ở backend, không đưa vào frontend hoặc URL. Context7 đối chiếu Gemini REST/thinking 2.5 và Spring Data JPA 4.1.0 gần nhất với managed 4.1.1. Không thêm SDK/dependency.


## Override 09 November 2026 — conversational widget and automatic filters

User explicitly replaces the embedded AI form/manual review with a floating bottom-right chat icon. The panel is closed initially, supports ordinary questions and rental advice as well as searching, keeps recent conversation in component memory while collapsed, and automatically applies validated complete filters on search/refinement requests. No extra analysis or confirmation button. The normal Home filter controls stay editable and results use the ordinary catalog API. General conversation/all-null filters never triggers apply; provider/apply failures leave current filters intact and show an error.

POST `/api/v1/apartments/ai-chat` accepts `{text,consent:true,history:[{role,text}]}`: current message <=1000 characters, <=8 prior messages with user/assistant roles only and <=2000 characters each. Returns `{reply,search}` where search is the existing validated Result/capability. `apartment-chat-v1` combines relevant prior user criteria for refinement and returns all-null filters for ordinary chat. Unknown/unsupported locations remain explicit rather than silently broadening. Server validates output structure, reply, filters and catalog address hierarchy before returning. Reply is plain text rendered by React, no HTML/tools/private account data. Existing throttling/provider configuration and apply expiry/version behavior are reused. Consent covers sending conversation to Gemini. History stays in frontend memory; only its combined source hash and existing validated search metadata are persisted, not raw conversation or reply. No schema migration/provider SDK change. Existing `/ai-search` endpoint remains compatible; its old manual-review UI is superseded.

Validation: see `docs/reports/home-ai-chat-2026-11-09.md`. Restart backend and reload frontend for the new route. Live Gemini conversation is not verified by fixture-based browser and mocked-provider integration checks.


## Override 09 November 2026 — automatic AI consent

User requested removing Gemini consent checkboxes throughout the AI flows, including rental property uploads. Chat and the shared Owner/applicant dossier precheck now submit consent:true automatically when the user sends a message or starts scanning. API clients already send this value. The checkbox state, client-side consent gates and unused chat consent styles were removed. Updated browser scenarios assert checkbox absence and successful commands with automatic consent.
