# Bộ dữ liệu demo thuê căn hộ ngày 09/11/2026

## Phạm vi

Nhánh `fix/local-rental-demo` từ `3907b5e`.

- Điền sức chứa còn thiếu và hiển thị cho khách tại danh sách phòng, chi tiết phòng.
- Thẻ tài sản dùng ảnh phòng công khai phù hợp bộ lọc khi chưa có ảnh chung. Ưu tiên phòng có ảnh, giữ nguyên ảnh chung nếu đã có.
- Giữ hai hợp đồng của Hữu Hà để trình bày thuê tiếp và bàn giao.
- Xóa các quan hệ thuê còn lại cùng dữ liệu phụ thuộc. Người dùng đã đồng ý dọn dữ liệu rút tiền demo của owner mất lịch sử hóa đơn đã thu.
- Công khai các phòng trống thuộc tài sản đã duyệt và còn quyền cho thuê.

## API và giao diện

`GET /api/v1/apartments` và `GET /api/v1/apartments/{id}` bổ sung `maxOccupants`, kiểu số nguyên hoặc null. Hồ sơ cũ thiếu sức chứa vẫn đọc được.

`ApartmentGroupRepository` dùng cùng điều kiện tìm kiếm để chọn phòng đại diện có ảnh. Ảnh của phòng ẩn, chưa duyệt hoặc không phù hợp bộ lọc không tham gia lựa chọn này.

## Dữ liệu đã áp dụng

Do kết nối SQL từ công cụ bị Windows chặn socket, người dùng chạy script tại terminal. Agent đọc lại file audit được xuất sau khi áp dụng.

| Nội dung | Kết quả |
| --- | --- |
| Hợp đồng giữ lại | HD-4, tài khoản 2, phòng 16 / HH205.TEST, hết hạn 31/10/2026 |
| Hợp đồng giữ lại | HD-5, tài khoản 2, phòng 17 / HH205.D10, hết hạn 12/11/2026 |
| Quan hệ yêu cầu thuê giữ lại | 39 và 40 |
| Tổng hợp đồng và yêu cầu thuê còn lại | 2 hợp đồng, 2 yêu cầu |
| Phòng công khai, trống | 14 |
| Phòng còn thiếu sức chứa | 0 |
| Phòng chưa đủ điều kiện kiểm duyệt | 7 phòng giữ nháp, gồm 4 nháp, 2 chờ duyệt, 1 bị từ chối |

Sức chứa còn thiếu được điền theo diện tích, dưới 25 m² cho 1 người, từ 25 đến dưới 40 m² cho 2 người, từ 40 m² cho 3 người. Đây là lựa chọn cho dữ liệu demo. Sức chứa đã khai báo được giữ nguyên, kể cả giá trị lớn hơn 3.

Hai hợp đồng giữ nguyên ngày, chữ ký và snapshot. Script đối chiếu toàn bộ nội dung bản nháp đã ký trong transaction. Bản sao trước thay đổi bao gồm 22 bảng, lưu tại `F:/2026/Fa26/DTD/tmp/local-rental-demo-backup-20261109-125304-458.xml`. Bản sao đã được mở lại, đối chiếu số hàng và toàn bộ nội dung DataSet trước khi áp dụng. File chứa dữ liệu riêng tư và nằm ngoài Git.

## Cách chạy script

`ancu-proptech-backend/tools/local-rental-demo.ps1` mặc định chạy các thay đổi rồi rollback để kiểm tra. Thêm `-Apply` để sao lưu và commit transaction. Đây là công cụ một lần cho đúng bộ dữ liệu đã audit. Các ID, thời hạn và tài khoản được kiểm tra trước khi xóa. Khi có phòng hoặc yêu cầu mới vượt phạm vi đã audit, script dừng để đọc lại dữ liệu.

Script chỉ kết nối localhost, database `proptech_db`. Không đặt trong startup hoặc migration.

## Kiểm tra

- Backend compile/testCompile và 4 unit tests đạt.
- Frontend 152 unit tests, TypeScript và Vite build đạt. Build còn cảnh báo kích thước bundle có sẵn.
- Playwright MCP chạy bản build mới với API fixtures ở 1440 và 390 px. Ảnh đại diện, mở danh sách phòng, sức chứa và điều hướng chi tiết đạt. Không tràn ngang hoặc lỗi console/network ngoài fixture. Đã xem ảnh chụp mobile.
- SQL validate rollback và apply đạt tại terminal người dùng. File audit sau apply xác nhận hai hợp đồng, sức chứa và trạng thái phòng.
- Backend live chưa chạy ở cổng 8080 khi kiểm tra. Cần khởi động backend với code mới để xác minh API nhóm và ảnh thật từ database.
- Audit bổ sung xác nhận ba tài sản không có ảnh trong bảng property_images. Hai tài sản đầu dùng cover ảnh phòng cũ. A1205 chưa có ảnh, nên script bổ sung ảnh nội thất có sẵn /apartment/images/apartment4.jpg khi cover vẫn thiếu, giữ nguyên ảnh thật nếu đã bổ sung. Đã validate rollback và apply lúc 12:57, audit sau apply xác nhận cover A1205 là /apartment/images/apartment4.jpg. Bản sao lần hai local-rental-demo-backup-20261109-125754-665.xml. Đối chiếu hai bản sao cho thấy toàn bộ cột của hai hợp đồng và hai draft đã ký giữ nguyên.

Ba file chẩn đoán VNeID có sẵn được giữ nguyên và loại khỏi commit.
