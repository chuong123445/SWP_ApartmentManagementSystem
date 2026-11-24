# Lỗi nhập hợp đồng tại trường

24/11/2026 — ảnh người dùng cho thấy ngày kết thúc sai nhưng lỗi nằm cuối modal. ContractWizard (tạo/sửa/thuê tiếp dùng chung) chuyển từ lỗi validation chuỗi đầu tiên sang bản đồ lỗi theo trường.

Ngày, tiền thuê/cọc/điện/nước/dịch vụ, số người, chu kỳ/hạn đóng, phương thức/mục đích và từng tiêu đề/nội dung điều khoản có thông báo ngay dưới ô, viền đỏ, aria-invalid và aria-describedby. Next/review/save kiểm tra các trường liên quan, chuyển đúng bước rồi focus/scroll ô sai đầu tiên. Chỉ kiểm tra khi bấm Next/review/save. Khi nhập, xóa thông báo cũ của ô đó (hoặc nhóm ngày liên quan), không kiểm tra lại trực tiếp và không kéo con trỏ. Các lỗi ở ô không liên quan vẫn giữ. Giới hạn ngày/quyền cho thuê và quy tắc tính tiền không thay đổi.

Known server codes ngày/chu kỳ đưa lại đúng trường, giữ dữ liệu. Lỗi kết nối/concurrency không gán tùy tiện vào ô: thông báo chung có focus/scroll và giữ hành vi retry/reload cũ. Không thay JSON API hoặc quy tắc backend. Các biểu mẫu khác chưa được rà toàn bộ trong đơn vị này.

Kiểm tra:174frontend/TypeScript/build đạt. 6MCP desktop1440/mobile390 xclient/server/network xác minh nhiều lỗi đồng thời, sửa từng lỗi độc lập, vị trí inline nằm trong vùng cuộn, focus ngày/điều khoản, chuyển lại bước từ lỗi server, generalfailure/retry và bảo toàn dữ liệu/PDF. Thêm4MCP new/expireddraft datepolicyregression đạt (day91blocked/day90/min30/save/PDF/preserveddeposit). APIfixtures, không appDB/provider thật; ảnh contract-inline-errors-mobile.png đã xem. React19.0.1 theo manifest; Context7 official react.dev refs/effects aftercommit, tài liệu không gắn đúng patch19.0.1.

Cập nhật cùng ngày: không so sánh ngày trống như ngày quá khứ; bỏ hint đỏ trùng dưới ngày bắt đầu, mỗi ô chỉ có một thông báo validation. Nhắc nháp quá ngày chỉ ở trang xem bản đã lưu, không lặp ở bước nhập. Theo yêu cầu riêng, xóa đoạn giải thích dài về tối thiểu30ngày/thánglịch/ngàylẻ khỏi form; quy tắc/PDF/bản rà soát không đổi. 10MCP đã chạy lại gồm kiểm tra vào bước và nhập/blur ngày sai chưa có lỗi, bấmNext mới báo một lỗi.
