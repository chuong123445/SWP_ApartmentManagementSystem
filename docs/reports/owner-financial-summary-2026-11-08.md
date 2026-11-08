# FIX-04/05 — Tổng hợp tài chính toàn phạm vi và định nghĩa chỉ số

Ngày 08/11/2026, nhánh `fix/owner-financial-summary` từ `02799b4`. Hai đầu việc được thực hiện cùng một unit vì cơ sở tổng hợp và nhãn số liệu cần thống nhất khi thay nguồn dữ liệu cho Dashboard/Reports. Xuất CSV là checkpoint riêng FIX-06 ngay sau unit này.

## Kết quả

GET `/api/v1/owner/financial-summary?year=...&propertyId=...` chỉ đọc, eligible Owner, property scope 404, no-store. Năm 1900–9998, mặc định năm server Asia/Ho_Chi_Minh. Scalar projections/stream trong transaction readOnly đóng bằng try-with-resources, fetch-size hint100; accumulator chỉ giữ tổng/12 tháng/tài sản, không materialize entity/hồ sơ/chữ ký. Không dựa trang 20 hóa đơn hoặc lấy giá hợp đồng/phòng quảng cáo làm doanh thu khi thiếu hóa đơn. Không khẳng định đã benchmark streaming trên dữ liệu lớn/driver khác.

| Số liệu | Cơ sở |
|---|---|
| Hóa đơn đã gửi | SENT theo period YYYY-MM trong năm chọn, gồm cả kỳ tương lai nếu thật sự đã phát hành; DRAFT loại khỏi tổng |
| Đã thu/chưa thu theo kỳ hóa đơn | Giá trị hóa đơn thuộc cohort period, trạng thái paidAt hiện tại; khác dòng tiền nhận theo thời gian |
| Tiền nhận trong năm/tháng | InvoicePayment.amount của SENT theo paidAt chuyển Asia/Ho_Chi_Minh, cộng TestPayment exact contract/customer/current owner đã paidAt theo cùng năm; có thể là hóa đơn năm trước |
| Công nợ hiện tại mọi kỳ | SENT chưa paidAt; thêm phiếu bổ sung chưa paidAt riêng, không giới hạn năm cohort |
| Quá hạn | SENT chưa paidAt và dueDate trước hôm nay; đến hạn hôm nay chưa coi quá hạn. Phiếu bổ sung không có hạn thì không tự suy quá hạn |
| Đúng hạn | Trong các hóa đơn thuộc cohort đã thanh toán: paidAt Vietnam date <= dueDate. Mẫu số chỉ là số đã thanh toán; không có mẫu số hiển thị “—”, không 100% giả |
| Cơ cấu hóa đơn | Tổng rent/electricity/water/Internet+garbage từ số đã chốt trên SENT, không tỷ trọng mẫu 100% khi rỗng |
| Quy mô/lấp đầy | Snapshot Apartment hiện tại, kể cả inventory riêng chưa public; không trình bày thành lịch sử occupancy của năm chọn |
| Lợi nhuận/chi phí | Chưa đủ nguồn chi phí đối soát; bỏ số/nhãn lợi nhuận giả. Không lấy khoản điện/nước phải thu trên hóa đơn làm chi phí thực chi |

Không cộng lại sổ quỹ thủ công/cọc/hoàn tiền/rút ví vào tiền nhận của hai nguồn trên. Giữ chính sách hiện tại paidAt là thanh toán toàn bộ hóa đơn; chưa triển khai phân bổ thu từng phần/refund. Phiếu owner-only cũ và sai party/owner bị loại theo predicate lịch sử đã dùng. Không thay trạng thái, tài khoản, invoice, fixture, schema hay provider.

Dashboard và Reports cùng shared financial hook; giữ năm/tháng khi đổi tab, lọc tài sản và refresh/retry. Scope/năm đổi làm bỏ response cũ; loading/lỗi/schema thiếu không thành số 0 hoặc fallback trang invoices. Poll30s khi visible và focus/visibility/revision. Dashboard dùng tháng chọn, biểu đồ tối đa6 tháng trong năm; Reports đủ12 tháng và bảng từng tài sản/chi tiết tiền. Owner shell/navigation giữ nguyên; bỏ các nhãn tháng9/12.4%/sự cố mẫu của Dashboard. Các thao tác nhanh cũ giữ ID và đường điều hướng.

