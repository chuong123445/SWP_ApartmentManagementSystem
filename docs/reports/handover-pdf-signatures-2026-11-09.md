# Biên bản bàn giao PDF và hai chữ ký

## Nội dung triển khai

Nhánh `feat/handover-pdf-signatures` từ `c0e1408`. Backend `5686db1`.

Chủ nhà lập biên bản trả nhà với ngày bàn giao, địa điểm, danh mục tài sản và thiết bị, số chìa khóa, hiện trạng, ghi chú và ảnh chứng cứ. Thông tin hai bên và căn/phòng lấy từ bản hợp đồng đã lưu. Hồ sơ authoring cũ thiếu snapshot được chụp thông tin hiện có tại lúc lập, các trường chưa có hiển thị chưa cung cấp.

Sau khi lưu, cả chủ nhà và khách thuê xem cùng biên bản PDF riêng tư. Cả hai dùng khung ký đang được dùng cho hợp đồng thuê. Cho phép ký theo hai thứ tự. Chữ ký đầu tiên giữ hợp đồng ACTIVE và căn hộ OCCUPIED. Chữ ký thứ hai mới kết thúc hợp đồng và chuyển căn hộ sang VACANT trong cùng transaction.

Các mốc công tơ được đưa vào mục tùy chọn. Điện và nước bàn giao là chỉ số cuối lúc trả phòng. Hai mốc đầu là dữ liệu đối chiếu khi hồ sơ cũ chưa lưu baseline. Khi bỏ mục này, không đòi nhập công tơ và giữ nguyên mốc căn hộ. Khi sử dụng, backend vẫn kiểm tra mốc đầu, giá trị không giảm và chỉ số nguồn không thay đổi trước khi ký.

## Tính nhất quán và tương thích

- V63 thêm các cột nullable cho snapshot biên bản, hash, hai ảnh chữ ký và thời gian ký vào `contract_exit_cases`.
- Khóa parent request rồi contract, kiểm tra sourceVersion và contentHash khi ký. Người dùng chỉ ký bên của mình. Chữ ký trống, sai định dạng, sai người, ký lại hoặc bản cũ bị từ chối.
- Bất đồng hoặc lập lại biên bản vô hiệu chữ ký hiện tại. Lịch sử sự kiện giữ dữ liệu trước và sau, gồm nội dung và chữ ký để truy vết.
- Giữ các kiểm soát hóa đơn DRAFT, thuê tiếp, tranh chấp và quan hệ thuê cạnh tranh trước khi hoàn tất. Hóa đơn SENT còn nợ vẫn được lưu.
- Hợp đồng thuê, ngày kết thúc đã ký và chữ ký thuê gốc giữ nguyên. Phòng không tự công khai sau bàn giao.
- Endpoint xác nhận một bước cũ không còn kết thúc hợp đồng. Biên bản legacy vẫn đọc và hủy được. Biên bản cũ đang chờ chưa có PDF cần chủ nhà lập lại, hai bên ký mới.
- GET `exit/pdf` và POST `exit/sign` được khai báo trong SecurityConfig và kiểm tra đúng các bên tại service. Phản hồi no-store.

## Cách dùng

1. Khởi động backend với V63 và chạy frontend từ nhánh này.
2. Chủ nhà mở hợp đồng đã đến hạn hoặc đã thống nhất kết thúc sớm, chọn Kết thúc thuê / bàn giao cư trú.
3. Chọn Lập biên bản bàn giao cư trú, nhập thông tin rồi Lưu và xem PDF bàn giao.
4. Đọc PDF, ký trong khung và xác nhận nội dung.
5. Bên còn lại đăng nhập tài khoản của mình, mở cùng hợp đồng, tải lại trạng thái nếu cần, đọc PDF và ký.
6. Đủ hai chữ ký thì hợp đồng Đã kết thúc, phòng Trống. Danh sách khách đang thuê loại quan hệ đó, lịch sử hợp đồng và công nợ giữ nguyên.

## Kiểm tra thực tế

- 67 backend tests đạt trên database kiểm thử riêng `ancu_contract_pdf_20261103`, gồm 47 hợp đồng, 17 kết thúc thuê và 3 PDF layout. Compile/testCompile đạt.
- 156 frontend unit tests, TypeScript và Vite build đạt. Còn cảnh báo bundle lớn đã có từ trước.
- Playwright MCP chạy bản build hiện tại với API fixtures ở 1440 và 390 px. Bốn ca ký hai thứ tự và bốn ca hết hạn/kết thúc sớm đạt. Bao gồm PDF, chữ ký vẽ, chỉ ký một bên chưa kết thúc, đủ hai bên mới kết thúc, stale recovery, bất đồng/lập lại, ảnh chứng cứ, lỗi tải lại sau thao tác đã lưu và không tràn ngang.
- PDF được tạo bằng PDFBox 3.0.8, tái sử dụng font và layout hợp đồng. Poppler đã render hai trang bản có chữ ký và đã xem ảnh, phần xác nhận cùng hai khung chữ ký nằm chung trang. Kiểm tra nội dung dài và từ dài không mất nội dung đạt.
- Context7 đã đối chiếu PDFBox 3.0.8. OpenAPI JSON đã đọc lại và kiểm tra endpoint.
- Lượt đầu thiếu security match cho hai endpoint mới đã được sửa. Hai lỗi fixture/test hồi quy đã được sửa rồi chạy lại toàn bộ đạt.
- Bộ duyệt tự động từ chối bước dọn các helper cũ. Đã giữ các helper và kiểm soát cũ, chỉ thay bước hoàn tất bằng yêu cầu ký PDF. Lượt chạy kiểm thử riêng sau đó được chấp nhận.

Không thực hiện bàn giao trên hai hợp đồng Hữu Hà trong database ứng dụng. Chưa xác minh quy trình bằng tài khoản người dùng trên backend ứng dụng sau restart. Chưa push hoặc tạo PR trong công việc này. Ba file chẩn đoán VNeID có sẵn được giữ ngoài commit.

## Cập nhật trang riêng theo yêu cầu tiếp theo

UI hai chữ ký ban đầu được commit `baa7ec3`. Người dùng yêu cầu tách phần PDF và ký khỏi form/modal.

Đã thêm route `/contracts/:id/handover` dùng cùng guard đăng nhập và quyền đúng bên ở backend. Lưu biên bản thành công điều hướng trực tiếp sang trang này, không gọi lại callback của modal đã rời trang. Modal/form chỉ hiển thị liên kết mở lại biên bản. Trang mới có PDF bàn giao, chữ ký hai bên, trạng thái, tải lại, bất đồng/hủy và các đường dẫn trở về danh sách hoặc hợp đồng thuê. Danh sách hợp đồng của chủ nhà và khách thuê có liên kết Biên bản bàn giao / ký.

Playwright MCP đã kiểm tra bốn ca PDF/ký theo hai thứ tự ở 1440/390 px, bao gồm URL sau lưu, không còn dialog mở, chỉ có một iframe PDF bàn giao và reload trang. Bốn ca hết hạn/kết thúc sớm, stale, bất đồng/lập lại, chứng cứ và lỗi tải lại sau khi đã lưu cũng đạt qua cả entry modal và trang hợp đồng. Các ca dùng API fixtures và PDF thật do backend test tạo. TypeScript, 156 frontend tests và Vite build đạt. Context7 dùng tài liệu React Router 7.13.0 gần nhất, project khai báo 8.4.0 và kiểm tra bằng bộ types/build đang cài. Thay đổi trang này chỉ nằm ở frontend.
