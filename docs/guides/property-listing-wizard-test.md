# Chạy thử luồng đăng tải tài sản

## Chuẩn bị

Dùng nhánh `fix/property-auto-extraction`, backend Java21 và frontend React/Vite của dự án. Cấu hình SQL Server và AI theo các file setup hiện hành, giữ thông tin bí mật trong môi trường local.

Backend startup có V61 và V62. V62 tạo bản nháp riêng tư và quan hệ ảnh với căn/phòng. Cần nghiệm thu trên database test trước khi chạy nhánh này với dữ liệu sử dụng thật. Trong phiên triển khai, kết nối test localhost1433 bị từ chối bởi môi trường, nên migration và hành vi giao dịch chưa được xác nhận qua SQL thực tế.

Đăng nhập tài khoản ACTIVE có bằng chứng VNeID được backend chấp nhận. Nhánh nguồn sử dụng Auth0/VNeID mô phỏng theo cấu hình hiện có. AI trích xuất dùng cấu hình dossier AI và cờ assistance AI hiện hành. AI lỗi vẫn có thể nhập tay để hoàn tất hồ sơ hợp lệ.

## Hồ sơ thủ công

1. Mở `/account/properties/new`.
2. Chọn được ủy quyền hoặc thuê lại. Với chính chủ, chọn nộp giấy tờ thủ công trong nhánh chính chủ.
3. Bắt đầu hồ sơ hoặc chọn bản nháp đã lưu.
4. Tải chứng từ theo nhóm. Hệ thống tự gửi giấy tờ tới Gemini đã cấu hình và đọc nội dung.
5. Các trường đọc được tự điền, gồm tỉnh/thành, quận/huyện và phường/xã. Kiểm tra nguồn, sửa nếu cần và bổ sung phần giấy tờ không có. Ngày hiển thị và nhập dd/MM/yyyy. Xác nhận đã đối chiếu thông tin.
6. Tạo nguyên căn hoặc nhiều phòng. Chọn các phòng muốn đưa vào hồ sơ và nhập diện tích, giá, phí. Có thể thu gọn thông tin từng phòng và sao chép điều kiện chung.
7. Tải ảnh chung và ảnh riêng mỗi phòng. Có thể bỏ ảnh hoặc đặt ảnh đầu làm đại diện.
8. Xem trước thông tin công khai và hồ sơ riêng tư. Hệ thống tự đối chiếu AI lần cuối với dữ liệu hiện tại.
9. Gửi hồ sơ. Sau khi Admin duyệt, công khai từng căn theo luồng hiện có.

Nút lưu tiến trình lưu phần đang khai vào server. Tải lại trang hoặc mở danh sách hồ sơ để tiếp tục. Thay đổi chưa bấm lưu có thông báo riêng. Nếu xung đột phiên bản, tải bản đã lưu rồi đối chiếu lại nội dung.

## Tài sản từ nguồn

1. Mở nhánh chính chủ và đồng ý đọc tài sản theo cơ chế hiện hành.
2. Chọn tài sản và các phòng chưa thêm.
3. Nhập điều kiện thuê của những phòng đã chọn.
4. Tải ảnh chung nếu tạo tài sản mới và ảnh riêng cho mỗi phòng.
5. Xác nhận thêm và cho thuê. Nguồn được kiểm tra lại phiên bản trên backend.
6. Khi bổ sung phòng, dùng lại địa phương và ảnh chung đã có, bổ sung ảnh riêng cho các phòng mới.

Chỉ số công tơ trống được giữ null khi tạo phòng. Khi chuẩn bị hợp đồng và hóa đơn, cần kiểm tra baseline theo quy tắc của hệ thống.

## Ảnh sau khi tạo

Mở trang chi tiết căn bằng tài khoản có quyền quản lý. Có hai khu vực quản lý ảnh chung và ảnh riêng. Mỗi nhóm giữ 1–4 ảnh. Giữ/bỏ/đưa ảnh lên đầu rồi lưu. Sửa ảnh riêng gửi version của căn, sửa ảnh chung gửi version của tài sản.

Ảnh riêng căn đang ẩn hoặc nháp cần quyền đọc của người tải. Trạng thái công khai của một phòng khác cùng tài sản không làm ảnh riêng này được công khai.

## Trang tìm kiếm

Mỗi tài sản có một thẻ với số phòng, khoảng diện tích và khoảng giá phù hợp. Bấm chọn phòng để mở từng trang ba phòng. Bộ lọc của tài sản và phòng phải khớp. Yêu cầu thuê tiếp tục gắn với ID căn cụ thể.

