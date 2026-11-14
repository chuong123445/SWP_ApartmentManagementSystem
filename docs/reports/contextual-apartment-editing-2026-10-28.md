# Chỉnh sửa trực tiếp tại từng phần của trang căn hộ

Ngày: 28/10/2026.

## Các đầu việc đã hoàn thành

- Bỏ nút chỉnh sửa tổng hợp và khối biểu mẫu chung cuối trang chi tiết.
- Đặt nút Sửa ngay tại giá thuê, giá điện, giá nước, tiêu đề, mô tả, tiện ích và số người tối đa. Mỗi trường mở ô nhập tại chỗ, có Lưu/Hủy, trạng thái đang lưu và thông báo lỗi.
- Đặt nút **Thêm / quản lý ảnh** ngay dưới bộ ảnh. Hỗ trợ thêm, bỏ và đổi thứ tự ảnh; giữ tổng 1–4 ảnh, ảnh đầu làm đại diện. Ảnh vẫn dùng chung giữa các căn thuộc cùng tài sản.
- Khi lưu một trường, gửi kèm các giá trị còn lại từ dữ liệu API hiện tại để giữ nguyên chúng; tiếp tục dùng version của Backend để phát hiện xung đột.
- Chỉ chủ tài sản có quyền chỉnh sửa mới thấy nút. Giữ điều kiện khóa cả ba giá khi căn hộ đã được thuê hoặc còn yêu cầu thuê chờ xử lý, và hiển thị lý do khóa ngay cạnh phần giá.
- Giữ bộ xem ảnh trước/sau, xác thực truy cập ảnh riêng tư, công khai/ẩn tin và luồng yêu cầu thuê của khách.

## Phạm vi và kiểm chứng

Chỉ thay đổi Frontend; không sửa schema, dữ liệu hay API Backend. Không cần migration.

- Context7 đối chiếu React 19.3.0 đang cài trong lockfile.
- TypeScript và build thành công; 46 kiểm tra tự động thành công. Build còn cảnh báo Vite configLoader/__dirname và kích thước bundle đã có từ trước.
- 25 ca Playwright thành công (30,7 giây): quản lý tài sản, bộ ảnh, xác thực Customer; desktop 1440px và mobile 390px, kiểm tra console/network bằng API giả lập, không tràn ngang.
- Chạy thêm 2 ca khi mở ô sửa giá (4,8 giây), không tràn ngang; đã xem ảnh chụp desktop/mobile thực tế.
- Kiểm tra thao tác Lưu/Hủy, giữ các trường khác, tải lại dữ liệu, khóa giá và không cho lưu bộ ảnh rỗng. Không khẳng định đã đăng nhập Auth0 hay ghi database thật trong kiểm tra UI này.
- Playwright MCP không truy cập được máy chủ trong sandbox; Edge CLI và Vite chạy riêng ngoài sandbox đã kiểm tra được. Đã sửa cảnh báo React key trùng phát hiện ở lần chạy đầu trước khi chạy lại 25 ca thành công.

## Tệp chính

- `src/components/apartments/OwnerApartmentEditor.tsx`: các bộ chỉnh sửa trường và ảnh tại chỗ.
- `src/pages/customer/ApartmentDetailPage.tsx`: bố trí các bộ chỉnh sửa tại nội dung tương ứng.
- `e2e/asset-management.spec.ts`, `e2e/apartment-gallery.spec.ts`: cập nhật kiểm tra cho thao tác mới.

Khởi động lại Vite nếu trình duyệt còn dùng bundle cũ, sau đó vào Quản lý tài sản → Xem chi tiết / chỉnh sửa.