## Index

- Backend: `dto/finance/FinancialInvoiceRow`, `FinancialReceiptRow`, `FinancialInventoryRow`, `OwnerFinancialSummary`; `repository/finance/FinancialReportRepository`; `service/owner/OwnerFinancialSummaryService`; `controller/owner/OwnerFinancialSummaryController`; exact GET security matcher.
- Frontend: `types/financialReport`, `services/owner/financialService`, `hooks/useOwnerFinancialSummary`, `components/finance/FinancialReportParts`, DashboardPage/ReportsPage, shared workspace/pages/routes.
- Tests: OwnerFinancialSummaryIntegrationTests, tests/financialService.test.ts.
- [OpenAPI](../api/owner-financial.openapi.json); API_DOCUMENT tại DTD cập nhật riêng. Legacy reportUtils còn tồn tại cho consumers/test cũ nhưng Dashboard/Reports không gọi nữa; không gọi test helper cũ là bằng chứng cho nguồn mới.

## Kiểm tra

- Backend SQL test: 18 Billing +3 OwnerWorkspaceSummary đạt ở lượt đầu; 3 FinancialSummary đạt ở lượt chạy lại. Tổng24 bài khác nhau đạt qua các lượt, database test có sẵn `ancu_settlement_test_20261103`, rollback. Lượt đầu fixture tạo phiếu bổ sung có phần lẻ vi phạm CHECK integer của module hiện có; sửa fixture thành số nguyên, không nới constraint/chính sách. Precision4decimals vẫn kiểm tra ở invoice/payment.
- Ca mới: 21 hóa đơn trên tài sản A, tài sản B/của Owner khác/tài sản trống; DRAFT/năm trước/năm sau; tiền21000002.625 không bị mất; hóa đơn kỳ2025 thu2026; timezone tại 16:59:59Z/17:00:00Z giao năm; đúng hạn/thu muộn, nợ quá hạn/ngày đến hạn hôm nay; additional exact-party và legacy owner-only; auth/property/year errors, mặc định server.
- Frontend120 tests PASS gồm3 API regression mới; TypeScript và Vite build PASS (cảnh báo chunk >500kB). Native test/alias/Vite runners như FIX-01 do giới hạn môi trường, không thêm dependency.
- Playwright MCP1440/390 PASS với API fixtures: giá trị23.000.002,625 và22 invoice độc lập trang hóa đơn rỗng/paged; cash10.001.234,125 khác cohort; dashboard đổi tháng/tháng giữ khi đổi tab; năm2025/2026/tài sản B, ratio0/100/unknown,12 tháng, stale-response/error503/schemaNaN/retry, không overflow/JSconsole error/failed request/business write. Đã xem ảnh desktop/mobile.
- OpenAPI JSON parse và diff whitespace PASS. Context7 JPA4.1.0 (managed4.1.1), Recharts3.10.1; repository/stream queries thực chạy trên SQL Server test.

Bằng chứng local: tmp/financial-summary-backend-20261108.log, financial-summary-backend-rerun-20261108.log, financial-summary-fe-tests.log, financial-summary-build.log, financial-summary-20261108-browser.js, financial-dashboard-{1440,390}.png, financial-reports-{1440,390}.png; Surefire reports backend target.

Chưa chạy UI nối backend/DB ứng dụng thật, provider, full-suite/load/atomic historical snapshot audit. Report phản ánh trạng thái dữ liệu hiện tại khi đọc, không phải bản chốt năm trước. Không có sửa schema/appDB/fixtures/provider/AI hoặc push/PR. Cần cập nhật backend/frontend cùng nhánh và restart backend. CSV đã được bổ sung ở checkpoint riêng: [FIX-06](financial-csv-2026-11-08.md); nguồn xuất cũ theo page không được dùng lại.
