# Đăng ký thông thường và nâng cấp chủ cho thuê

Quyết định được user xác nhận ngày 27/10/2026: mọi đăng ký mới là CUSTOMER; không chọn role. Khi có nhu cầu cho thuê, user chủ động đồng ý đọc tài sản Auth0 và nâng cấp. Sau nâng cấp vẫn dùng chức năng thuê nhà, yêu cầu, hợp đồng và hóa đơn của chính mình.

Backend chỉ cho ACTIVE CUSTOMER có liên kết VNeID VERIFIED nâng cấp. Management API đọc app_metadata của đúng issuer/subject đã lưu; M2M read:users ở Backend, không dùng secret trong React. Client chỉ gửi consent và version; không gửi role, verified hoặc danh sách tài sản. Nguồn thiếu cấu hình/lỗi, không có tài sản hợp lệ, version hoặc liên kết thay đổi đều không được cấp Owner.

Adapter hiện hỗ trợ sở hữu riêng OWNERSHIP/SOLE_OWNER, certificate.number, tài sản SINGLE_UNIT/MULTI_UNIT và ít nhất một unit hợp lệ; xem setup để biết schema. Đây là dữ liệu mô phỏng do quản trị Auth0 nhập, không phải nguồn nhà nước. Không tự mở rộng sang đồng sở hữu/ủy quyền khi chưa có quy tắc.

GET /api/v1/me/owner-upgrade trả context tự thân; POST cùng đường dẫn yêu cầu Bearer và CSRF. Đọc provider bên ngoài transaction; trước ghi recheck phiên, trạng thái, version và liên kết dưới khóa account. V14 auth_owner_upgrades lưu thời điểm đồng ý/kiểm tra, phiên bản đồng ý, nguồn, số tài sản hợp lệ. Đổi role và audit cùng transaction. Existing OWNER gọi lại không tạo audit hoặc đọc provider lại.

OWNER được dùng Self rental APIs với ràng buộc exact-party hiện có, không được thuê căn hộ của chính mình. Rental verification vẫn yêu cầu email hoặc VNeID VERIFIED; phone-only không trở thành đường vòng qua điều kiện này. Không thêm role TENANT hoặc thay đổi các Owner/Admin hiện có.

Chưa nhập dữ liệu tài sản thành Property/Apartment. Nâng cấp không approve hay public bất kỳ tài sản nào; workflow hồ sơ hiện có vẫn áp dụng. Không reset fixtures, tài khoản hoặc các snapshot hợp đồng cũ. Quy tắc thu hồi Owner khi tài sản nguồn thay đổi nằm ngoài phạm vi này.

Settings hiển thị riêng Email và CCCD/VNeID; trạng thái và căn cước từ evidence Backend, không suy ra từ email hoặc ảnh tự khai. Account đã xác thực không còn nút xác thực lại.

Live Management API chưa nghiệm thu: user có M2M và sẽ điền credentials local. Kiểm thử adapter dùng HTTP kiểm soát; không tuyên bố đã đọc thành công tài sản owner02.

## Current override — asset-bound activation, 28 October 2026

User replaced the original consent/count-only Owner upgrade. New flow is Customer-layout /account/properties, per-property relationship selection, then source consent after OWNERSHIP choice. Consent/preview never promotes. A complete validated source property import grants OWNER atomically with Property/units/evidence; AUTHORIZATION/SUBLEASE grants it only on Admin approval as before. Existing Owners/data remain unchanged. Workspace is operational; shared /apartments/{id} provides exact-owner editing/private draft access. Read asset-management-and-lessor-activation-v2.md and asset-management-lessor-flow-2026-10-28 report; this override takes precedence over the historical steps above.
