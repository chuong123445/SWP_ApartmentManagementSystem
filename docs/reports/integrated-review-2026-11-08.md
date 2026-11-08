# Rà soát nhánh kiểm thử chung, 08/11/2026

Phạm vi: main9138d17 đến nhánh test/system-improvements-20261108; FIX-01–08, TECH-01, AI-01, AI-04. Bảo toàn ba file diagnostics chưa track; không chạy ứng dụng với DB chính hoặc gọi provider thật.

## Lỗi nhãn hợp đồng hủy — đã sửa

`tenancyViews` đổi CANCELLED thành terminated, khiến bảng “Quan hệ thuê đã lưu” của Owner hiển thị “Đã kết thúc”, dù bản này chưa có hiệu lực. Giữ riêng trạng thái cancelled trong model giao diện và nhãn “Đã hủy trước hiệu lực”; ENDED vẫn “Đã kết thúc”. Không thay trạng thái backend, quyền hoặc dữ liệu.

Kiểm tra hồi quy trước sửa thất bại đúng actual “Đã kết thúc”; sau sửa 5 test selection-cancellation và TypeScript PASS. Playwright MCP API fixtures tại 1440/390 PASS: hai hàng CANCELLED/ENDED khác nhãn, không tràn ngang hoặc lỗi trình duyệt. Helper ngoài Git: tmp/review-cancel-label-browser.js; regression test trong tests/selection-cancellation.test.ts.

Các kiểm tra tổng hợp và phát hiện tiếp theo được cập nhật bên dưới sau khi có kết quả thực tế.