## Ba bộ demo

Dùng đúng các folder tại `F:\2026\Fa26\DTD\output\pdf\Bo_demo_3_bo_ho_so`.

| Bộ | Thao tác | Kết quả mong đợi |
|---|---|---|
| 01_DAY_DU | Chọn chính chủ thủ công, upload giấy tờ mới của Nguyễn Văn Chương, khai hai phòng khác diện tích/giá, gán ảnh riêng rồi gửi | Dữ liệu xác nhận và nguồn hiển thị rõ, hai phòng giữ giá và ảnh riêng, hồ sơ vào quy trình Admin |
| 02_THIEU | Upload phần chứng từ hiện có rồi lưu, tải lại, thử tiếp tục khi thiếu giấy bắt buộc | Tiến trình vẫn đọc lại được, thông báo thiếu nhóm giấy, bổ sung trước khi gửi |
| 03_KHONG_KHOP | Chọn chính chủ thủ công, upload giấy chứng nhận cũ và văn bản ủy quyền cũ vào nhóm bổ sung | Thông tin tự điền từ giấy tờ có chủ Lê Minh Khoa khác người nộp Nguyễn Văn Chương; bước đối chiếu và Admin xử lý sai lệch, AI không tự thay quyết định |

Trong mỗi bộ, dùng `THONG_TIN_NHAP.txt`, `DU_LIEU.json`, `PDF_GIAY_TO` hoặc `PNG_GIAY_TO` và `ANH_TAI_SAN`. Nếu cần minh họa hai phòng bằng cùng ảnh có sẵn, nói rõ đây là dữ liệu trình diễn. Muốn kiểm tra phân biệt ảnh, chọn hai tệp khác nhau cho hai phòng.

## Kiểm tra tự động

Frontend có `npm test`, `npm run lint`, `npm run build` theo package hiện có. Hai ca Playwright tại `e2e/property-listing-wizard.spec.js` dùng API giả lập, chạy với `E2E_BASE_URL` trỏ tới frontend đang chạy. Chúng kiểm tra wizard, AI lỗi, lưu rồi tải lại, dữ liệu nguồn, ảnh và nhóm tìm kiếm ở 1440/390.

Backend chạy các nhóm `PropertyListingServiceTests`, `PropertyDossierPaymentTests`, `PropertyUnitImageTests`, `OwnerPrecheckDeclarationTests`. Các ca tích hợp trong `PropertyListingIntegrationTests` cần database test, bao gồm create/retry/save/private/stale, validation và hoàn tất chỉ tạo một submission.

## Giới hạn kiểm chứng hiện tại

Playwright trong phiên đã chạy bản build qua route giả lập do môi trường chặn loopback. Các thao tác được kiểm tra ở trình duyệt thật với API fixture. Chưa chạy thành công SQL migration, đồng thời/rollback trên database hoặc provider Gemini thật. Test CLI Playwright được lưu để chạy lại ở môi trường local có thể mở server, kết quả MCP không được coi là kết quả CLI.

L08 về AI ảnh và mô tả được hoãn theo yêu cầu giới hạn đến L07.


## Tự đọc giấy tờ và ngày tháng, cập nhật 09/11/2026

Tải tệp thành công sẽ lưu trước rồi tự gọi AI. Tệp đã đọc được đánh dấu trong bản nháp, tệp lỗi sẽ thử lại khi bổ sung giấy tờ hoặc mở lại bản nháp. Trường do người dùng sửa được giữ khi tệp khác trả về giá trị mới. Các giá trị tự điền trước đó có thể được cập nhật. Nguồn tệp/trang vẫn có trong phần thu gọn.

Chỉ tách địa chỉ được nêu trên giấy. Nếu không có quận/huyện thì trường này để trống để bổ sung. API và database giữ yyyy-MM-dd, giao diện và giấy tờ dùng dd/MM/yyyy. So sánh AI chuẩn hóa cả hai dạng về cùng ngày trước khi báo khác biệt. Kết quả AI cũ cần quét lại để áp dụng quy tắc mới.

Bộ đầy đủ mới dùng OWNERSHIP. Dữ liệu cá nhân đối chiếu ảnh và bản local lưu 04/11/2026 vì kết nối SQL hiện tại bị chặn. Cần đối chiếu lại tài khoản đang dùng trước demo. Hai PDF đầy đủ cũ được giữ nguyên byte trong bộ sai thông tin.
