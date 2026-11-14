# Hủy/xóa hợp đồng nháp chưa ký — 13/11/2026

User muốn hợp đồng chưa hiệu lực không còn trong danh sách sau khi đổi ý trong quá trình soạn. Hủy lựa chọn thuê đầu khi nháp chưa có chữ ký nay xóa contract_drafts trước, rồi rental_contracts trong transaction. Giữ request CANCELLED, lý do và audit before/after theo request, trả phòng VACANT khi không có claim khác và giữ publication/PENDING requests. Không xóa hợp đồng đã có chữ ký; hủy song phương trước hiệu lực và lifecycle ACTIVE không đổi.

API cancellation trả contractId/contractStatus=null sau xóa. ContractDocument đóng wizard hoặc chuyển về danh sách thay vì GET lại contract/PDF đã xóa. Nháp unsigned CANCELLED cũ được loại khỏi owner/customer draft và tenancy lists mà không bulk-delete dữ liệu đã lưu. Không có migration hoặc thao tác reset database ứng dụng.

SQL integration: **11/11 PASS** SelectionCancellationIntegrationTests trên database riêng `ancu_listing_ai_20261113`: actual draft+contract deletion, private GET/PDF 404, request history/idempotency, new rental selection, exact parties, signed cancellation, concurrent cancellation/signature/acceptance, old cancelled-list exclusion. Test helper cũ ký không OTP gây 4 lỗi OTP_NOT_ACTIVE ở lần đầu; cập nhật helper gửi/nhận OTP qua mocked EmailOtpSender theo luồng hiện hành, không tắt OTP ứng dụng; rerun PASS. Không gửi email/provider thật.

Playwright MCP: **6 scenarios PASS** tại 1440/390 gồm hủy trực tiếp chưa có contract, xóa nháp và redirect, luồng một chữ ký đề nghị/từ chối/rút/đồng ý. API fixtures, không phải live appDB UI. TypeScript/162frontend unit/build PASS; cảnh báo bundle lớn sẵn có. Không chỉnh RDS/sơ đồ, fixtures hoặc triển khai production.
