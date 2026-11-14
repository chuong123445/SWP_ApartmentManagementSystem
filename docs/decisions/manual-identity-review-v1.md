# Hồ sơ căn cước nhập tay và Admin duyệt

Ngày14/11/2026, người dùng yêu cầu thêm lựa chọn nhập tay và tab Admin duyệt, giữ Auth0. Quyết định này mở rộng quy tắc14/10 vốn chỉ thu thập tự khai, chưa cho Admin xem.

Người dùng lưu tên pháp lý, CCCD12số, ngày sinh/cấp, nơi cấp, địa chỉ thường trú/hiện tại và hai ảnh JPEG/PNG. API lưu tự khai cũ vẫn không xác thực. Gửi riêng với profileVersion và consent:true tạo snapshot JSON + bản sao ảnh riêng không cập nhật, trạng thái PENDING. Một pending/account bằng filtered unique index và account lock. Chỉ ACTIVE ADMIN được đọc hồ sơ/ảnh đã gửi và duyệt/từ chối; không mở API đọc bản tự khai của tài khoản khác. Admin không tự gửi/tự duyệt. Từ chối bắt buộc lý do; gửi lại tạo bản mới, giữ bản cũ. Trạng thái/phiên bản được khóa và kiểm tra trên server.

Duyệt tạo bằng chứng VERIFIED nguồn ADMIN_REVIEW, issuer urn:ancu:admin-review, subject=accountId, dùng policy chung. Giới tính không thu thập được hiển thị Không khai báo. Giữ display name, emailVerified/phoneVerified, mật khẩu, vai trò, tài sản và hợp đồng. Chỉ PENDING_VERIFICATION chuyển ACTIVE; LOCKED/INACTIVE không được duyệt để mở khóa. Không ghi đè căn cước đã xác thực, không trùng CCCD đã gắn tài khoản khác. Không phê duyệt tài sản hay tự cấp OWNER. Đây là xét duyệt thủ công, không tuyên bố kết nối CSDL dân cư/eKYC.

V67 tạo submissions/images và mở nguồn ràng buộc. V55 cũng phải giữ nguồn này vì initializer hiện replay toàn bộ script mỗi lần khởi động. Tệp ảnh private không cache, chỉ tải authenticated blob và thu hồi URL. Mẫu localFixture phải thay hai ảnh trước khi gửi, không tự xác thực/reset fixture.

API: GET/POST /api/v1/me/identity-submissions; GET /api/v1/admin/identity-submissions?status=PENDING&page=0; GET /api/v1/admin/identity-submissions/{id}; POST /api/v1/admin/identity-submissions/{id}/decision; GET /api/v1/admin/identity-submissions/{id}/documents/{front|back}. Submit: profileVersion,consent. Decision: version,action APPROVE|REJECT,reason. List phân trang10, sắp xếp submittedAt/id. Các phản hồi dữ liệu/ảnh no-store.

UI: /account/settings/identity; liên kết ở /account/verification; Admin /admin/property-dossiers?tab=identity. Chính chủ đã duyệt thủ công mặc định tới wizard hồ sơ thủ công, giữ lựa chọn Auth0 cho nguồn cũ.

Kiểm tra:15 backend (12SQL IdentityProfileIntegrationTests +3VerifiedIdentityPolicyTests) PASS trên ancu_listing_ai_20261113, gồm snapshot/ảnh bất biến, phân quyền, duyệt/từ chối/gửi lại, pending trùng, source binding, trùng CCCD và không mở khóa.2Playwright MCP1440/390 full fixture flows gửi→Admin từ chối→gửi lại→duyệt PASS, không lỗi bất ngờ/tràn ngang. TypeScript PASS. Chưa thao tác trên DBứngdụng hoặc xác minh bằng giấy tờ thật. Các ảnh kiểm thử chỉ là ảnh raster nhỏ nhân tạo, không dùng làm kết quả xét duyệt thật.
