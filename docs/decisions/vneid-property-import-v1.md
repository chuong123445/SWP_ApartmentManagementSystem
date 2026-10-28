# Chọn tài sản VNeID và cho thuê — 27/10/2026

User cho phép tài sản lấy từ Auth0 mô phỏng bỏ Admin review sau khi hoàn thiện thông tin cho thuê. Override này chỉ cho tài sản chính chủ OWNERSHIP/SOLE_OWNER hợp lệ trong app_metadata.vneid.assets của issuer/subject đã liên kết VERIFIED; không áp dụng property thủ công hoặc chỉ upload CCCD.

Owner mở Thêm tài sản → Chọn tài sản từ VNeID, chọn nguồn, điền địa phương phục vụ filter (nguồn hiện chỉ có address dạng chuỗi), giá thuê/cọc/đơn giá điện-nước, chỉ số công tơ, tầng/sức chứa cho từng unit. Giá/cọc/đơn giá là decimal, không mặc định chỉ số bằng0; người dùng có thể nhập0 rõ ràng cho giá dịch vụ miễn phí. Bấm Thêm và cho thuê là xác nhận công khai toàn bộ unit nguồn đã điền; chưa có import từng phần.

Backend GET nguồn private no-store; POST nhận ID/hash và operational terms, không nhận chủ sở hữu/verified/approval/name/address/area/unit-code. Đọc lại nguồn ngoài khóa SQL, đối chiếu SHA256 snapshot; transaction khóa account/recheck session/link và complete exact unit set. Property APPROVED cùng Apartment PUBLISHED/VACANT + V15 audit/rates; không tạo Admin decision giả. V15 unique issuer+external_asset_id bảo vệ nhập lại kể cả caller khác; DB conflict409. Không sửa approval của property cũ. Chặn thêm unit thủ công vào property nguồn để tránh dùng approval của nguồn cho căn không có trong nguồn.

V15 property_external_imports giữ private source snapshot (kể cả certificate nguồn), source/subject/time/hash và property FK. Không đưa audit/certificate/subject vào public discovery. Backend giữ M2M/token/secret riêng; không tìm theo email trong luồng production. Diagnostic read schema dùng email user chỉ định chỉ phục vụ kiểm tra cấu trúc, không quyết định ownership.

API owner trả verificationSource để UI gắn Đã xác thực qua VNeID và bỏ đường dẫn hồ sơ Admin; rates hiển thị Owner detail/public detail. Discovery/address options chấp nhận persisted VNeID evidence bên cạnh gate contact cũ. Giá dịch vụ listing không tự sửa giá hợp đồng đã ký/hóa đơn; các hợp đồng vẫn theo điều khoản được xác nhận của workflow riêng.

Không thể coi app_metadata là chứng thực pháp lý nhà nước: đó là dữ liệu mô phỏng do quản trị Auth0 quản lý. Chưa triển khai thu hồi quyền khi nguồn thay đổi sau import, đổi chủ, import lại/cập nhật tài sản đã nhập hoặc tự sửa snapshot hợp đồng. Không giả lập bank/OTP/SMS.

## Đề xuất ủy quyền/thuê lại — đánh giá, chưa triển khai

User đưa proposal phân nhánh chính chủ/được ủy quyền/thuê lại và yêu cầu đánh giá khả thi. Đây là quyền đối với từng tài sản, không phải role tài khoản mới. Có thể tái sử dụng private dossier/Admin review hiện có (RightType hiện OWNERSHIP/AUTHORIZATION), cần thêm SUBLEASE và file purpose/phân loại chứng từ bắt buộc, thông tin principal/thời hạn/quyền cho thuê, public label theo tài sản nhưng giữ file riêng tư.

Blocker nghiệp vụ hiện tại: nâng cấp Owner đòi ít nhất một tài sản Auth0 chính chủ, nên user chỉ có ủy quyền/thuê lại chưa vào được Owner dossier. Cần thêm Self onboarding cho Customer đủ điều kiện nộp hồ sơ; khi Admin duyệt quyền đầu tiên mới cấp chức năng quản lý Owner cùng quyền đúng property. Không bỏ gate hiện tại cho mọi user hoặc auto-promote bằng client role. SMS OTP chưa có provider, không được gọi phone verified từ UI. Chưa quyết định/triển khai expiry/revocation hoặc diễn giải mọi trường hợp phải công chứng; đó cần quy tắc riêng trước khi code.

Luồng source import hoàn tất vẫn giữ theo yêu cầu đã giao; nhánh agent/sublease mới là đánh giá, chưa được thêm vào API/role/schema bằng task này.
