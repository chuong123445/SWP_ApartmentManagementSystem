# Ba hợp đồng mẫu kiểm tra mốc nhắc hạn cho Hữu Hà

Đã thêm vào SQL Server local `proptech_db` cho `huuha205@gmail.com` (Customer 2), Owner `owner@ancu.local` (3), tài sản An Cư Thủ Đức (2). Bộ ba mốc được hiểu là 10/20/21 ngày; đã nêu giả định và gửi câu hỏi tùy chọn trước khi áp dụng, không có trả lời thay đổi trong quá trình thực hiện.

| Hợp đồng | Căn hộ riêng | Apartment ID | Request ID | Còn lại ngày 02/11/2026 | Ngày hết hạn |
| --- | --- | --- | --- | --- | --- |
| HD-5 | HH205.D10 | 17 | 40 | 10 ngày | 12/11/2026 |
| HD-6 | HH205.D20 | 18 | 41 | 20 ngày | 22/11/2026 |
| HD-7 | HH205.D21 | 19 | 42 | 21 ngày | 23/11/2026 |

Ba căn đều HIDDEN/OCCUPIED, ba hợp đồng ACTIVE/local_fixture và có draft snapshot riêng trỏ đúng căn mới. Bắt đầu 01/05/2026; thuê 8.500.000đ/tháng, cọc 2.000.000đ, baseline mẫu điện 1000/nước 100. Không tạo hóa đơn hoặc thay đổi hợp đồng cũ. Ảnh chữ ký và thời điểm ký sao chép từ HD-2 theo cho phép fixture trước đó; so sánh SHA-256 ảnh và thời điểm đều khớp. Không sao chép signed_content_hash cũ; nội dung có nhãn mẫu và asset.localFixture=true, không phải chứng nhận chấp thuận nội dung mới.

Script `ancu-proptech-backend/tools/add-huuha-reminder-contracts.sql` mặc định preview, cố định anchor 02/11/2026. Chỉ đổi `@Apply=1` để thêm; application lock/transaction và guard exact parties/source/marker/three-distinct-contracts ngăn tạo trùng hoặc reset bộ đã dùng. Không phải startup seed. Tạo mới ở ngày khác bị chặn thay vì tự dịch ngày hết hạn; các bản đã tạo được giữ nguyên.

Kiểm tra thực tế:

- Preview SQL PASS. Lần Apply đầu mắc lỗi biến vòng lặp còn giá trị khi SELECT không có hàng, nên chỉ tạo mốc 10 (HD-5); không sửa dữ liệu cũ. Đã sửa reset biến tường minh, thêm assertion ba apartment/contract khác nhau trước COMMIT, chạy lại giữ HD-5 và thêm đúng HD-6/HD-7. Script cuối đã review và chạy lại PASS.
- Readback đúng ba ngày còn lại, ba ID căn khác nhau, đúng customer/Owner, ba request ACCEPTED, snapshots có apartment/room/localFixture đúng, hai chữ ký khớp nguồn, không hóa đơn.
- Apply cuối lần nữa trả created=false cho cả ba, giữ nguyên tất cả ID. Không cần reset để kiểm tra lại.
- Số dòng apartments 16→19, requests 39→42, contracts 4→7, drafts 2→5. Fingerprint SHA-256 của toàn bộ các hàng đã tồn tại trước task ở cả bốn bảng, sắp theo ID và gồm null/binary JSON, khớp hoàn toàn trước/sau. Các fingerprint chỉ chứa hash, không xuất nội dung riêng tư. Bằng chứng metadata trong ignored `tmp/huuha-reminder-before.json` và `tmp/huuha-reminder-after.json` ở workspace root.
- Context7 đối chiếu Microsoft SQL DATEADD/DATEDIFF và SELECT giữ giá trị biến khi không có hàng; runtime SQL Server 17 đã xác minh trong task trước, không có tài liệu pin build riêng. Không thay đổi code ứng dụng nên không mở browser hoặc chạy lại suite app cho thao tác dữ liệu này.

Hiện kiểm tra DB cho thấy V42 chưa được áp dụng (`contract_expiry_notices` chưa tồn tại); chưa restart server hoặc tự tạo notices/request thuê tiếp. Sau khi restart Backend mới, job thường chạy sau khoảng một phút: HD-5 đủ mốc 10, HD-6 đủ mốc 20; HD-7 chưa đủ mốc ngày 02/11, đến ngày 03/11 còn 20 ngày thì được xét. Đây là kỳ vọng theo policy đã có, chưa phải kết quả quan sát thông báo thực tế.

Hữu Hà và Owner mở `/contracts/5`, `/contracts/6`, `/contracts/7` để xem và thử luồng bằng đúng tài khoản. Không đổi credential, verification, property approval/publication, HD-2/HD-4, schema hoặc provider. Không push.
