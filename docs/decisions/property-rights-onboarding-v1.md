# Hồ sơ quyền cho thuê, thời hạn và nhắc hạn

Ngày27/10/2026 user chốt và giao triển khai: Auth0/VNeID VERIFIED bắt buộc trước khi gửi yêu cầu nâng cấp/hồ sơ; ủy quyền và thuê lại thủ công qua Admin, không cần có tài sản chính chủ trong Auth0. Giữ một role OWNER, quyền theo từng Property. Nhánh chính chủ từ nguồn Auth0 vẫn tự động như V15.

## Quyền và hồ sơ

Customer ACTIVE/VERIFIED mở Self application riêng, không được dùng Owner inventory trước duyệt. DRAFT Property+Apartments thuộc exact account và flag onboardingApplication. Mọi upload/submission kiểm tra VNeID và sở hữu phía Backend. Admin APPROVE khóa account/property/dossier, kiểm tra lại trạng thái/VNeID, xác nhận đã đối chiếu giấy tờ và thời hạn rồi cấp OWNER/approve exact Property cùng transaction. Không unlock LOCKED/INACTIVE, không nâng role bằng email hoặc client flag, không auto-publish. Role Owner giữ chức năng thuê/lịch sử của mình.

AUTHORIZATION: giấy tờ sở hữu gốc + giấy ủy quyền. SUBLEASE: giấy tờ sở hữu gốc + hợp đồng thuê gốc + văn bản đồng ý cho thuê lại riêng. Không kiểm tra điều khoản cho thuê lại trong hợp đồng để thay văn bản riêng. Giấy tờ phân loại bằng purpose riêng, max20 tổng/200 file mỗi property; ID/filepurpose/ownership được kiểm tra, nội dung do Admin đối chiếu, không OCR hoặc tự xác nhận công chứng.

Người nộp lấy legalName/CCCD từ evidence VNeID lưu sẵn, không yêu cầu nhập lại/upload CCCD để coi tài khoản VERIFIED. Hồ sơ có tên/CCCD chủ sở hữu gốc riêng tư; public chỉ có nhãn OWNERSHIP/AUTHORIZATION/SUBLEASE, không có giấy tờ/CCCD/bank.

## Lưu trữ

Giữ SQL Server property_evidence_files + property_evidence_content VARBINARY(MAX). PDF/JPEG/PNG tối đa10MB/file, multipart request12MB. Raster kiểm tra/re-encode/cap20MP; PDFBox3.0.8 parse, cap100pages, từ chối malformed/encrypted/JavaScript/active actions/embedded content nhận diện. Đây không phải antivirus hoặc kiểm chứng giấy tờ pháp lý. Download luôn attachment/no-store/nosniff; exact applicant hoặc ACTIVE Admin khi file nằm trong hồ sơ đã gửi. Không URL công khai và không upload provider khác.

## Thời hạn

Tất cả quyền giới hạn có ngày bắt đầu/kết thúc rõ ràng. SUBLEASE phải nằm trong cả hợp đồng thuê gốc và văn bản đồng ý; không tự clamp ngày sai, trả400 để sửa. Không tự cộng một năm cho giấy tờ thiếu thời hạn: Admin đối chiếu rồi yêu cầu bổ sung hoặc xác nhận ngày phù hợp; Điều563 chỉ áp dụng mặc định một năm khi không có thỏa thuận và pháp luật không có quy định. Tham khảo [BLDS2015](https://vietlaw.quochoi.vn/Pages/vbpq-print.aspx?ItemID=27892).

Ngày hết hạn được tính đến hết ngày tại Asia/Ho_Chi_Minh. Search/address options loại quyền hết hạn/chưa có hiệu lực; direct detail giữ đọc lịch sử và báo không nhận khách. Backend chặn publication/new requests/acceptance và create/update contract ngoài approved window, không phụ thuộc scheduler. Khóa/tải lại property trong commands; khóa trước snapshot mới để context cũ gặp SOURCE_CHANGED. Contract context hiển thị current window; party mới ưu tiên căn cước VERIFIED, trường ngày/nơi cấp thiếu vẫn null. Old snapshots/contracts/history/availability giữ nguyên, không ký/activate/pay/cancel hay triển khai workflow gia hạn hợp đồng mới.

Gia hạn quyền bằng hồ sơ mới, không sửa hồ sơ đã duyệt. Pending/rejected renewal giữ quyền cũ đến hạn; approval mới thay approved rights/dossier ID. Publication cũ không bị reset; chỉ đủ điều kiện nhận khách lại sau khi quyền mới được duyệt/có hiệu lực. Legacy fixtures không bị backfill ngày, role hoặc credentials.

## Nhắc hạn

V17 in-app notice unique(dossier,kind), EXPIRING trong30ngày hoặc EXPIRED từ ngày kế tiếp sau end. Spring Scheduler lần đầu sau1phút, sau đó1giờ, cấu hình app.property-rights.scheduler-enabled/initial-delay-ms/interval-ms. App phải chạy; không phải automation của Codex/OS. Enforcement vẫn tức thời nếu scheduler tắt.

Email outbox snapshot recipient; chỉ gửi email thực sự verified, đúng địa chỉ hiện tại/account ACTIVE/current approved dossier. Auth0 email không tự được coi emailVerified. Thiếu SMTP giữ PENDING; lỗi retry tối đa5lượt/backoff, lease10phút/attempt guard; old dossier/changed email bỏ gửi. SMTP accepted rồi process crash trước DB ack có thể gửi lặp; không cam kết exactly-once hay inbox delivery. Không SMS/push provider mới. Test dùng service/SMTP giả lập; không gửi thử email ngoài phạm vi task.

## Current override — asset-bound activation, 28 October 2026

User replaced the original consent/count-only Owner upgrade. New flow is Customer-layout /account/properties, per-property relationship selection, then source consent after OWNERSHIP choice. Consent/preview never promotes. A complete validated source property import grants OWNER atomically with Property/units/evidence; AUTHORIZATION/SUBLEASE grants it only on Admin approval as before. Existing Owners/data remain unchanged. Workspace is operational; shared /apartments/{id} provides exact-owner editing/private draft access. Read asset-management-and-lessor-activation-v2.md and asset-management-lessor-flow-2026-10-28 report; this override takes precedence over the historical steps above.
