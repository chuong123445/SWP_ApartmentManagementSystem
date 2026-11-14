# FIX-07 — Hủy quá trình làm hợp đồng thuê đầu

User chấp thuận ngày 08/11/2026: cả Owner và Customer của đúng lựa chọn được hủy trực tiếp khi chưa tạo hợp đồng hoặc nháp chưa có chữ ký, cần lý do. Một chữ ký: gửi đề nghị, bên còn lại đồng ý/từ chối; người đề nghị được rút. Không có timeout/tự chấp thuận. Hai chữ ký, ACTIVE và hợp đồng gia hạn dùng lifecycle riêng, không hủy bằng API này.

## Trạng thái và lưu lịch sử

`RentalContract.CANCELLED` là hủy trước hiệu lực, khác ENDED. Root `selection_cancellations` lưu trạng thái hiện tại PENDING/CANCELLED/REJECTED/WITHDRAWN và người/lý do đề nghị, phản hồi, timestamps/version. Không có root thì API trả NONE. Có thể đề nghị lại sau REJECTED/WITHDRAWN; từng vòng được giữ trong event append-only, không xóa vòng cũ.

START không chữ ký → request CANCELLED, contract CANCELLED nếu đã tạo, phòng VACANT. START một chữ ký → PENDING, phòng vẫn CONTRACT_IN_PROGRESS. ACCEPT chỉ bên còn lại → hủy; REJECT chỉ bên còn lại và có lý do → tiếp tục bước ký; WITHDRAW chỉ người đề nghị → tiếp tục bước ký. START bắt buộc lý do; ghi chú ACCEPT/WITHDRAW tùy chọn. Không xóa hoặc viết lại chữ ký, snapshot, điều khoản, contentVersion/signed hash. `endedAt` không được dùng cho cancelled draft. Lịch sử lưu actor ID/tên/thời gian/action/reason và before/after, gồm quyết định/thời gian chấp nhận trước khi chuyển request sang CANCELLED.

## Giao dịch, phiên bản và phòng

API kiểm tra exact-party trên account server; không nhận actor/property/room/refund từ client. Khóa cùng parent RentalRequest với luồng create/edit/sign, sau đó contract và apartment khi mở phòng; refresh dữ liệu sau khóa. SourceVersion SHA-256 bao gồm request/apartment/party IDs, request/contract/content versions, trạng thái, timestamps chữ ký/signed hash và root version/time. Thay chữ ký dù contentVersion không đổi vẫn làm token cũ lỗi409.

Khi PENDING, ContractDraftService context/create/edit/sign bị guard chặn. Từ chối/rút mở lại bước ký nhưng nội dung đã có chữ ký vẫn khóa theo quy tắc cũ. Client không tự đổi token rồi retry; cần tải lại và xác nhận lại.

Trước khi trả VACANT, xác nhận request vẫn ACCEPTED, contract nếu có là initial DRAFT, chưa đủ hai chữ ký, apartment vẫn CONTRACT_IN_PROGRESS, không có DRAFT/ACTIVE contract khác hoặc accepted selection chưa kết thúc/hủy. Kiểm tra các claim khác trước khi lấy khóa cập nhật apartment để tránh chờ vòng với accept đang giữ parent khác. SQL index accepted theo apartment hỗ trợ truy vấn. Không đổi publication/approval/quyền khai thác, không động tới các PENDING request khác, không tự chọn người kế tiếp. Có thể gửi/accept/tạo hợp đồng cho lựa chọn mới sau khi hủy đúng quy trình; contract CANCELLED không tiếp tục giữ phòng.

Cùng actor/action/reason retry kết quả hiện hành tương ứng trả lại view, không tạo event/thông báo lần hai. Các actor khác hoặc thay đổi nội dung/token phải kiểm tra phiên bản. Ký/hủy, create/hủy và accept/hủy được serialized/kiểm tra lại; không có cập nhật nửa chừng.

## API và thông báo

- GET `/api/v1/rental-requests/{id}/cancellation`: thông tin chữ ký/trạng thái, quyền thao tác, sourceVersion và lịch sử, no-store, exact-party.
- POST `/api/v1/rental-requests/{id}/cancellation/actions`: `{action: START|ACCEPT|REJECT|WITHDRAW, sourceVersion, reason?}`; trả view mới. Lý do tối đa2.000 ký tự. 400 input,403 tự đồng ý/hủy thay bên khác,404 foreign ID,409 stale/state/other claim.
- ContractDraftResponse bổ sung `cancellationState`; trạng thái hợp đồng thêm CANCELLED. Guards inventory/renewal/handover loại cả CANCELLED và ENDED khỏi open contracts.
- Native notification feed đọc events và chỉ thông báo bên còn lại, với URL hợp đồng nếu có. Hủy accepted theo FIX07 không tạo thông báo legacy “Khách đã hủy” trùng/sai actor. Không gọi email/SMS/provider khác.

## Tiền và triển khai

Không thu/khấu trừ/hoàn cọc hoặc đánh dấu đã hoàn; cọc thực thu và quyết toán vẫn là FIX10/11. Hợp đồng ACTIVE thuộc FIX09. V59 thêm root/event tables/index, không backfill quyết định hủy cho dữ liệu cũ. Source migration đăng ký startup; chưa apply thủ công lên DB ứng dụng. Giữ V56 và toàn bộ migration trước đó. Context7 Spring Data JPA4.1.0 gần nhất managed4.1.1; React19.3.0 cleanup đối chiếu nguồn chính thức.

## Override 13/11/2026 — nháp chưa ký bị hủy

Theo yêu cầu mới, khi hủy lựa chọn thuê đầu không có chữ ký, xóa `contract_drafts` rồi `rental_contracts` trong transaction sau khi ghi audit của yêu cầu thuê. Response không còn contractId/contractStatus; không đọc lại PDF đã xóa, UI đóng wizard/quay lại danh sách. Request/root/events/lý do hủy vẫn tồn tại; giữ khóa request/contract/apartment, tính idempotent, pending requests và trạng thái công khai. Nháp đã có chữ ký vẫn giữ dữ liệu và đi qua quy trình đề nghị/đồng ý. Không xóa hàng loạt dữ liệu đã lưu: các nháp CANCELLED chưa ký cũ được loại khỏi danh sách Owner/Customer/tenancies; lịch sử cũ vẫn có thể đọc bởi đúng bên. Không áp dụng cho hợp đồng đã có hiệu lực, gia hạn hoặc thanh toán.
