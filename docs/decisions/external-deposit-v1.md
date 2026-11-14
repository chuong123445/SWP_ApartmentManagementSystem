# Cọc do Owner và người thuê tự quản lý ngoài hệ thống

Override08/11/2026: người dùng chọn không triển khai hệ thống giữ/thu/khấu trừ/hoàn cọc; Owner và Customer tự xử lý ngoài hệ thống. Quyết định này thay thế hướng tạm hoãn để sau triển khai thu cọc vào hệ thống. FIX-10/11 ngoài phạm vi phiên bản hiện tại; không tự mở lại backlog thanh toán cọc nhiều lần/webhook.

- Số cọc trong hợp đồng là nghĩa vụ đã thỏa thuận, không là số dư ví, thực thu hoặc bằng chứng đã hoàn. Không sửa số cọc, điều khoản/snapshot/chữ ký/PDF đã lưu để áp chính sách mới.
- Hiển thị rõ hai bên tự đối soát/thu/hoàn ngoài hệ thống tại bản nháp/rà soát/chi tiết hợp đồng, bàn giao, bảng người thuê và các màn hình cũ còn trong source. Thay cột “Cọc thực thu” vốn luôn thiếu dữ liệu bằng “Quản lý cọc — Hai bên tự quản lý ngoài hệ thống”. Không yêu cầu người thuê cung cấp tài khoản hoàn cọc cho hệ thống.
- Hoàn tất bàn giao chỉ kết thúc cư trú, không xác nhận hoàn cọc. Luồng FIX09 và công nợ hóa đơn giữ nguyên. Số tiền đối soát trong biên bản legacy giữ để tra cứu, ghi nhãn ước tính lịch sử; xác nhận legacy chỉ xác nhận trả phòng.
- Xóa callback/state Escrow giữ chỗ giả và nút báo thành công trong prototype; không giả bảo chứng ngân hàng. Cọc niêm yết thiếu phải báo chưa có dữ liệu, 0 vẫn là0, không lấy giá thuê thay cọc. Resident prototype lấy cọc từ đúng tenancy thay giá trị0 mặc định của adapter Contract cũ.
- Tổng hợp tài chính tự động và ví không nhận số cọc từ Contract/ContractDraft. Khoản thu–chi thủ công do người dùng tự ghi là dữ liệu sổ quỹ của họ, không chứng minh nền tảng đã thu/giữ/hoàn cọc. Không thêm bộ lọc theo từ “cọc” để đoán bản chất giao dịch.
- Giữ Escrow backend denyAll, không thêm adapter/ngân hàng/provider hoặc API xác nhận cọc. Các API/ước tính legacy còn tồn tại không phải tích hợp giao dịch tiền; không đổi dữ liệu cũ trong unit này. Utility PDF frontend không có consumer hiện hành được bỏ nội dung bảo chứng cọc nếu được dùng lại; không phải sửa PDF backend đã ký.

Phạm vi này không tuyên bố toàn bộ prototype đã được dọn sạch các nội dung minh họa khác. Dọn prototype tổng thể vẫn thuộc TECH-02. Mở lại thanh toán cọc trong sản phẩm cần quyết định và task riêng.
