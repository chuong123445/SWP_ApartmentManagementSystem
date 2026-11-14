# Cảnh báo giấy tờ không phù hợp

Bỏ thông báo lặp “Giấy tờ chưa được AI xác nhận phù hợp…” và nút tải lại đi kèm riêng cho trường hợp gate giấy tờ. Dùng chung câu “Chưa thể tiếp tục. Bỏ tệp không phù hợp, gửi lại giấy tờ đúng loại và quét lại.” với chữ đỏ/nền đỏ nhạt và role=alert, giữ chi tiết kết quả từng tệp ở phía trên. Lỗi DOCUMENT_SCAN_REQUIRED trả từ server cũng đi vào cảnh báo chung này; các lỗi khác vẫn có thông báo riêng.

Không thay backend, database hay cơ chế chặn. TypeScript và6Playwright MCP desktop1440/mobile390 scenarios PASS: sai loại, AI lỗi, JSON mâu thuẫn; không còn khối lặp/nút tải lại trong trường hợp này; resume vẫn chặn và tải lại tài liệu phù hợp đi tiếp được. Không lỗi bất ngờ hoặc tràn ngang; ảnh mobile đã xem. API fixtures, không gọi AI thật. Server test3196 dừng trước bàn giao; giữ3diagnostics có sẵn, không push.
