# Kết thúc khi người thuê không phản hồi

22/11/2026. Người dùng chọn chờ30ngày kể từ thông báo; người thuê phản đối thì chặn đơn phương. Không tự kết thúc hoặc đưa căn hộ về trống khi hết hạn.

## Luồng

Chủ nhà mở hợp đồng → Kết thúc thuê / bàn giao cư trú → Kết thúc khi người thuê mất liên lạc. Gửi lý do và căn cứ/điều khoản; thông báo được lưu trong contract_exit_events, xuất hiện trong chuông thông báo riêng của đúng tenant, dẫn tới hợp đồng. Đây là thông báo trong ứng dụng, không xác nhận đã gửi email/SMS, đã được đọc hoặc đã tống đạt pháp lý.

Server dùng Clock UTC; responseDeadline = proposedAt + Duration.ofDays(30), không nhận deadline từ client. Hiển thị giờ Việt Nam. Đến hạn chỉ mở quyền xác nhận. Chủ nhà phải xác nhận đã thu hồi thực tế phòng/chìa khóa, đã đối chiếu chỉ số và khoản phải thu, nhập hiện trạng và chọn1–5ảnh chứng cứ do chính mình tải lên cho đúng hợp đồng. Kết thúc yêu cầu consent và sourceVersion mới nhất. Có hóa đơn nháp thì gửi/hủy trước. Hóa đơn SENT còn nợ giữ nguyên, không auto-paid/trừ cọc/hoàn tiền; không thêm tính tiền ngày lẻ/cuối kỳ (RA04 vẫn cần quy tắc).

Giao dịch khóa cùng luồng bàn giao hiện có: parent request/contract/apartment. Kiểm tra phòng OCCUPIED, không có quyền thuê khác hoặc renewal/handover cạnh tranh. Thành công: contract ENDED, endReason UNILATERAL_ABANDONMENT, endedAt hiện tại, apartment VACANT; giữ nguyên endDate thỏa thuận, publication/quyền tài sản, chữ ký hợp đồng và toàn bộ công nợ. Không giả chữ ký tenant hoặc đổi biên bản sang hai bên đã ký. Closure notes/evidence/time lưu riêng trong unilateral JSON và before/after event. Retry finalization của đúng Owner không tạo lại event.

Tenant có thể phản đối khi thông báo còn PENDING, kể cả đã quá hạn nhưng chủ nhà chưa xác nhận. Khóa/version khiến phản đối và finalize không ghi đè nhau. OBJECTED không thể bị Owner rút hoặc gửi lại để bỏ qua phản đối; chỉ còn giải quyết song phương/tranh chấp theo luồng được hỗ trợ. Chủ nhà chỉ rút thông báo PENDING. Thông báo mới không được mở để vượt đề nghị/bàn giao/thuê tiếp đang mở hoặc bất đồng bàn giao cũ; giao diện giải thích điều kiện bị chặn. Hợp đồng ACTIVE đã quá endDate vẫn có thể bắt đầu thông báo nếu không có các xung đột đó. Không tự hủy hợp đồng thuê tiếp đã ký.

## Tách kiểm soát hợp đồng và hóa đơn

ContractExitGuard.blocksLeaseChange/requireLeaseChangeOpen chặn thuê tiếp và bàn giao cũ khi thông báo PENDING/OBJECTED. blocks/requireOpen cho billing giữ nguyên để tiếp tục lập tiền thuê/điện nước trong30ngày chờ. Các thao tác kết thúc thông thường tạm chặn khi notice PENDING; sau OBJECTED vẫn có thể giải quyết bằng bàn giao/sự đồng ý thực của hai bên. Không có cron tự kết thúc.

V72 thêm unilateral_state defaultNONE và unilateral_json nullable; không sửa hợp đồng/lịch sử cũ. Các trường mới chỉ là response và cấu hình server, không chấp nhận client gán state/deadline. API vẫn qua /exit/actions với4action được bổ sung. Mốc30ngày là chính sách ứng dụng người dùng đã chọn, hệ thống chỉ ghi nhận căn cứ do chủ nhà khai, không tự xác minh giá trị pháp lý của điều khoản.

## Kiểm tra

97backendPASS (71ContractDraft+26ContractExit),0skip, gồm7ca mới: đúng Owner/tenant, thông báo private/deadline, trước hạn1giây, đúng hạn/read không tự kết thúc, idempotence, giữ nợ/chữ ký/endDate, phản đối sau hạn+stale race, không xóa phản đối, billing-vs-renewal guard, proof/ack/draft invoice, hợp đồng quá hạn/dispute gate. Có hồi quy cạnh tranh bàn giao cũ trong suite hiện có.

TypeScript/174frontend/productionbuildPASS,6MCPdesktop1440/mobile390 cho gửi/ phản đối/thu hồi; ảnh mobile đã xem. Ca mobile final trả409, không tự retry; reload và xác nhận lại với ảnh đã lưu thì thành công. Mỗi final có ack/hiện trạng/chứng cứ; không phát OTP ký, không có chữ ký tenant giả. Browser dùng APIfixture; backend DBtestancu_auto_rent_20261114 và sender mock, không thao tác hợp đồng thật.

Local branchduy/withdraw-dossiers-unresponsive-tenant, không push/main. Restartbackend để chạy V71/V72 và reloadfrontend. Tiếp tục dùng CHANGELOG_NGHIEP_VU.md và WORK_PROGRESS cho hashes/evidence.
