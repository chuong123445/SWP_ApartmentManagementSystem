# FIX-09 — Kết thúc sớm và bàn giao cư trú

Quyết định người dùng 08/11/2026: chấp nhận hướng đề xuất FIX-09; tạm hoãn quản lý cọc thực thu/hoàn cọc FIX-10/11. Không triển khai cơ chế thu cọc trực tiếp cho Owner. Ý tưởng nhận cọc vào hệ thống bằng mã riêng và cộng dồn webhook chỉ là backlog.

## Quy tắc đã triển khai

- Đúng Owner hoặc Customer của ACTIVE contract đã bắt đầu được đề nghị kết thúc trước endDate. Ngày đề nghị trong thời hạn hợp đồng và không trước hôm nay (giờ Việt Nam). Phải ghi lý do, căn cứ điều khoản/thời hạn báo trước hoặc thỏa thuận khi không có điều khoản; ứng dụng không suy diễn điều khoản văn bản thành một số ngày mặc định.
- PENDING → bên còn lại ACCEPT (AGREED)/REJECT; người đề nghị WITHDRAW. Từ chối cần lý do. Không timeout, tự đồng ý hoặc quyền Admin phân xử. REJECTED/WITHDRAWN cho phép đề nghị mới; các vòng trước vẫn trong events. Ngày AGREED giữ nguyên cho đến bàn giao; chưa có lệnh đơn phương đổi thỏa thuận đã đồng ý.
- Khoản phạt/bồi thường đề xuất và bên chịu được cả hai rà soát trong đề nghị. Đây là thông tin thỏa thuận, không phải hóa đơn, giao dịch thu/chi, khấu trừ hoặc hoàn cọc.
- AGREED chưa đổi ACTIVE/OCCUPIED, ngày kết thúc gốc, nội dung/chữ ký/hash/snapshot đã ký. Renewal và legacy handover commands bị khóa khi exit đang xử lý. Không thể bắt đầu exit khi còn renewal PENDING/ACCEPTED, successor DRAFT/ACTIVE hoặc legacy handover PENDING; phải xử lý luồng đó trước.
- Owner lập biên bản cư trú tại/sau ngày AGREED (hoặc endDate với hết hạn thông thường), không sau hôm nay. Biên bản gồm ngày thực tế, chỉ số đầu/cuối, chìa khóa, tình trạng phòng/thiết bị dạng ghi chú, tối đa 5 ảnh được chọn. Đơn giá từ contract; chỉ số đầu từ hóa đơn SENT gần nhất/baseline, hoặc Owner nhập mốc đã đối chiếu nếu thiếu. Không mặc định 0. Nước PER_PERSON không được tính lần nữa theo chênh lệch đồng hồ.
- Customer xác nhận biên bản PENDING hoặc phản hồi DISPUTED kèm lý do/ảnh. DISPUTED chưa trả phòng; Owner lập biên bản mới để Customer xác nhận lại, hoặc hủy biên bản có lý do. Lưu before/after toàn bộ các vòng, không sửa mất phản hồi cũ. Không tự đóng tranh chấp, ép xác nhận hoặc thu tiền.
- Khi xác nhận: kiểm tra source/version và chỉ số nguồn hiện tại, không còn invoice DRAFT/renewal/legacy handover đang mở hoặc hợp đồng/lựa chọn khác giữ phòng. Khóa apartment và kiểm tra OCCUPIED rồi atomically ENDED/VACANT, ghi chỉ số cuối. endReason EARLY_TERMINATION hoặc HANDOVER; endDate gốc/signed snapshot không đổi, ngày thực tế nằm trong biên bản. Không tự publish, nhận yêu cầu khác hoặc xóa công nợ. Hóa đơn SENT chưa thu vẫn riêng tư/được lưu và xem sau khi kết thúc.

## Dữ liệu, quyền và tương thích

V60: contract_exit_cases (root/version), contract_exit_events (lịch sử commands không có API sửa/xóa), contract_exit_evidence (ảnh riêng tư, binary). Từng command khóa parent request rồi contract, cùng thứ tự với ký/renewal; sourceVersion SHA-256 gắn contract/account/apartment/version/billingVersion/root payload. Token dùng để chống stale, không thay quyền JWT.

Ảnh JPEG/PNG tối đa 1 MB đầu vào, 4096 mỗi cạnh/12M pixels; decode/re-encode, đầu ra tối đa 4MB. Tối đa20ảnh/contract, danh sách chọn không lặp/đúng contract và người upload. Exact-party xem/tải, no-store/nosniff/attachment; không dùng URL công khai. Ảnh đã upload được giữ để chọn lại, kể cả chưa gắn vào một command. Audit command giữ các IDs đã gắn.

Chức năng mới độc lập với bảng contract_handovers cũ vốn chứa số tiền cọc giả định. Không chuyển hoặc sửa biên bản cũ, không dựng lịch sử quá khứ. Giao diện hợp đồng chuyển nút tạo bàn giao sang luồng cư trú mới; biên bản legacy PENDING đã tồn tại vẫn có thể xử lý theo API/UI cũ khi không có exit đang mở. API legacy chưa bị xóa.

## Giới hạn

Chỉ contract có bản authoring/saved draft hỗ trợ luồng này; không tạo snapshot cho legacy fixture thiếu bản nội dung. Không tự tính báo trước từ ngôn ngữ tự nhiên, tiền thuê tháng lẻ, tranh chấp pháp lý, chi phí hư hỏng, quyết toán/hoàn cọc hoặc thanh toán khoản phạt. utilityAmount là đối chiếu theo chỉ số/đơn giá, chưa tạo chứng từ thu. Không chặn kết thúc vì hóa đơn SENT còn nợ; phải xử lý invoice DRAFT để khóa chuỗi trước khi trả phòng.
