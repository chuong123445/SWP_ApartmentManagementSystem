# Sửa lỗi lưu riêng giá điện/nước khi dữ liệu cũ chưa có giá

Ngày: 28/10/2026.

## Nguyên nhân

Biểu mẫu đã tách thành từng trường nhưng còn gửi đủ cả ba giá. Khi giá điện hoặc nước chưa được khai báo (null), Frontend gửi chuỗi rỗng ở trường còn lại và Backend từ chối vì DTO yêu cầu cả ba giá. Kiểm thử giao diện trước đó chỉ dùng dữ liệu đã có đủ giá nên chưa phát hiện trường hợp này.

## Đã sửa

- Frontend chỉ gửi `version` và giá đang được sửa.
- Hai endpoint PATCH giá (`/me/apartments/{id}/prices` và `/owner/apartments/{id}/prices`) cho phép gửi một hoặc nhiều giá. Backend giữ nguyên trường không gửi, kể cả null; không tự gán giá 0.
- Bắt buộc có version và ít nhất một giá. Từ chối null, chuỗi rỗng, giá âm, sai độ chính xác hoặc trường không được phép. Giá điện/nước bằng 0 vẫn hợp lệ.
- Giữ khóa theo căn hộ, kiểm tra chủ sở hữu/version, chỉ VACANT và không có yêu cầu thuê PENDING; không đổi giá đã chốt trong hợp đồng.
- Đồng bộ hai OpenAPI, thêm kiểm thử tích hợp và ca trình duyệt cho cả hai giá ban đầu đều null, lưu từng giá rồi tải lại.

## Kiểm chứng

- Backend: 15 kiểm thử API thực với Spring Security/JPA/SQL Server clone; không dùng database đang chạy của người dùng. Có kiểm tra khóa giá, tài khoản khác và version cũ.
- Frontend: TypeScript, 46 unit test và build thành công; cảnh báo Vite/bundle đã có từ trước.
- Playwright: 19 ca thành công (25,6 giây), desktop 1440px/mobile 390px, có ca ban đầu thiếu cả điện/nước, kiểm tra reload/console/network/không tràn ngang. Đã xem ảnh chụp mobile sau khi lưu.
- Playwright MCP mở được trang thật ở chế độ chưa đăng nhập: detail 200, refresh 401 đúng với khách; kiểm tra ghi dữ liệu dùng Edge CLI/API fixture.
- Browser dùng API fixture; Backend dùng database clone kiểm thử. Không ghi dữ liệu ứng dụng thật hoặc thay đổi Auth0.
- Context7 đã tra Jackson; không có gói tài liệu khớp chính xác phiên bản. Thực tế project dùng Jackson databind 3.1.5/annotations 2.21 (Boot 4.1.1), đã kiểm chứng annotation null-handling bằng kiểm thử API thực.

## Áp dụng

Khởi động lại Spring Boot để tải DTO/service mới, sau đó tải lại Frontend (khởi động lại Vite nếu còn cache). Không cần sửa database hay chạy migration.
