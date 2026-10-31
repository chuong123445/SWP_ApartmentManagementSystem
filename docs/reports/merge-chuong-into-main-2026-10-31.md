# Tích hợp chuong vào main theo unit — 31/10/2026

Mốc đối chiếu: main/origin/main 29d7671, chuong/origin/chuong 11b9ea4. User yêu cầu giữ nguyên chuong, ưu tiên main khi conflict, đưa phần mới hoặc khác từ chuong vào main bằng commit theo đơn vị công việc.

Main đã có sổ quỹ, Google/VNeID, ký/vòng đời hợp đồng, bảo trì, AI hồ sơ và cổng cư dân. Không tính các phần này thành tính năng mới từ chuong. Tài sản, xác thực, hợp đồng và báo cáo được cập nhật/mở rộng; không phải toàn bộ các chức năng đó đều vắng mặt trên main.

## Commit theo unit

| Commit | Nội dung |
|---|---|
| 9c78c1e | Đồng bộ migration tài sản/thanh toán và giữ schema sổ quỹ |
| dc9232a | Khóa Escrow legacy và đồng bộ quyền API |
| 9f2561b | Xác thực lại external, bảo mật tài khoản và mật khẩu Google |
| 8c1d108 | Kho tài sản và cấp Owner sau tài sản hợp lệ |
| 34aee06 | Bộ ảnh, chỉnh từng trường và giá điện/nước độc lập |
| f1814cb | Escape dữ liệu khi in/xuất HTML PDF hợp đồng |
| ad1208d | Snapshot bằng chứng Auth0 và tài khoản nhận tiền trong bản nháp |
| 4240883 | SePay và đối soát khoản thu đúng chủ nhà/người thuê |
| 56bf08b | Báo cáo doanh thu thật, kỳ hóa đơn, bộ lọc tài sản |
| 0bbdf22 | Hóa đơn mẫu báo cáo với tùy chọn local riêng |
| 998bebd | Mặc định chưa thanh toán và lọc trước phân trang |
| Commit tài liệu cuối | OpenAPI, audit, báo cáo và kết quả tích hợp |

Các commit dựng tuyến tính từ main29d7671; không tạo commit merge gộp toàn bộ lịch sử chuong. Nhánh chuong vẫn nguyên11b9ea4. Xác nhận tích hợp theo nội dung, không khẳng định chuong là ancestor trong lịch sử mới. Commit gộp sai3470948/0a40079 không còn nằm trên main/chuong và chưa được push.

## Ưu tiên main khi conflict

Hai file conflict thực tế: DiscoveryErrorHandler.java và application.properties. Giữ phạm vi finance từ main, thêm payment để SePay nhận lỗi có cấu trúc. Controller/service/model/repository/DTO và tests sổ quỹ khớp main29d7671; giữ luồng DRAFT → POSTED, hủy có audit, quyền và tổng tiền.

Giữ nguyên SQL sổ quỹ của main, đổi tên V28 sang V35 để tránh trùng contract lifecycle của chuong; đăng ký đủ chuỗi V1–V35. Điều chỉnh thứ tự schema không thay luồng sổ quỹ. Không chạy vào database ứng dụng thật.

## Kiểm tra

- 35 đường dẫn SQL đã stage tồn tại, không trùng phiên bản. V35 đã chạy hai lần trên SQL clone có guard ancu_identity_verify_20261027213854.
- Mười checkpoint staged được export sang thư mục riêng: Maven offline test-compile PASS cả mười; TypeScript PASS chín checkpoint có frontend. Không dùng file chưa stage của nhóm sau để làm kiểm tra đạt.
- Đã chỉnh nhóm phụ thuộc trước commit: vneidService/tests đi cùng tài sản; route khoản thu bổ sung đi cùng thanh toán. Các lượt staged kiểm tra lại đều đạt; không đổi logic ứng dụng.
- Frontend85unit PASS; production Vite build PASS10.98s, có cảnh báo bundle lớn hiện hữu. Native config cần preload __dirname; Node tests cần transform-types. Dùng runner tạm, không sửa dependency/config project.
- Backend30integration (4cashbook+19SePay+7identity) PASS trong lượt kiểm thử cây kết quả trước khi chia commit. Đối chiếu cuối: toàn bộ backend/frontend khớp chính xác cây0a40079 đã kiểm thử. Không chạy lại SQL integration chỉ vì đổi lịch sử.
- Staged whitespace PASS; sổ quỹ khớp main. Không chạy lại browser: lượt này chỉ tổ chức commit, không sửa nội dung ứng dụng; không coi đây là bằng chứng browser mới.
- Context7 SQL initialization: Spring Boot4.1.0 gần nhất có tài liệu, project4.1.1; không đổi phiên bản.

Không push, không sửa liveDB/fixtures/provider hoặc restart server người dùng. WORK_PROGRESS ở workspace gốc ghi hash commit tài liệu cuối.
