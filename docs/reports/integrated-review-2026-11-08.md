# Rà soát nhánh kiểm thử chung, 08/11/2026

Phạm vi: main9138d17 đến nhánh test/system-improvements-20261108; FIX-01–08, TECH-01, AI-01, AI-04. Bảo toàn ba file diagnostics chưa track; không chạy ứng dụng với DB chính hoặc gọi provider thật.

## Lỗi nhãn hợp đồng hủy — đã sửa

`tenancyViews` đổi CANCELLED thành terminated, khiến bảng “Quan hệ thuê đã lưu” của Owner hiển thị “Đã kết thúc”, dù bản này chưa có hiệu lực. Giữ riêng trạng thái cancelled trong model giao diện và nhãn “Đã hủy trước hiệu lực”; ENDED vẫn “Đã kết thúc”. Không thay trạng thái backend, quyền hoặc dữ liệu.

Kiểm tra hồi quy trước sửa thất bại đúng actual “Đã kết thúc”; sau sửa 5 test selection-cancellation và TypeScript PASS. Playwright MCP API fixtures tại 1440/390 PASS: hai hàng CANCELLED/ENDED khác nhãn, không tràn ngang hoặc lỗi trình duyệt. Helper ngoài Git: tmp/review-cancel-label-browser.js; regression test trong tests/selection-cancellation.test.ts.

## Bộ lọc AI được người dùng bổ sung — đã sửa

Nút áp dụng chỉ dựa vào `result.canApply` tại thời điểm AI trả về, nên kết quả AI rỗng khóa nút ngay cả khi người dùng đã nhập bộ lọc hợp lệ. Đã tái hiện qua Playwright trước sửa: “Reviewed filter remains disabled after empty AI suggestion”. Giao diện giờ tính khả năng áp dụng từ các giá trị đang được người dùng rà soát; không gửi bộ lọc rỗng, vẫn kiểm tra form và dùng API validate/audit hiện có. Giá 0/studio 0 vẫn được tính là bộ lọc.

Thêm unit regression và mở rộng e2e/ai-search.spec.js. Playwright MCP 1440/390 PASS: kết quả rỗng khóa nút, nhập diện tích mở nút, xóa lại khóa, xác nhận thủ công mới truy vấn catalog. Các luồng consent/sửa bộ lọc/kết quả rỗng/lỗi provider cũng đạt. Helper ngoài Git tmp/review-ai01-browser.js.

Sau hai sửa: 139 frontend unit, TypeScript noEmit, cú pháp e2e AI và production build PASS. Build còn cảnh báo chunk >500kB có sẵn. Không thêm dependency hoặc thay cấu hình provider.

Các kiểm tra tổng hợp được cập nhật bên dưới sau khi có kết quả thực tế.
