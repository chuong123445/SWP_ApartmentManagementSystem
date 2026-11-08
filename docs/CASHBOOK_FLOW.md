# Sổ quỹ thu chi

Chọn tài sản và tháng. Tạo phiếu thủ công lưu DRAFT. Xác nhận thực nhận/đã chi chuyển POSTED. Chỉ POSTED được tính vào tổng thực thu, thực chi và dòng tiền ròng. CANCELLED giữ lý do, người thực hiện, thời điểm và không tính vào tổng. Dòng tiền không được gọi là lợi nhuận.

## Liên kết nguồn

GET /api/v1/owner/cash-entries/sources?month=YYYY-MM&propertyId=... trả danh sách có phân trang.

- INVOICE: chỉ hóa đơn tháng SENT có InvoicePayment.paidAt, đủ số tiền, đúng chủ nhà. Lọc tháng theo ngày thanh toán ở múi giờ Việt Nam, không theo kỳ hóa đơn. Ngày và phương thức phiếu thu lấy từ dữ liệu thanh toán phía server.
- MAINTENANCE: chỉ sự cố RESOLVED có phân bổ chi phí rõ ràng, actualCost - customerCost > 0. Danh sách hiển thị các sự cố chưa lập phiếu bất kể tháng nghiệm thu, vì ngày nghiệm thu không phải ngày trả tiền. Chủ nhà tự chọn ngày thực trả, phương thức thanh toán.
- POST /api/v1/owner/cash-entries/from-source nhận type, id, transactionDate, paymentMethod. Không nhận số tiền từ frontend. Tạo phiếu NHÁP để chủ nhà kiểm tra trước khi ghi sổ; không tự ghi chi khi sửa chữa hoàn thành.
- Liên kết hóa đơn/sự cố bằng FK, chỉ một nguồn trên phiếu. Khóa tài sản + unique index chống tạo trùng; gửi lại cùng nguồn trả phiếu hiện có. Phiếu đã hủy vẫn giữ liên kết và không tự tạo lại.
- Chỉ tổng hợp phần đã liên kết qua hệ thống, không suy đoán trùng với các phiếu thủ công không có nguồn. Không tự backfill hay ghi nhận các khoản cũ thành thực thu/chi.
- Các khoản thu bổ sung/TestPayment không tự nhập vào nguồn hóa đơn tháng. Không tự hoàn cọc, chuyển tiền, hoặc thanh toán cho thợ.
- Migration V46__cash_entry_sources.sql thêm liên kết và index, idempotent. Tất cả API yêu cầu đúng chủ nhà.
