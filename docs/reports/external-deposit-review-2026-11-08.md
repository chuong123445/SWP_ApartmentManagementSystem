# Rà soát cọc ngoài hệ thống — 08/11/2026

Nhánh fix/external-deposit-policy từ31f7218; người dùng yêu cầu thực hiện/rà lại phương án Owner tự quản lý cọc. Không thay backend, schema, DB hoặc nội dung hợp đồng đã lưu.

## Phát hiện và sửa

1. Bảng người thuê có cột “Cọc thực thu” với toàn giá trị thiếu, dễ hiểu là tính năng đang chờ tích hợp. Đổi sang quản lý cọc ngoài hệ thống; giữ số cọc theo từng contract, 0 và chưa có dữ liệu riêng biệt.
2. Khâu soạn/rà soát/xem hợp đồng và bàn giao chưa nói rõ ai quản lý cọc. Thêm thông báo dùng chung: hai bên tự thu/đối soát/hoàn ngoài hệ thống; hoàn tất bàn giao không xác nhận hoàn cọc.
3. Biên bản legacy hiện các số tiền hoàn/khấu trừ mà không nhấn mạnh đây là ước tính cũ. Ghi nhãn lịch sử và consent trả phòng riêng. Bỏ phần form tạo bàn giao tài chính legacy khỏi component; UI mới dùng bàn giao cư trú FIX09. Dữ liệu/khả năng đọc-xác nhận biên bản cũ không bị xóa.
4. Prototype RoomDetailModal/hook có thao tác giữ chỗ Escrow chỉ ghi state và báo thành công. Xóa callback/state/wiring và nút này. ApartmentListingPage/ResidentPortalPage/PDF utility cũ còn cam kết MBBank Escrow/bảo chứng100%; bỏ các cam kết cọc. Các prototype không được coi là bằng chứng luồng thanh toán thật; nhiều thành phần không có tuyến điều hướng công khai hiện hành.
5. Room modal lấy giá thuê thay cọc khi cọc0/thiếu. Giữ0 và chưa có thông tin. Resident prototype dùng contract.deposit0 từ adapter thay cọc tenancy thật; đổi sang currentTenant.contractDeposit và không tự điền0.
6. Dashboard/Reports/CSV ghi rõ cọc ngoài hệ thống, không nằm trong số tổng hợp. Đọc FinancialReportRepository/OwnerFinancialSummaryService xác nhận chỉ truy vấn invoice/payment/additional receipts/inventory; không cộng số cọc ContractDraft vào ví/thực thu. Escrow endpoint vẫn denyAll; không đổi luồng payment hoặc sổ quỹ thủ công.

Module index: utils/depositPolicy, components/contract/{ContractWizard,ContractReview,ContractDocument,ContractExitPanel,ContractLifecyclePanel,ContractListActionModal}, pages/owner/{TenantsPage,DashboardPage,finance/ReportsPage}, components/rooms/RoomDetailModal, pages/customer/ApartmentListingPage, pages/resident/ResidentPortalPage, hooks/useRentalWorkspace, routes/WorkspaceRoutes, utils/{contractPdf,financialCsv}.

## Kiểm tra

- 143 frontend tests, TypeScript noEmit và production build PASS ở lượt cuối; build chỉ có cảnh báo chunk>500kB có sẵn. Log tmp/external-deposit-final-fe.log và external-deposit-final-build.log. Không chạy lại backend tests vì backend không đổi; không dùng kết quả99test của task trước làm một lượt chạy mới.
- Playwright MCP16case PASS ở1440/390: 8 preview pure components (room0, roomunknown, market, resident);2 tenant table;2 legacy handover;4 FIX09 early/expired với popup danh sách. Kiểm tra số0/thiếu/đúng cọc tenancy, nhãn ngoài hệ thống, không Escrow hoặc command tiền, consent xác nhận bàn giao và lịch sử, không tràn ngang/lỗi trình duyệt ngoài409/503 chủ đích trong FIX09.
- Lượt đầu preview dừng ở assertion0đ; đọc DOM thấy0đ, lượt chạy lại đủ8case đạt. Không thay công thức tiền dựa trên lỗi harness này. Các helper ngoài Git: tmp/external-deposit-{preview,tenants,legacy}-browser.js và tmp/fix09-browser.js. Preview HTML/TSX tạm đã xóa; không đưa harness vào sản phẩm.
- Đã xem trực quan ảnh mobile resident trong tmp/external-deposit-resident-390.png. PDF iframe/sản phẩm ngân hàng không được kiểm tra live. Test browser dùng API fixtures hoặc pure-component harness, không nối DB ứng dụng. Vite3197 đã dừng; ba diagnostics có sẵn không sửa/commit.

Chưa chạy UI với DB chính, không có chuyển khoản/provider/thu hoặc hoàn tiền thực tế. Backend API legacy và dữ liệu cũ được giữ; không claim đã xóa mọi code prototype hoặc đã quản lý cọc. Xem ADR external-deposit-v1; không push/PR trong task.
