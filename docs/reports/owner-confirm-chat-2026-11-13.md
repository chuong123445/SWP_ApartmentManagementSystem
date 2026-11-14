# Xác nhận tạo hợp đồng và trợ lý Owner — 13/11/2026

## Xác nhận hợp đồng

Trước đây nút từ bước điều khoản tự lưu ngay, tải PDF và hiện ký. Nay bước cuối rà soát thông tin/điều khoản, không gọi API lưu hoặc PDF trước khi Owner bấm **Xác nhận tạo hợp đồng**. Sửa bản đã lưu dùng **Xác nhận lưu thay đổi**. Chỉ lưu thành công mới mở PDF và phần ký; lỗi lưu hoặc nguồn cũ giữ bước rà soát. Bỏ khung chữ ký minh họa khỏi phần rà soát; giữ luồng ký/OTP/phân quyền backend hiện có. Hợp đồng đã lưu mở lại vẫn xem và ký như trước.

Kiểm tra: TypeScript và 162 frontend unit PASS; 8 Playwright desktop1440/mobile390 PASS gồm tạo/sửa, lỗi lưu503 rồi thử lại, lỗi PDF503 rồi tải lại, nguồn cũ409 chặn lưu. Có kiểm tra không POST/PDF/khung ký trước xác nhận, không tràn ngang và không lỗi console/network ngoài lỗi fixture chủ động. API fixtures, không tạo hợp đồng trong DB ứng dụng.

## Trợ lý Owner và dòng bản nháp

Chat nổi trong workspace của OWNER, dùng kiểu hiển thị chat hiện có. Câu hỏi yêu cầu thuê gọi API Owner PENDING theo tài sản đang chọn; lấy totalElements thay vì đếm trang đầu, hiện tối đa ba ví dụ và lối mở danh sách. Đây là số đang chờ tại lúc hỏi. Hỏi đáp này dùng dữ liệu API, không gửi hồ sơ khách thuê tới mô hình AI.

Luồng điện nước chọn hợp đồng ACTIVE rồi dùng endpoint AI hiện có, bắt buộc mã phòng và số cuối kỳ. Chuyển gợi ý sang form hóa đơn sau thao tác Áp dụng; form tải lại billing context và chỉ dùng gợi ý nếu contract/period/baselineVersion vẫn khớp. Nếu lệch, báo nhập lại và không điền gợi ý cũ. Giữ bước Owner lưu/gửi rõ ràng và tính tiền trên server. AI được đưa ra khỏi form hóa đơn thủ công. Hội thoại giữ khi đổi tab, xóa khi đổi phạm vi tài sản; chat ẩn trong lúc mở modal hóa đơn nghiệp vụ.

Bỏ dòng metadata “Chính chủ · Bản nháp #… · Chỉ bạn xem được trong lúc chuẩn bị” trong component dùng chung cả ba loại quyền. Rà tìm các chuỗi tương tự trong src; giữ nhãn trạng thái nghiệp vụ và hướng dẫn bắt buộc của hồ sơ/ký.

Kiểm tra bổ sung: 4 Playwright MCP API-fixture flows PASS tại1440/390, thành công và nguồn cũ. Bao gồm tổng12 yêu cầu trong khi trang đầu chỉ có1 ví dụ, property scope, thiếu chỉ số400, thử lại, áp dụng đúng điện/nước, tải lại context, không tự tạo/gửi hóa đơn, không tràn ngang; không lỗi page/console/network bất ngờ. Đã xem ảnh desktop/mobile. Lần kiểm tra đầu phát hiện nhãn textarea đổi theo nội dung nhập: chuyển sang label/htmlFor độc lập và chạy lại PASS. Fixture thiếu financial-summary đã được bổ sung; locator lỗi cũ chứa nút Tải lại đã được sửa. Không đánh dấu các lượt lỗi ban đầu là PASS. Không kiểm tra Gemini thật hoặc UI dùng DB ứng dụng; backend không thay đổi.

TypeScript,162unit và production build PASS; còn cảnh báo bundle lớn đã có. Sandbox chặn spawn ban đầu, kiểm tra Node/Vite/build chạy lại bằng quyền được duyệt. Server kiểm tra riêng3196 dừng trước bàn giao.

## Đánh giá bảng thống kê (đề xuất, chưa triển khai)

Đã đọc DashboardPage, finance/ReportsPage, FinancialReportParts và kiểu dữ liệu/API financial-summary. Hiện có lấp đầy hiện tại, hóa đơn theo kỳ, tiền nhận theo ngày thu, nợ mọi kỳ/quá hạn, hợp đồng sắp/hết hạn; báo cáo12tháng, bảng theo tài sản, thành phần hóa đơn và xuất CSV. Phân biệt ngày thu/kỳ hóa đơn là đúng và cần giữ.

Ưu tiên tiếp theo:

1. Bảng vận hành từng phòng làm trung tâm: tài sản/phòng, khách thuê, trạng thái, kỳ đến hạn, phải thu/đã thu/còn nợ, ngày quá hạn, ngày hết hợp đồng và việc cần xử lý. Lọc tài sản/kỳ/trạng thái, sắp xếp công nợ; mở đúng hóa đơn/hợp đồng từ mỗi dòng.
2. Bảng việc cần xử lý: hóa đơn đến hạn chưa lập, điện nước chưa chốt, yêu cầu thuê đang chờ, hợp đồng cần gia hạn/bàn giao, bảo trì chưa xong. Mỗi mục dẫn tới đúng màn hình/hồ sơ và giữ bộ lọc.
3. Công nợ chi tiết và tuổi nợ; so sánh kỳ trước theo cùng căn cứ. Các chỉ số phải thu/đã thu phải cùng tập hóa đơn; tiền nhận theo ngày thu tiếp tục tách riêng, đặc biệt hợp đồng đóng3/6/12tháng.
4. Đối soát khoản thu hộ, số dư khả dụng/chờ và tiền đã rút dựa trên nguồn giao dịch hiện có. Chỉ gọi là lợi nhuận khi có chi phí đầy đủ, tránh lấy tiền điện nước phải thu làm chi phí.

Bảng mới cần API Owner tổng hợp, phân trang và kiểm tra cùng kỳ/phạm vi; không tổng hợp từ một trang hóa đơn trên frontend. Các mục trên là đánh giá theo yêu cầu, chưa thay đổi báo cáo hay tự đặt quy tắc kế toán.
