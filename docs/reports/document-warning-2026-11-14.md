# Cảnh báo giấy tờ không phù hợp

Bỏ thông báo lặp “Giấy tờ chưa được AI xác nhận phù hợp…” và nút tải lại đi kèm riêng cho trường hợp gate giấy tờ. Dùng chung câu “Chưa thể tiếp tục. Bỏ tệp không phù hợp, gửi lại giấy tờ đúng loại và quét lại.” với chữ đỏ/nền đỏ nhạt và role=alert, giữ chi tiết kết quả từng tệp ở phía trên. Lỗi DOCUMENT_SCAN_REQUIRED trả từ server cũng đi vào cảnh báo chung này; các lỗi khác vẫn có thông báo riêng.

Không thay backend, database hay cơ chế chặn. TypeScript và6Playwright MCP desktop1440/mobile390 scenarios PASS: sai loại, AI lỗi, JSON mâu thuẫn; không còn khối lặp/nút tải lại trong trường hợp này; resume vẫn chặn và tải lại tài liệu phù hợp đi tiếp được. Không lỗi bất ngờ hoặc tràn ngang; ảnh mobile đã xem. API fixtures, không gọi AI thật. Server test3196 dừng trước bàn giao; giữ3diagnostics có sẵn, không push.


## Sửa vòng đời kết quả khi đổi giấy tờ

Lỗi trước đây được giữ dưới dạng mảng chuỗi chung nên bỏ tệp vẫn còn thông báo, và các tệp trùng tên/lỗi hiển thị lặp. Nay mỗi kết quả gắn fileId, lọc theo tệp đang được giữ; bỏ tệp xóa lỗi tương ứng, bắt đầu quét lại xóa kết quả cũ của các tệp đó và trạng thái lỗi chung cũ. Khi tải tệp mới, hiển thị trạng thái đang tải/quét; kết quả mới thay kết quả cũ. Gộp các dòng có cùng nội dung khi hiển thị nhưng giữ liên kết từng fileId, do đó bỏ một tệp không che lỗi thật của tệp khác vẫn đang được chọn. Đổi bản nháp cũng reset thông báo.

TypeScript và6MCP desktop1440/mobile390 PASS, mở rộng regression với upload hai tệp cùng tên/lỗi chỉ hiện một dòng, bỏ hết tệp sai xóa hết thông báo tương ứng, tải tệp phù hợp không còn cảnh báo cũ và đi tiếp bình thường. Backend gate không đổi. Không gọi AI thật; giữ3diagnostics, server3196 dừng trước bàn giao, không push.
