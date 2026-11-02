# Chốt điện nước và lập hóa đơn

- Mỗi hợp đồng có kỳ lập hóa đơn kế tiếp do server xác định; chỉ số đầu lấy từ hóa đơn đã gửi gần nhất hoặc chỉ số bàn giao.
- POST /api/v1/owner/contracts/{id}/meter-readings lưu chỉ số cuối theo kỳ, tăng baselineVersion để phát hiện chỉnh sửa đồng thời.
- Mặc định dùng giá đã thỏa thuận trong hợp đồng. Chủ nhà có thể chọn rõ Áp dụng đơn giá cài đặt cho kỳ này. Khi chọn, server đọc cấu hình đúng tài sản, kiểm tra settingsVersion và lưu bản chụp đơn giá điện, nước, chế độ nước, internet, vệ sinh.
- Việc thay đổi cài đặt không tự sửa hợp đồng đã ký hoặc hóa đơn cũ. Đơn giá đã chốt không thay đổi khi cấu hình được sửa sau đó; chủ nhà cần chốt lại nếu muốn áp dụng giá mới cho kỳ chưa lập hóa đơn.
- Nước theo người dùng số người trong hợp đồng, không yêu cầu nhập đồng hồ nước mới.
- Chỉ chốt kỳ tiếp theo của hợp đồng ACTIVE, đủ chỉ số bàn giao và kỳ trọn tháng. Không chốt vào kỳ đã có hóa đơn nháp/gửi.
- Migrations: V42__billing_meter_readings.sql, idempotent và không tự sinh dữ liệu demo.

- Lập hóa đơn với useSavedReadings=true: không cần truyền lại chỉ số. Server lấy bản đã chốt và tính tổng; nếu truyền chỉ số khác bản chốt thì trả SAVED_READING_MISMATCH. baselineVersion chống lập hóa đơn bằng dữ liệu đã bị sửa. Gửi hóa đơn xong, kỳ sau tự lấy chỉ số cuối kỳ này làm đầu kỳ.
