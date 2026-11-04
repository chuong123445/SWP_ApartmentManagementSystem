# Home chỉ nhắc khi có hóa đơn chưa thanh toán

Thay khối “Căn hộ đang thuê & hóa đơn” bằng thông báo ngắn **Bạn có hóa đơn chưa thanh toán** và nút **Thanh toán ngay**. Không hiển thị tên căn, danh sách hóa đơn, số tiền hoặc câu “Chưa có hóa đơn được Owner gửi” trên Home.

- Dùng các API exact-recipient hiện có với `paymentStatus=UNPAID`, gồm hóa đơn tháng và hóa đơn bổ sung. Guest/account chưa đủ điều kiện không gọi API hóa đơn từ khối này; key theo account tránh giữ dữ liệu giữa phiên. Khoản nợ cũ vẫn được nhắc dù không còn ACTIVE tenancy, miễn tài khoản vẫn đủ điều kiện xem hóa đơn của mình.
- Không có unpaid thì ẩn toàn bộ. Trong khi tải hoặc lỗi nguồn dữ liệu cũng không hiển thị thông báo nợ chưa xác định; người dùng vẫn có trang Hóa đơn qua menu tài khoản.
- Đúng một hóa đơn và tải đủ hai nguồn: mở thẳng `/my/invoices/{id}` hoặc `/my/invoices/additional/{id}`, nơi có phần thanh toán hiện có. Nhiều hóa đơn: mở `/my/invoices`, mặc định Chưa thanh toán để người dùng chọn; không áp thứ tự thanh toán hoặc chọn thay người dùng.
- Chỉ đọc dữ liệu và điều hướng; không tự tạo QR, gọi provider, ghi nhận thanh toán hoặc thay số tiền/trạng thái hóa đơn.

Kiểm tra: TypeScript PASS; toàn bộ 90 frontend unit hiện có PASS; 14 callback Playwright MCP desktop1440/mobile390 PASS cho empty/paid/monthly/additional/multiple/guest/error. Có kiểm tra href, click đến phần Thanh toán hóa đơn hoặc danh sách UNPAID, không lộ căn/số tiền trên banner, không POST thanh toán và không tràn ngang. API fixtures, không phải giao dịch thật. Lượt đầu fixture đếm đúng hai request bị StrictMode gọi effect lặp; đổi assertion sang hai endpoint khác nhau, 14 ca chạy lại PASS. Đã xem ảnh mobile `tmp/home-unpaid-mobile.png`. Browser mock được gỡ và tab về about:blank ngay trong lượt cleanup.

Native-config Vite build PASS (cùng React/Tailwind/alias, config tạm ignored; cảnh báo bundle >500kB có sẵn). Không đổi dependency, backend API, schema, dữ liệu mẫu hoặc phần sửa AI. Unit này độc lập, được tách nhánh/PR riêng vào main cùng đợt sắp xếp các unit trước; không commit trực tiếp vào main.
