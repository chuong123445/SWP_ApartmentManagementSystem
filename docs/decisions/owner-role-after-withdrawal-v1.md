# Đồng bộ Owner khi rút hồ sơ

24/11/2026 — người dùng yêu cầu tài khoản không còn tài sản trở về Customer. Owner được cấp khi tài sản được duyệt; nháp/chờ duyệt không giữ quyền Owner nếu không còn tài sản APPROVED nào.

PropertyWithdrawalService giữ khóa account → property → dossier, sau khi đánh dấu WITHDRAWN và flush, kiểm tra tài sản APPROVED của exact account. Nếu không còn thì đổi Owner thành Customer trong cùng transaction; giữ Admin riêng biệt, không xóa tài khoản/căn cước/phiên/nghĩa vụ. Retry WITHDRAWN cũng đối chiếu lại. Tài khoản còn tài sản đã duyệt giữ Owner. Không bổ sung quyền xóa tài sản APPROVED (luồng rút hồ sơ vẫn chặn).

WithdrawPropertyButton đọc lại /me sau thành công để menu/route phản ánh quyền mới. Backend vốn xác thực từng token bằng account roles hiện tại từ DB nên access token cũ không giữ quyền đã thu hồi; refresh phát role mới. Không reset password hay giả lập login.

Ngoại lệ dữ liệu test: đợt xóa trực tiếp trước đó đã bỏ sót role31. Khi kiểm tra, Thu Hà có nháp10031; đến khi chuẩn bị sửa quyền, tài sản này đã được Admin APPROVED (Căn hộ Thu Hà). Guard dừng và rollback thao tác hạ quyền; không xóa/sửa tài sản mới, giữ31Owner đúng trạng thái hiện tại. Sau các thao tác DB cleanup ngoài ứng dụng, phải kiểm tra lại role trong cùng phạm vi cleanup; không coi xóa hàng DB là tự chạy service nghiệp vụ.

Kiểm tra: 30backend integration khác nhau đạt (12PropertyListing gồm3ca mới,18Dossier), ca tokenOwner/refresh/stale-retry được chạy lại và đạt sau tăng kiểm tra. 170frontend,TypeScript,build và4MCP1440/390 xlast/no-lastapproved đạt: đúng1withdraw, hide/keepmenu, Customer không vào /app, không console/pageerror/tràn ngang. API fixtures/SQLtest riêng; ảnhmobile đã xem. Không xác nhận bằng session đăng nhập Thu Hà thật; liveDB chỉ audit/attemptguardrollback. Cần restartbackend/reloadfrontend. Không migration.
