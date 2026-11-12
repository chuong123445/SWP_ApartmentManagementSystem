# Định hướng An Cư PropTech

## Mục tiêu cuối cùng

Phát triển An Cư PropTech thành sản phẩm thương mại cho người dùng thật tại Việt Nam, có website, ứng dụng điện thoại (Android/iOS) và ứng dụng máy tính (PC). Đây là định hướng chung cho toàn bộ dự án, không chỉ là đồ án hoặc bản demo.

## Nguyên tắc phát triển

- Thiết kế các ứng dụng dùng chung backend/API và dữ liệu, tận dụng code hiện có khi phù hợp.
- Tối ưu trải nghiệm theo thiết bị và vai trò: chủ nhà cần quản lý, nhập liệu và báo cáo thuận tiện trên PC; cư dân cần hóa đơn, thanh toán, thông báo, chụp ảnh và báo sự cố thuận tiện trên điện thoại.
- Ưu tiên luồng nghiệp vụ trọn vẹn với dữ liệu thật, tính đúng tiền, phân quyền, độ ổn định và khả năng vận hành. Không trình bày dữ liệu giả hoặc tích hợp mô phỏng như chức năng thương mại đã được kiểm chứng.
- Khi chuẩn bị đưa ra thị trường, tính đến triển khai ổn định, sao lưu/khôi phục, giám sát lỗi, bảo mật, cập nhật phiên bản và thử nghiệm với chủ nhà thật.
- Capacitor, Tauri hoặc Electron mới là các phương án đã trao đổi; chưa được chốt. Không tự coi việc đổi công nghệ, đóng gói hay phát hành app là công việc đã được yêu cầu chỉ từ định hướng này.

## Cách làm việc đã thống nhất

- Giao tiếp và viết commit bằng tiếng Việt.
- Làm từng phần nhỏ có ý nghĩa, kiểm tra rồi commit và push ngay trước khi làm phần khác.
- Dùng nhánh tổng hợp `Duy/all`; nhánh chức năng mới bắt đầu bằng `duy/`, sau đó tích hợp về `Duy/all`.
- Tạo/cập nhật PR cho phần hoàn thành; chỉ gộp vào `main` khi người dùng yêu cầu.
- Tuân thủ phạm vi từng yêu cầu. Khi được yêu cầu chỉ sửa frontend, không sửa backend.
- Không đưa mật khẩu, API key hoặc file cấu hình riêng chứa bí mật lên GitHub.
