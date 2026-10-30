# Sổ quỹ thu–chi thật

## Phần 1: Nền tảng API

- Chỉ chủ nhà đã xác minh được thao tác trên tài sản của mình; tài sản/phiếu không thuộc quyền trả 404.
- Mỗi phiếu có tài sản, chiều thu/chi, ngày thực thu/chi, số tiền dương (tối đa 13 chữ số nguyên, 2 số lẻ), danh mục, người nộp/nhận, nội dung, phương thức tiền mặt/chuyển khoản, mã tham chiếu tùy chọn.
- Ngày giao dịch từ 1900 đến hôm nay theo Asia/Ho_Chi_Minh. Ngày tạo và ngày xác nhận lưu riêng theo UTC.
- Tạo phiếu luôn ở DRAFT. Chủ nhà chỉ xác nhận POSTED sau khi kiểm tra thực nhận/thực chi.
- Tổng tiền chỉ gồm POSTED, lấy theo ngày giao dịch và quyền sở hữu hiện tại, không phụ thuộc phân trang. Không gọi dòng tiền ròng là lợi nhuận.
- Hủy nháp hoặc phiếu đã xác nhận cần lý do. Giữ nội dung, người tạo/xác nhận/hủy và thời điểm; phiếu hủy không được tính vào tổng, không mở lại. Hủy là sửa sai ghi sổ; hoàn tiền thực tế cần tạo một phiếu chi riêng.
- Chưa có sửa/xóa phiếu. Nếu ghi sai thì hủy và tạo phiếu mới. Hủy phiếu cũ làm điều chỉnh lại tổng của tháng gốc.
- Mỗi lần tạo gửi UUID `requestKey`, duy trì khóa này khi thử lại sau lỗi mạng. Cùng tài sản/khóa/nội dung trả phiếu cũ; đổi nội dung với khóa cũ trả 409. Khóa database trên tài sản và ràng buộc unique bảo vệ gửi trùng.
- Xác nhận/hủy bắt buộc `version`; khóa phiếu và tải lại trước khi so phiên bản để tránh hai thao tác đồng thời ghi đè nhau.
- Mã THU/CHI sinh từ ID database, không dùng số ngẫu nhiên hoặc tháng cố định.
- API không lưu bộ nhớ đệm. Tiền trả dạng chuỗi thập phân để tránh mất chính xác.

## Endpoint

| Phương thức | Đường dẫn (sau `/api/v1/owner/cash-entries`) | Nội dung |
|---|---|---|
| POST | đường dẫn gốc | Tạo nháp |
| GET | đường dẫn gốc | Danh sách phân trang |
| GET | `/summary` | Tổng thu/chi, dòng tiền ròng, số phiếu đã xác nhận |
| GET | `/{id}` | Chi tiết và thông tin kiểm tra lịch sử |
| POST | `/{id}/post` | Xác nhận, body `{ "version": 0 }` |
| POST | `/{id}/cancel` | Hủy, body gồm `version`, `reason` |

Danh sách/tổng bắt buộc `month=YYYY-MM`, tùy chọn `propertyId` và `direction=INCOME|EXPENSE`.
Danh sách hỗ trợ thêm `status=DRAFT|POSTED|CANCELLED`, `page` và `size`. Tổng luôn chỉ tính POSTED, không theo tab trạng thái.

## Các phần nối tiếp

1. Giao diện bỏ dữ liệu mẫu, chọn tháng/tài sản, tạo và xác nhận/hủy phiếu.
2. Gắn khoản thu với hóa đơn và theo dõi thanh toán từng phần; không dùng phiếu thủ công không liên kết để tự đánh dấu hóa đơn đã thanh toán.
3. Gắn cọc/hoàn cọc và chi phí bảo trì với chứng từ nguồn, chống ghi trùng. Cọc cần theo dõi riêng, không coi là doanh thu thuê.
4. Tải chứng từ riêng tư và chi tiết căn hộ. Hiện `reference` chỉ là mã tham chiếu văn bản, chưa phải upload chứng từ.

Không tự nhận tiền từ QR/ảnh chuyển khoản; chưa có tích hợp ngân hàng. Không tự biến nghiệm thu bảo trì hay đối soát bàn giao thành giao dịch tiền.

## Kiểm tra

`CashEntryIntegrationTests` dùng database kiểm thử SQL Server riêng, transaction rollback: quyền truy cập, lưu/đọc, chống gửi trùng, xác nhận/hủy, phiên bản cũ, nhật ký, tổng tiền đầy đủ qua phân trang, lọc tháng/tài sản/chiều và kiểm tra đầu vào.
