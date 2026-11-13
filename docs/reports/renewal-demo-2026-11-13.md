# Hợp đồng mẫu sắp hết hạn cho Hữu Hà / Nguyễn Văn Chương

Yêu cầu 13/11/2026: thêm một hợp đồng sắp hết hạn để thử gia hạn, giữ nguyên hợp đồng cũ.

Đã thêm **HD-17**, apartment28 / **HH205.RENEW**, request56, property2. Owner3 Nguyễn Văn Chương, Customer2 Hữu Hà. Thời hạn **20/08/2026–20/11/2026**, ACTIVE, local_fixture=true, phòng OCCUPIED/HIDDEN. Cửa sổ yêu cầu thuê tiếp mở từ **10/11/2026**; ngày tạo13/11 nằm trong D-10. Chưa tạo sẵn renewal request hoặc successor, nên Hữu Hà có nút Gửi yêu cầu thuê tiếp. Sau khi Owner chấp nhận, Owner có nút Tạo hợp đồng ký tiếp. Không đổi điều kiện gia hạn để bỏ qua bước này.

Chỉ thêm apartment/request/contract/draft. Tái sử dụng nội dung/ảnh chữ ký của **mẫu local HD-5**, ghi rõ đây là mẫu thử, không phải ký/thỏa thuận mới, không sao chép signed_content_hash cũ. Không thay đổi snapshot hoặc chữ ký của HD-4/5/14/15; không tạo hóa đơn, thanh toán hoặc gửi email. Fixtures không được đưa vào startup hay production migration.

`ancu-proptech-backend/tools/add-renewal-demo-20261113.ps1`: mặc định Preview, `-Validate` thực thi rồi rollback, `-Apply` backup DataSet có schema và kiểm tra roundtrip trước commit. SQL giới hạn localhost/proptech_db, ngày tạo13/11/2026, exact parties/source fixture, marker collision, transaction Serializable. Trước/sau đối chiếu **mọi cột của mọi hàng cũ** trong 6 bảng apartment/request/contract/draft/account/renewal_requests.

Preview PASS, Validate/rollback PASS (ID identity16/27/55 bị tiêu thụ nhưng không có hàng lưu), Apply PASS (17/28/56), readback PASS, Apply lại created=false/marker_count1 PASS. Tổng contracts4→5; bốn hợp đồng cũ nguyên vẹn. Bản sao riêng ngoài Git: `F:/2026/Fa26/DTD/tmp/renewal-demo-before-20261113-164757-358.xml` và bản trước lần Apply idempotent164825136. Readback xác nhận renewal_request_available=1, snapshot parties/room match, no copied signature hash. Node chạy trực tiếp `contractLifecycleActions` PASS cho Customer request và Owner create sau acceptance; chưa xác minh bằng đăng nhập live UI/API. Không sửa code giao diện nên không mở test server hay chạy lại frontend/backend suites. git diff --check PASS.

Mở `/contracts/17` hoặc chọn HD-17 trong Hợp đồng của Hữu Hà. Không cần restart backend để đọc fixture mới; tải lại trang. Source commit và handoff tại WORK_PROGRESS.md.
