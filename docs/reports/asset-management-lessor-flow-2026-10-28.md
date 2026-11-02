# Tổng kết: Quản lý tài sản và luồng trở thành chủ cho thuê

**Ngày:** 28/10/2026. Baseline `chuong/51c2230`, working tree sạch trước thực hiện. Phạm vi do người dùng xác nhận: tách tài sản khỏi khu vận hành; dùng layout Customer; chọn quan hệ từng tài sản; cấp Owner khi có tài sản đầu tiên hợp lệ.

## 1. Giao diện và điều hướng đã thay

- Thêm trang **Quản lý tài sản** `/account/properties`: Customer header, tiêu đề/giới thiệu, CTA thêm tài sản và danh sách tài sản kèm các căn/phòng. Hỗ trợ danh sách rỗng/loading/lỗi/tải lại; đọc dữ liệu thật qua API self.
- Header có **Đăng cho thuê**; menu tài khoản có **Quản lý tài sản** cho Customer/Owner, và **Quản lý cho thuê** cho Owner. Admin không có CTA đăng tài sản; route có guard phù hợp.
- Mỗi lần thêm tài sản hiện ba lựa chọn Chính chủ/Được ủy quyền/Thuê lại. Các form tạo và trang hồ sơ dùng shell Customer, không còn các tab hồ sơ cá nhân/cài đặt chen vào luồng tạo tài sản.
- URL nâng cấp cũ redirect về ba lựa chọn; bỏ form “đọc tài sản rồi nâng Owner” dư thừa và bỏ client helper nâng role cũ.
- Sidebar vận hành bỏ tab tài sản/căn hộ/cài đặt đơn giá. Liên kết quản lý tài sản đi ra trang riêng. Các callback xem căn hộ của dashboard chuyển tới trang chi tiết chung; các đường modal tài sản cũ không còn render trong WorkspaceModals.

## 2. Chi tiết và chỉnh sửa tài sản

- Dùng `/apartments/{id}` chung với Customer; bỏ đường mở chi tiết RoomDetailModal chứa nội dung frontend/CTA Escrow mẫu.
- Đúng chủ tài sản thấy trạng thái hồ sơ/công khai và công cụ sửa; người khác không có management capabilities hoặc nút sửa. Chủ xem được bản nháp của mình; người khác/guest nhận404.
- Sửa tiêu đề, mô tả, số người tối đa, tiện ích với optimistic version. Địa chỉ/diện tích/thông tin pháp lý không được nhận trong request cập nhật giới thiệu.
- Đổi giá thuê, điện và nước chỉ khi VACANT và không có yêu cầu PENDING, giữ row lock và điều kiện Backend trước đó. Giao diện hiển thị lý do khóa; Backend tiếp tục chặn request giả mạo/stale.
- Giữ/bỏ/đổi thứ tự ảnh đã lưu, thêm ảnh mới; tổng1–4ảnh. Gallery hiện dùng chung cho các căn trong cùng Property và giao diện nói rõ điều này. Không lấy ảnh của tài khoản/tài sản khác; ảnh riêng đọc bằng Bearer. Thay gallery tăng version Property trong cùng transaction.
- Công khai/ẩn tin từ trang chi tiết theo trạng thái tài sản/quyền. Tài sản thủ công cần Admin duyệt và công khai riêng; tin hết quyền vẫn có thể ẩn nhưng không thể công khai lại.

## 3. Điểm nâng quyền Owner đã sửa

| Tình huống | Kết quả |
|---|---|
| Customer bấm đăng cho thuê/chọn một trong ba hình thức | Vẫn CUSTOMER. |
| Chọn Chính chủ rồi đồng ý đọc nguồn | Ghi consent; vẫn CUSTOMER; chỉ lúc này mới gọi nguồn để preview. |
| Chọn tài sản nhưng chưa lưu, thiếu thông tin/ảnh hoặc nguồn lỗi/stale | Vẫn CUSTOMER; không tạo tài sản hợp lệ giả. |
| Tạo thành công tài sản nguồn hợp lệ, đủ thông tin/ảnh | Property APPROVED + units PUBLISHED + source snapshot + OWNER được ghi nguyên tử. |
| Tạo/nộp hồ sơ ủy quyền hoặc thuê lại | Vẫn CUSTOMER trong thời gian chờ duyệt. |
| Admin duyệt tài sản thủ công đầu tiên | Mở OWNER theo service review đã có; các căn vẫn cần được công khai. |
| Owner thêm tài sản thuộc hình thức khác | Vẫn chọn quan hệ theo tài sản; quyền của tài sản mới xét riêng, không tự duyệt. |

Giữ Owner hiện có, không tự hạ role hoặc thay dữ liệu lịch sử. Owner tiếp tục dùng chức năng thuê nhà. Một người có thể đồng thời có tài sản OWNERSHIP/AUTHORIZATION/SUBLEASE.

## 4. Backend và database

