# Kiểm thử chung các thay đổi đã hoàn thành

Nhánh: `test/system-improvements-20261108`.

FIX-09 được bổ sung từ nhánh feat/early-termination-handover: backend `aedfadf` và giao diện kết thúc sớm/bàn giao cư trú mới. [Hướng dẫn và bằng chứng FIX-09](../reports/contract-exit-ui-2026-11-08.md). FIX-10/11 tạm hoãn theo yêu cầu; chưa triển khai quản lý/hoàn cọc.

Rà soát bổ sung: `1ea9dc0` giữ nhãn hủy trước hiệu lực trong bảng quan hệ thuê; `e87d0fc` cho áp dụng bộ lọc người dùng bổ sung sau khi AI trả gợi ý rỗng. Xem [báo cáo kiểm tra tích hợp](../reports/integrated-review-2026-11-08.md). Checklist thủ công với DB ứng dụng bên dưới vẫn chưa chạy; các kiểm tra tự động dùng DB test và API fixtures.

Nhánh được tạo từ `a93f01d`, bao gồm toàn bộ 14 commit sau local `main` (`9138d17`). Các unit đã nối tiếp nhau trong lịch sử; không cần cherry-pick hay tạo merge commit rỗng. Các chức năng trước đó đã nằm trong main cũng được giữ lại. Mốc origin/main ở đây là ref local đã có; lượt này không fetch/push hoặc tạo PR.

## Chạy trên máy hiện tại

Dừng backend/frontend cũ trước khi khởi động để tránh chạy nhầm code hoặc trùng cổng. Chạy backend và frontend từ cùng checkout này. Việc đổi nhánh không cập nhật tiến trình Java đang chạy.

PowerShell tại thư mục repository:

```powershell
cd F:\2026\Fa26\DTD\ancu-proptech
git switch test/system-improvements-20261108
cd ancu-proptech-backend
.\tools\start-local.ps1
```

Script có sẵn nạp cấu hình riêng từ `.env.local`, chạy Maven với profile local. Cần SQL Server và cấu hình DB/tài khoản hiện có. Backend mặc định cổng 8080; đợi khởi động thành công rồi mới kiểm tra giao diện. Có thể chạy `ProptechApplication` trong IDE với cấu hình môi trường tương đương.

Trong terminal thứ hai:

```powershell
cd 'F:\2026\Fa26\DTD\ancu-proptech\frontend-v2\an-cư-proptech---quản-lý-bất-động-sản-cho-thuê'
npm run dev
```

Mở **http://localhost:3000** (hoặc cổng Vite thực tế thông báo). Frontend proxy `/api` đến localhost:8080 trừ khi đã đặt `API_PROXY_TARGET`. Dùng tài khoản hiện có của Owner và Customer; có thể mở hai trình duyệt/profile để test hai bên. Không cần reset dữ liệu/tài khoản.

Khởi động backend sẽ chạy các script schema đã đăng ký, gồm V57 (lịch sử nháp hóa đơn), V58 (audit AI), V59 (hủy lựa chọn), V60 (kết thúc sớm/bàn giao cư trú/chứng cứ). Đây là kiểm thử có ghi dữ liệu: dùng DB test/bản sao nếu không muốn thay đổi hồ sơ, hóa đơn và hợp đồng đang dùng. Không chạy hai phiên bản backend cũ/mới cùng DB. Không dùng `ddl-auto=create` hoặc xóa DB để chuẩn bị test.

Nếu Vite báo ECONNREFUSED ở `/api/...`, kiểm tra backend đã khởi động ở cổng proxy, xem lỗi startup đầu tiên. Đổi nhánh frontend đơn lẻ không giải quyết lỗi backend.

## Checklist một lượt

Chưa đánh dấu đạt cho các bước thủ công dưới đây. Chuẩn bị hai tài khoản đúng bên của yêu cầu/hợp đồng; dữ liệu thuộc tài sản được phép quản lý. Trường hợp không có dữ liệu phù hợp ghi “chưa đủ dữ liệu”, không coi là đạt.

