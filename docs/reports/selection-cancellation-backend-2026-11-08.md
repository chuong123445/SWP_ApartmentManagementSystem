# FIX07 — Kiểm tra backend

Nhánh `feat/rental-selection-cancellation` từ `5b4cf52`. Xem ADR `initial-selection-cancellation-v1.md`.

PASS 91 kiểm thử khác nhau qua các lượt trên SQL Server test `ancu_settlement_test_20261103`: SelectionCancellation10, ContractDraft46, DiscoveryRental28, Notification5, ContractPdfLayout2. Logs ngoài Git: root `tmp/fix07-regression.log`, `fix07-concurrency.log`, `fix07-final-backend.log`, exit0; surefire reports trong backend target. SourceVersion timestamps chuẩn hóa microsecond tương thích SQL datetime2(6); lỗi thử nghiệm ban đầu kỳ vọng403 nhận409 do precision đã được sửa và chạy lại đạt. Fixture PDF constructor bổ sung trường DTO mới; không đổi nội dung PDF.

Bao phủ direct cancel cả chưa tạo/nháp, idempotence, giữ PENDING/publication, request mới→Owner accept→tạo draft mới, lịch sử before/after giữ quyết định cũ, một chữ ký cần đồng thuận và chặn ký, tự đồng ý bị403, reject/withdraw tiếp tục ký, giữ bytes chữ ký/snapshot/signed hash, không dùng endedAt/refund. Foreign ID/stale source/cross-request token/ACTIVE/renewal/claim khác bị chặn. Hai bài concurrent: proposal đối đầu chữ ký thứ hai chỉ một thành công; cancel đối đầu accept của lựa chọn khác không để phòng VACANT cùng live selection. Notifications đúng counterpart, không trùng legacy. Fixture commit riêng trong test concurrency được dọn đúng ID ở testDB; các test còn lại rollback.

V59 chạy qua SQL init test DB, không apply thủ công schema/data DB ứng dụng. Không provider/payment/refund/email/SMS call, không push/PR/merge. Ba file VNeID diagnostics untracked có sẵn giữ nguyên. Frontend/Playwright được ghi riêng trong báo cáo UI.
