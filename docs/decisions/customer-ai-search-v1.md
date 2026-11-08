# AI-01 — Tìm phòng bằng tiếng Việt

User mô tả tối đa 1.000 ký tự và đồng ý gửi mô tả đến Gemini. Server chỉ gửi mô tả và các địa chỉ trong catalog công khai. Prompt `apartment-search-v1` yêu cầu JSON có cấu trúc; server kiểm tra lại khóa, kiểu, giới hạn, thứ tự min/max và địa chỉ đúng catalog. Không chấp nhận SQL, actor ID hoặc danh sách phòng do mô hình sinh ra. Yêu cầu không hỗ trợ/không rõ được nêu để người dùng xem lại; không có bộ lọc thì không được áp dụng.

`POST /api/v1/apartments/ai-search` nhận `{text,consent:true}`, trả `runId/sourceHash/model/promptVersion/createdAt/filters/notes/canApply`. Chưa truy vấn kết quả theo gợi ý. Người dùng được sửa bộ lọc rồi xác nhận `POST /api/v1/apartments/ai-search/{runId}/apply` với `{filters}`. Run UUID là capability riêng, hết hạn sau 15 phút; áp dụng lặp cùng nội dung được phép, khác nội dung sau khi áp dụng trả 409. Sau đó dùng search thông thường; không lưu mô tả gốc hoặc địa chỉ IP, chỉ hash nguồn và filter đã đề xuất/được áp dụng.

`GET /api/v1/apartments` bổ sung `minArea/maxArea/occupants`; capacity `maxOccupants >= occupants`. Tất cả điều kiện cùng áp vào một Apartment thỏa VACANT/PUBLISHED/Property APPROVED/Owner đủ điều kiện/quyền khai thác còn hiệu lực; không nới lỏng kết quả rỗng. Hook theo dõi cả ba filter mới. Frontend normal search hỗ trợ giá có phần thập phân để giữ ranh giới nghiêm ngặt dưới/trên do AI đề xuất.

V58 lưu metadata lượt AI và kết quả/filter được chấp nhận, độc lập dữ liệu hồ sơ Admin. Rate limit 10 lượt/phút/key, tối đa 4 HTTP đang chạy, map tối đa 2.000 key có dọn hạn; key IP được băm, không tin header proxy từ client. Giới hạn này theo process, không tuyên bố giới hạn toàn cụm. HTTP ngoài transaction; có timeout, giới hạn kích thước output, STOP-only và kiểm tra JSON. Lỗi không có dữ liệu giả; bộ lọc thường vẫn hoạt động.

Dùng cấu hình `app.dossier-ai` Gemini hiện có (enabled/key/model/baseUrl). `ASSISTANCE_AI_ENABLED=false` tắt riêng AI hỗ trợ; mặc định bật khi cấu hình Gemini hiện có đủ. Khóa chỉ ở backend, không đưa vào frontend hoặc URL. Context7 đối chiếu Gemini REST/thinking 2.5 và Spring Data JPA 4.1.0 gần nhất với managed 4.1.1. Không thêm SDK/dependency.
