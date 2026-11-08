# Hồ sơ quyền cho thuê tách khỏi thông tin nhận tiền

Ngày 09/11/2026, nhánh `fix/property-dossier-without-bank`.

Người nộp khai báo chủ sở hữu gốc, giấy chứng nhận, phạm vi/thời hạn quyền và chứng từ để gửi hồ sơ xét duyệt. Form và màn hình Admin đã bỏ các mục ngân hàng, số tài khoản, chủ tài khoản. Payload frontend gửi các trường quyền và danh sách tệp. Checklist và nguồn đối chiếu AI mới chỉ tập trung vào quyền cho thuê.

## Thay đổi dữ liệu và tương thích

`PropertyDossierSubmit.receivingAccount` được giữ dưới dạng thuộc tính tùy chọn, deprecated để nhận payload client cũ. Giá trị cũ nếu được gửi vẫn qua validation định dạng và được bỏ qua khi tạo hồ sơ mới. Ba trường trong response cho phép null.

V61 cho phép null ở ba cột nhận tiền trong `property_dossiers`, được nối vào danh sách script startup. Các dòng lịch sử đầy đủ tiếp tục được resolver đọc khi tạo snapshot hợp đồng. Hồ sơ mới trả receivingAccount null trong context hợp đồng/cài đặt tài sản. QR nhận tiền có cấu hình riêng vẫn được resolver hợp đồng ưu tiên theo luồng hiện hành.

Các file chính gồm DTO/model PropertyDossier, PropertyDossierService, PropertySettingsService, ContractPropertyEvidenceResolver, OwnerPrecheckService, DossierAiReviewService, hai prompt, application.properties/V61, modal/chi tiết hồ sơ/trang Admin và types. OpenAPI property-dossiers đã cập nhật receivingAccount tùy chọn/deprecated cùng các trường response nullable.

## Kiểm tra thực tế

- TypeScript và Vite build thành công. Build có cảnh báo kích thước chunk đang tồn tại.
- 143 bài kiểm tra frontend qua.
- 3 bài PropertyDossierPaymentTests qua, gồm DTO không ngân hàng, resolver cho hồ sơ mới và dữ liệu nhận tiền lịch sử. Maven biên dịch source và toàn bộ test source thành công. Hibernate Validator thực tế là 9.1.3.Final, Java 21, Boot 4.1.1.
- 6 kịch bản Playwright MCP qua trên bản build, dùng API fixtures ở chiều rộng 1440 và 390. Hai kịch bản kiểm tra precheck giữ các kiểm tra lỗi từng phần, thay đổi nguồn và kết quả đến muộn. Bốn kịch bản nộp hồ sơ của Customer và phê duyệt của Admin xác nhận payload không có receivingAccount, giao diện bỏ trường ngân hàng kể cả khi response lịch sử có dữ liệu. Console/page errors, failed requests và tràn ngang đều rỗng trong các kịch bản này.
- Playwright nạp bundle qua route.fulfill từ dist và chặn API bằng fixture vì kết nối tới Vite bị timeout. Cách chạy local Playwright dự phòng gặp lỗi Edge named pipe. Các ảnh kết quả ở thư mục tmp của workspace gốc.
- PropertyDossierIntegrationTests, OwnerPrecheckIntegrationTests và ContractDraftIntegrationTests đã được cập nhật và thử chạy. ApplicationContext bị chặn bởi kết nối SQL Server test clone với lỗi `Permission denied: getsockopt` ở localhost 1433. Các bài tích hợp và migration V61 cần chạy lại khi có quyền kết nối. Không có kết quả PASS cho chúng.
- Lần đầu Mockito tự attach agent bị kẹt do quyền IPC. Chạy lại bằng javaagent explicit đã giải quyết phần unit test.

## Bộ hồ sơ và script

Đã hoàn thiện đúng ba thư mục trong `output/pdf/Bo_demo_3_bo_ho_so` ở workspace gốc. Gói V3 có 5 PDF chứng từ, 5 PNG chứng từ, 6 ảnh tài sản, guide 4 trang, dữ liệu nhập TXT/JSON và script `tao_ho_so.py` cùng requirements. Các trang chứng từ, ảnh tài sản và script xuất nội dung đã bỏ dấu hiệu demo/mô phỏng và phiếu ngân hàng theo yêu cầu.

Script đọc JSON cạnh nó, hỗ trợ chọn root/font-dir/qa-dir, sao lưu trước khi tạo lại. Đã giải nén ZIP sang thư mục khác và chạy script thành công. Kiểm tra đọc lại PDF, chuỗi bị loại bỏ, ngày/quyền, số lượng, file size, PNG pixels và ZIP integrity qua. Đã xem trực quan cả 5 trang chứng từ, 4 trang guide và hai bố cục ảnh tài sản. Hai ảnh tham chiếu người dùng ở SamplePDF được giữ tại nguồn.

Gói mới `output/pdf/Bo_demo_3_bo_ho_so_v3.zip` khoảng 1,8 MB. Các dữ liệu thiếu/không khớp có chủ đích được mô tả trong từng bộ. Bộ 02 có một giấy, bộ 01 và 03 có hai giấy. Gemini live chưa được chạy với gói này.

## Điểm kiểm tra tiếp theo

Khi kết nối SQL test hoạt động, chạy ba lớp tích hợp đã nêu để xác nhận nộp/phê duyệt, precheck, cài đặt và snapshot hợp đồng với V61. Sau khi backend chạy bản mới và giao diện tải lại, thử tài sản mới từ luồng đăng ký cho thuê và xem hồ sơ ở trang Admin.

Tự điền form từ giấy tờ và đảo thứ tự onboarding hiện là đề xuất riêng. Luồng đã sửa vẫn tạo tài sản/phòng rồi mở hồ sơ xét duyệt.
