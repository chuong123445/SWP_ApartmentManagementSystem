# Hợp đồng mẫu hết hạn cho huuha205

Đã tạo trực tiếp trong SQL Server local `proptech_db` theo yêu cầu ngày 02/11/2026:

| Mục | Giá trị |
| --- | --- |
| Hợp đồng | HD-4, `local_fixture=true` |
| Khách thuê | `huuha205@gmail.com`, account 2 |
| Chủ nhà | `owner@ancu.local`, account 3 |
| Tài sản | An Cư Thủ Đức, property 2 |
| Căn hộ mẫu mới | `HH205.TEST`, apartment 16, HIDDEN / OCCUPIED |
| Yêu cầu thuê mẫu | 39, ACCEPTED |
| Thời hạn | 01/05/2026–31/10/2026 |
| Tiền thuê / cọc | 8.500.000 / 2.000.000 đồng |
| Chỉ số điện / nước đầu | 1000 / 100, số liệu mẫu explicit |

Hợp đồng giữ trạng thái ACTIVE nhưng ngày kết thúc đã qua; đây là điều kiện của luồng bàn giao/ký tiếp hiện tại. Không đặt ENDED trước khi hai bên xử lý. Không có hóa đơn, biên bản bàn giao hoặc hợp đồng kế tiếp trên mẫu mới.

Người dùng cho phép sao chép hai ảnh chữ ký và thời gian ký từ HD-2. Đã kiểm tra SHA-256 của từng ảnh khớp bản gốc, thời gian giữ nguyên. Nội dung và căn hộ có nhãn mẫu, asset snapshot có `localFixture=true`; không coi ảnh sao chép là đồng ý mới. Không sao chép `signed_content_hash` của nội dung cũ. Bản ký tiếp tạo qua ứng dụng vẫn yêu cầu hai bên ký lại.

Script `ancu-proptech-backend/tools/add-huuha-expired-contract.sql` mặc định preview, chỉ áp dụng khi đổi `@Apply` thành 1; khóa transaction và marker ngăn tạo trùng, không reset mẫu sau khi đã thử. Chỉ thêm căn hộ, yêu cầu, hợp đồng và draft; không cập nhật tài khoản, property, HD-2, chữ ký gốc hoặc hóa đơn. Không có startup hook.

Kiểm tra thực tế: preview PASS; Apply PASS; SELECT xác nhận đúng một bộ bốn bản ghi, snapshot asset ID 16 và chữ ký khớp; Apply lần hai trả `created=false`, giữ ID cũ. HD-2 vẫn ACTIVE, apartment 8 OCCUPIED, version 1, kết thúc 30/06/2027. Kiểm tra diff PASS. Truy vấn fingerprint tổng hợp trước Apply không chạy được do trùng tên cột trong FOR JSON; không có bằng chứng fingerprint trước/sau toàn bộ dữ liệu. SQL đã review chỉ có INSERT cho mẫu mới.

Playwright MCP mở trang hợp đồng nhưng phiên guest chuyển `/login`; csrf/config 200, refresh 401 do chưa có session, favicon 404. Chưa xác minh UI có đăng nhập, chưa thực hiện bàn giao/ký tiếp và không ghi kết quả luồng là PASS. SQL Server thực tế 17.0.1000.7; JSON_MODIFY đối chiếu tài liệu Microsoft qua Context7, không có tài liệu pin build cụ thể.

Đăng nhập Owner → mở `http://localhost:3000/contracts/4` → chọn **Tạo hợp đồng ký tiếp** hoặc **Lập biên bản bàn giao**. Khách đăng nhập `huuha205@gmail.com` mở cùng liên kết để ký bản mới hoặc xác nhận bàn giao. Hai hướng không thể mở đồng thời; hủy thao tác đang chờ qua ứng dụng trước khi thử hướng còn lại. Khi một hướng đã hoàn tất, script không tự khôi phục/reset để thử lại.