| Thành phần | Chức năng |
|---|---|
| PropertySourceConsentService / V22 | Lưu chấp thuận đọc dữ liệu theo account + exact linked issuer/subject; có CSRF/version. Không cấp Owner bằng consent. |
| VneidPropertyImportService | Cho verified Customer chọn nguồn; kiểm tra lại binding/nguồn, lưu mọi thành phần thành công rồi mới đổi role trong transaction. Tài sản nguồn không tạo hồ sơ Admin giả. |
| AssetManagementAccess/Service/Controller | API self đọc nhóm tài sản; sửa thông tin và gallery đúng chủ; không mở Owner operational API cho Customer đang chờ. |
| ApartmentService/ApartmentDetail | Trả nội dung công khai hoặc bản nháp của chính mình; management metadata chỉ cho đúng chủ, Cache-Control no-store. |
| PropertyImageService / PropertyRepository | Retain/rebind/delete đúng gallery; tăng version cha ngay để chặn hai người ghi đè ảnh cùng version. |

**Migration V22** chỉ thêm `property_source_consents`; dùng khóa account BIGINT chung, không thêm UUID. Không xóa hoặc tạo lại database; không thay tài khoản/provider/mật khẩu/snapshot hợp đồng cũ. Migrations trong phiên chỉ chạy trên SQL clone, live áp dụng khi restart Backend.

OpenAPI mới: `docs/api/asset-management.openapi.json`; owner-upgrade và source-import được cập nhật để tránh mô tả luồng cũ như hành vi hiện tại. RDS/diagrams giữ nguyên.

## 5. Kiểm tra thực chạy

- **244 toàn bộ Backend tests PASS**,0failure/error/skip,2m42s, SQL clone `ancu_identity_verify_20261027213854`; log ignored `ancu-proptech-backend/target/asset-portal-full-tests.log`. Seed/mail/scheduler tắt, fixtures riêng có rollback/cleanup; không ghi dữ liệu nghiệp vụ live.
- Trước đó79targeted PASS và15source-import PASS. Bao phủ preview/consent không nâng role; import thiếu dữ liệu không nâng role; import thành công nâng Owner; Admin approval; cross-account; private draft; cập nhật metadata; gallery/version; chặn giá khi đang thuê/PENDING; Customer rental/rights expiry.
- **46 frontend unit tests PASS**, TypeScript và production build PASS. Unit consent cũ được đổi thành kiểm tra consent không trả role. Vite vẫn có cảnh báo bundle lớn/native config từ trước.
- **38 tình huống Playwright khác nhau đạt qua các đợt chạy**:10tài sản mới +8Customer +7Auth0SDK +6external account security +6rights UI +1contract source. Đợt rộng37case có36PASS,1fixture thiếu GET lịch sử thuê; đã bổ sung đúng endpoint và chạy lại15case PASS17.2s. Đợt tài sản cuối10case có thêm hide-expired, PASS13.1s (`asset-portal-final-10-tests.log`). Sau dọn đường modal cũ/CSS có3layout cases PASS6.4s.
- Desktop1440/mobile390, thao tác đọc/sửa/lưu/reload, không tràn ngang; screenshots `test-results/visual/asset-portal-390.png`, `asset-detail-owner-390.png`. Ảnh test nhỏ, không phải ảnh căn hộ thật. Kiểm tra console/network theo fixture, chỉ lỗi503 được cố ý mô phỏng được chấp nhận. Playwright MCP cũng truy cập được trang; kiểm thử tương tác chính dùng CLI Edge cùng MCP/toolchain có sẵn.
- Browser dùng API/provider fixture; Backend dùng SQL thật trên clone, nguồn Auth0 được mock. **Chưa xác minh thao tác bằng tenant Auth0/M2M thật hoặc hộp thư SMTP trong phiên này**; không coi mock là tích hợp live. Không gửi email, đổi mật khẩu provider hoặc gọi thanh toán.
- Sửa trong quá trình kiểm tra: dùng bump version cha ngay sau thay gallery; nhãn mô tả tách label/textarea để truy cập đúng; bỏ useEffect phụ thuộc hàm reloadUser không ổn định để tránh vòng gọi API; CSS riêng tránh shorthand home-wrap xóa padding dọc. Test khóa Owner sau import phải đọc lại entity managed do source service clear persistence context, không sửa production gate để chiều fixture.

## Commit

- `b9e08ff` — Backend: kho tài sản self, chỉnh sửa/gallery, consent riêng và cấp Owner theo tài sản hợp lệ.
- `10dad87` — Frontend: Customer-layout assets, chi tiết chung có chỉnh sửa, tách khu vận hành và luồng thêm tài sản.
- Commit tài liệu cuối ghi tại WORK_PROGRESS; chỉ commit local, chưa push.

## 6. Áp dụng

1. Restart Backend để nạp code và migration V22.
2. Restart/reload Vite, đăng nhập lại hoặc tải lại tài khoản để nhận role hiện tại.
3. Vào **Đăng cho thuê** hoặc **Quản lý tài sản**. Chọn hình thức, hoàn tất tài sản đầu tiên; không cần thao tác nâng Owner riêng.
4. Xem căn hộ từ danh sách tài sản để sửa thông tin/ảnh/giá. Vào **Quản lý cho thuê** khi cần xử lý yêu cầu, hợp đồng và hóa đơn.

Không reset database hoặc fixtures. Các test/modal cũ dựa vào `nav-rooms` hoặc consent→Owner trước khi có tài sản không còn là hành vi hợp lệ; không tuyên bố đã chạy toàn bộ bộ E2E lịch sử. Các prototype vận hành, ký số/activation/payment và gap khác của audit không thuộc thay đổi này.
