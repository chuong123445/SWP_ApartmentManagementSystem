# FIX-06 — Xuất CSV theo báo cáo đang xem

Checkpoint sau `fb48967` trên nhánh `fix/owner-financial-summary`, ngày 08/11/2026.

- Nút ghi đúng **Xuất CSV**, filename `.csv`, UTF-8 BOM/CRLF; không hứa tệp XLSX.
- Xuất đúng object summary đã được API client kiểm tra và đang hiển thị, theo year/property hiện tại. Không gọi lại trang hóa đơn hoặc trộn với filter cũ.
- Có metadata ngày/năm/phạm vi/cơ sở, tổng hóa đơn/tiền nhận/công nợ/lấp đầy, đủ12tháng và tất cả tài sản. Theo dõi riêng kỳ hóa đơn, ngày thanh toán, công nợ mọi kỳ và inventory hiện tại.
- Chuỗi tiền giữ nguyên văn, không ép qua Number hoặc làm tròn khi tạo CSV. Biểu đồ có thể dùng số xấp xỉ nhưng export lấy chuỗi gốc. CSV không đảm bảo phần mềm bảng tính tự chọn đúng kiểu khi mở; với số rất dài cần nhập cột tiền dạng Text để tránh tự làm tròn.
- Quote/escape dấu phẩy/nháy/newline, trung hòa ký tự công thức đầu trường tên tài sản. File không chứa token, ảnh, hồ sơ/CCCD hay dữ liệu tài khoản ngân hàng.
- Không cho xuất khi summary loading/lỗi/thiếu dữ liệu. Lỗi Blob/URL/download initiation báo lỗi thực tế; không catch rồi thông báo thành công. Browser nhận yêu cầu tải tệp không đồng nghĩa app xác nhận đã ghi xong xuống ổ đĩa, nên không có toast “đã xuất thành công”.
- Caption giải thích tiền thanh toán có thể do nền tảng thu hộ, không phải số dư ví/đã rút về ngân hàng; cọc/cashbook/refund/withdrawal tách riêng như cơ sở summary.

Index: `src/utils/financialCsv.ts`, ReportsPage, `tests/financialCsv.test.ts`. Source summary/OpenAPI/role/property giữ nguyên, không backend/schema/DB/provider/AI thay đổi trong checkpoint này.

Kiểm tra thực tế:123 frontend tests PASS (3CSV mới: tiền20digit.1250/12tháng/40tài sản; formula/quote/newline; năm/property/denominatorzero), TypeScript/build PASS (còn cảnh báo chunk). Playwright MCP1440/390 chạy lại cả financial flows và download:2 file mỗi kích thước, xác nhận CSV toàn phạm vi2026 và CSV năm2025/property2, đọc nội dung file giữ23.000.002,625 tương ứng chuỗi gốc23000002.6250, không dữ liệu scope cũ. Gây lỗi createObjectURL có kiểm soát: thấy alert lỗi, không có file tải/thông báo thành công; retry sau khôi phục tải được. Error/schema response làm nút export disabled.0 unexpected JS/console/network failure/business write/overflow. Đã xem ảnh sau thay đổi.

Bằng chứng ngoài Git: tmp/financial-csv-fe-tests.log, financial-csv-build.log, financial-summary-20261108-browser.js, financial-csv-{1440,390}.csv, financial-csv-filtered-{1440,390}.csv, financial-reports-{1440,390}.png. Browser dùng API fixtures, không gọi provider/DB ứng dụng. Backend24bài khác nhau đã PASS trong checkpoint summary, không chạy lại cho thay đổi CSV thuần frontend. Own Vite riêng được dừng trước bàn giao; user servers giữ nguyên. Không push/PR.
