# Tách tiền thuê và điện nước

## Đã triển khai

- Chu kỳ 1/3/6/12 tháng trong bước điều kiện thuê, bản hợp đồng và PDF. Ngày đến hạn lấy từ hợp đồng.
- Màn hình lập hóa đơn có lựa chọn tiền thuê hoặc điện nước/dịch vụ. Hóa đơn tiền thuê hiển thị khoảng thu, số tháng và tổng tiền; điện nước dùng số công tơ hàng tháng.
- Chủ nhà và người thuê xem đúng chi tiết từng loại hóa đơn. Thanh toán và lịch sử dùng các API hiện có.
- Chế độ tự động tại Cài đặt Đơn giá của từng tài sản, gồm thủ công, tự lập nháp, tự lập và gửi. Mặc định tự lập nháp trước hạn tối đa 7 ngày.
- Kỳ thuê là các tháng dương lịch đầy đủ. Ngày lẻ đầu/cuối kỳ được nhắc để hai bên xử lý riêng. Phần tháng tròn còn lại cuối hợp đồng được lập theo số tháng thực tế.
- Tự động thu dùng transaction/khóa hợp đồng, chỉ tạo một hóa đơn cho một khoảng thu. Tạm dừng tự động khi hợp đồng có đề nghị kết thúc/bàn giao. Kỳ quá hạn do chủ nhà đối chiếu.

## Dữ liệu cũ

- V65 bổ sung các trường chu kỳ, ngày thanh toán, loại hóa đơn, khoảng thu, số tháng, đơn giá thuê tháng và chế độ tự động.
- Đã áp V65 hai lần trong cùng transaction vào DB local proptech_db, kiểm tra tính lặp lại và đối chiếu toàn bộ trường cũ của 6 bảng dữ liệu.
- 3 hợp đồng hiện có nhận chu kỳ 1 tháng. 1 hóa đơn hiện có được phân loại LEGACY, tiếp tục giữ thông tin thu và thanh toán.
- Sao lưu đã lưu và mở lại xác minh tại F:/2026/Fa26/DTD/tmp/separate-billing-backup-20261111-203918-316.xml.
- Các trường cũ, số tiền, lịch sử, bản nội dung và chữ ký đã khớp trước/sau cập nhật.

## Kiểm tra

- 160 kiểm thử frontend, TypeScript và build đã đạt. Còn cảnh báo Vite kích thước bundle/cấu hình đã có từ trước.
- Kiểm thử SQL đã chạy trong DB riêng ancu_contract_pdf_20261103. Lượt Billing33, policy3, amount3, contract1, PDF2 đạt. Bàn giao18 và 47 ca hợp đồng khác đạt trong lượt hồi quy trước. Bổ sung kiểm thử PDF chu kỳ 6 tháng và chặn tự động khi đang kết thúc thuê đều đạt.
- Playwright MCP bản build/API giả lập đạt 10 ca 1440px/390px cho lập hai loại hóa đơn, xem chi tiết người thuê, lưu tự động và lựa chọn đủ bốn chu kỳ.
- PDF hợp đồng 6 tháng đã xuất và xem trang đầu. Kiểm thử giữ nội dung hợp đồng cũ và phân trang đạt.

## Cách kiểm tra trên ứng dụng

1. Khởi động lại backend và frontend trên nhánh công việc.
2. Khi soạn hợp đồng, ở bước điều kiện thuê chọn 1/3/6/12 tháng, xem PDF rồi ký theo OTP như trước.
3. Trong Hóa đơn & Thu chọn Lập hóa đơn mới, đổi Loại hóa đơn để lập tiền thuê hoặc điện nước.
4. Gửi tiền thuê rồi lập điện nước cùng tháng để kiểm tra hai luồng độc lập. Xem lại bằng tài khoản khách thuê.
5. Chọn từng tài sản ở Cài đặt Đơn giá để đổi chế độ tự động. Hợp đồng hoạt động có kỳ thu đến hạn trong 7 ngày được tạo sau lượt scheduler, mặc định mỗi 15 phút và lượt đầu sau 60 giây.
6. Với ngày lẻ hoặc kỳ quá hạn, chủ nhà đối chiếu và xử lý riêng trước khi kết thúc thuê.