| Unit | Kiểm tra ở đâu | Thao tác và kết quả cần thấy | Kết quả thủ công |
|---|---|---|---|
| FIX-01 | Owner `/app` → Sổ quỹ Thu - Chi | Thêm khoản hợp lệ, tải lại và đổi tài sản; bản ghi lưu thật, tổng đúng scope; Owner khác không thấy | Chưa chạy |
| FIX-02 | Owner → Khách thuê | Cọc hiển thị theo từng hợp đồng, phân biệt 0/chưa có; không suy ra đã thu tiền từ số cọc trên hợp đồng; nhãn xác thực theo bằng chứng thật | Chưa chạy |
| Bỏ search mẫu | Owner workspace | Thanh tìm phòng/CCCD không hoạt động đã được loại bỏ | Chưa chạy |
| FIX-03 | Owner → menu và Tổng quan | Bộ đếm nợ/sắp hết hạn theo toàn scope, đổi tài sản và dữ liệu nhiều trang vẫn đúng; hóa đơn DRAFT/PAID không bị tính là nợ | Chưa chạy |
| FIX-04/05 | Owner → Tổng quan, Báo cáo & Thống kê | Đổi tài sản/năm; đối chiếu tổng hóa đơn, thực thu, công nợ; phân biệt kỳ hóa đơn với ngày thu; không hiển thị lợi nhuận suy đoán | Chưa chạy |
| FIX-06 | Owner → Báo cáo & Thống kê | Tải CSV, mở kiểm tra đủ 12 tháng/scope đã chọn và số tiền; lỗi tải được hiển thị | Chưa chạy |
| FIX-08 | Owner → Hóa đơn & Thu → nháp → Sửa / hủy · Lịch sử | Sửa chỉ số cuối/hạn và lý do, kiểm tra tính lại tiền/lịch sử; hủy nháp giữ chứng từ và cho lập lại cùng kỳ; không sửa hóa đơn đã gửi qua lệnh sửa nháp | Chưa chạy |
| TECH-01 | Customer `/my/maintenance`, Owner → Sự cố & Bảo trì | Tạo yêu cầu/ảnh, Owner xử lý theo trạng thái hiện hành; dữ liệu/lịch sử/quyền vẫn đúng sau refactor service | Chưa chạy |
| AI-01 | Trang chủ `/` → tìm kiếm AI | Đồng ý gửi nội dung, nhập nhu cầu → xem/sửa bộ lọc → xác nhận mới áp dụng. Kết quả lấy từ catalog; không có phòng phù hợp phải trả rỗng, lỗi provider hiện rõ | Chưa chạy |
| AI-04 | Owner → Tài sản cho thuê → mở hồ sơ tài sản đang chuẩn bị | Kiểm tra checklist, chọn chứng từ và đồng ý quét; xem kết quả từng tệp/thiếu dữ liệu, ghi đã xem; đổi thông tin/tệp làm mất hiệu lực kết quả cũ; không tự nộp/duyệt hồ sơ | Chưa chạy |
| FIX-07a | Owner → Yêu cầu thuê; Customer `/my/rental-requests`; hoặc chi tiết hợp đồng → Hủy / lịch sử làm hợp đồng | Dùng yêu cầu ACCEPTED chưa ký: một bên hủy với lý do → CANCELLED, phòng trống, lịch sử còn, không tự nhận yêu cầu tiếp theo | Chưa chạy |
| FIX-07b | Cùng vị trí, hợp đồng thuê đầu có đúng một chữ ký | Đề nghị hủy → khóa sửa/ký. Bên còn lại từ chối hoặc bên đề nghị rút → được tiếp tục ký. Thử lại và bên còn lại đồng ý → hủy, giữ chữ ký/nội dung/lịch sử, giải phóng phòng nếu đủ điều kiện | Chưa chạy |
| FIX-09 | `/contracts/{id}` → Kết thúc thuê / bàn giao cư trú | Hai bên đề nghị/đồng ý kết thúc sớm; chưa mở phòng. Owner lập biên bản ngày thực tế/chỉ số/phòng-thiết bị/chìa khóa/ảnh; Customer phản hồi bất đồng → Owner lập lại → Customer xác nhận mới ENDED/VACANT. Giữ nợ, PDF và chữ ký; không cọc/hoàn tiền. Thử cả hết hạn thông thường từ popup danh sách Owner | Chưa chạy |
| Quyền/xung đột | Hai phiên Owner/Customer và tài khoản ngoài quan hệ | Bên ngoài không xem/hủy hồ sơ của người khác. Hai tab cùng sửa/hủy phải báo stale hoặc yêu cầu tải lại; không ghi đè kết quả mới | Chưa chạy |

AI-01/04 dùng cấu hình Gemini backend hiện có (`GEMINI_API_KEY`, `GEMINI_MODEL`); không đặt key trong frontend. `ASSISTANCE_AI_ENABLED=false` tắt nhóm AI hỗ trợ này. Checklist cục bộ không chứng minh provider hoạt động. Các lượt trước dùng HTTP loopback/API fixtures, **chưa xác minh Gemini thật**. Chỉ gửi dữ liệu test đã được phép gửi khi thử provider thật.

FIX-10 (cọc thực thu), FIX-11 (quyết toán/hoàn cọc) được người dùng tạm hoãn; các AI backlog khác chưa triển khai. FIX-07 không hủy hợp đồng ACTIVE/thuê tiếp; FIX-09 xử lý ACTIVE qua đồng thuận và bàn giao cư trú, không hoàn tiền tự động.

## Bằng chứng hiện có và giới hạn

Các unit đã có báo cáo riêng trong `docs/reports/`. Tại tip FIX-07: 91 test backend liên quan qua các lượt, 137 test frontend, TypeScript/build và 6 kịch bản Playwright desktop/mobile đã đạt. Backend dùng SQL DB test, browser dùng API fixtures. Đây không phải kết quả chạy toàn bộ suite trong một lượt hoặc kiểm thử end-to-end với DB ứng dụng/Gemini thật.

Lượt tạo nhánh test chỉ xác minh ancestry của các nhánh unit và diff, không sửa code chức năng, không chạy server hoặc ghi DB, không tuyên bố checklist thủ công đã đạt. Ba file VNeID diagnostics có sẵn chưa track không thuộc nhánh được commit và không được đưa vào gói test.

Các commit tích hợp: `b600d50`, `be08210`, `dd38a1b`, `02799b4`, `fb48967`, `441f8ca`, `928c8a4`, `6f7df77`, `a0ac59e`, `0c3fb09`, `5b4cf52`, `42dee53`, `5420312`, `a93f01d`.
