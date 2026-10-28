# Đóng API Escrow legacy — 28/10/2026

Theo yêu cầu sửa F01 trong system-gap-audit-2026-10-28, mọi request tới `/api/trustguard/escrow` và các đường dẫn con bị SecurityFilterChain từ chối. Owner/Admin/Customer hợp lệ nhận403; guest không có quyền truy cập. Không gọi controller/service/persistence cho request bị chặn.

Model cũ không có quan hệ sở hữu với AuthAccount/Property/RentalContract đủ tin cậy, đang nhận entity và sinh mã ngân hàng giả lập. Không mở quyền theo role để thay cho ownership và không coi đổi trạng thái SQL là giải ngân ngân hàng.

Không xóa bảng, sửa chứng từ/hợp đồng hoặc chuyển dữ liệu hiện có. Các API auth, property, rental, contract và billing mới giữ nguyên quyền hiện tại.

Chỉ mở lại khi có thiết kế quyền theo hợp đồng/tài sản, DTO input giới hạn, trạng thái/version/idempotency và cơ chế tài chính được xác nhận. Đây là đóng bề mặt API legacy, không phải triển khai escrow/payment mới. Review regressions phải xác nhận không role nào gọi được list/create/release và service không được gọi.
