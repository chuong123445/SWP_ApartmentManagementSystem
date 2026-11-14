# Tiến độ L01–L02 ngày 09/11/2026

## Phạm vi hiện tại

Nhánh `feat/property-listing-wizard`. Người dùng yêu cầu tiếp tục L01–L02. Các thay đổi đang dở của nhóm nguồn, discovery và AI ảnh/mô tả được ghi nhận trong working tree để các unit sau tiếp tục.

## L01 — Hợp đồng dữ liệu và API

Đã có entity/repository bản nháp riêng tư, DTO khởi tạo, lưu và hoàn tất, controller và security matcher. OpenAPI tại `docs/api/property-listing-drafts.openapi.json` mô tả năm thao tác, validation, response no-store và các lỗi 400/401/403/404/409. ADR tại `docs/decisions/property-listing-wizard-v1.md`.

V62 tạo `property_listing_drafts` liên kết tài khoản/tài sản và thêm ảnh theo `rental_apartments`. Migration đã được đăng ký startup. Bản nháp khởi tạo tài sản DRAFT tối thiểu, chưa cấp vai trò Owner. Có tối đa 20 bản nháp chưa hoàn tất mỗi tài khoản. JSON lưu tối đa 150000 ký tự, bước 0–4 và tối đa 50 phòng. Đây là các giới hạn kỹ thuật được chọn khi triển khai, cần điều chỉnh nếu yêu cầu sản phẩm thay đổi.

Trạng thái L01 là đã triển khai hợp đồng, chờ nghiệm thu migration trên database test. OpenAPI đã kiểm tra đọc JSON và resolve các tham chiếu schema, chưa chạy trình kiểm định OpenAPI chuyên dụng.

## L02 — Lưu và tiếp tục bản nháp

- requestKey UUID giúp retry tạo trả lại cùng hồ sơ thuộc người dùng.
- API lấy một bản nháp và liệt kê bản nháp thuộc người đang đăng nhập.
- Lưu yêu cầu version, payload object, bước và số phòng hợp lệ.
- Hoàn tất kiểm tra version bản nháp, propertyVersion và loại quyền trước khi tạo phòng.
- Service dùng transaction và khóa tài sản qua PropertyApplicantAccess.write. Tạo phòng, gắn ảnh, chuyển bản nháp hoàn tất và submit hồ sơ cùng transaction.
- Retry hoàn tất trả lại view đã hoàn tất. Payload nháp được xóa sau hoàn tất.
- Luồng gửi dossier cũ từ chối bản nháp wizard chưa hoàn tất.
- Giao diện tiếp tục wizard đã nối trong commit c1838af. Bằng chứng trình duyệt ở checkpoint trước dùng API giả lập.

Phần bổ sung hiện tại sửa việc serialize payload null trước validation, từ chối bước không nguyên hoặc ngoài phạm vi, giới hạn số phòng và bỏ thao tác đánh dấu completed lặp.

Trạng thái L02 là đã triển khai và kiểm tra đơn vị, chờ nghiệm thu SQL về retry đồng thời và rollback. Chưa đánh dấu DONE.

## Kiểm tra thực tế

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| PropertyListingServiceTests | 11 ca thành công | tmp/listing-l01-l02-unit.log |
| PropertyDossierPaymentTests | 3 ca thành công | tmp/listing-l01-l02-unit.log |
| Backend compile và testCompile | Thành công cùng lần chạy 14 test | tmp/listing-l01-l02-unit.log |
| PropertyListingIntegrationTests | 2 ca lỗi khởi tạo context, chưa chạy được logic test | target/listing-l01-l02-integration.log |
| SQL Server test | Kết nối localhost1433 bị Permission denied getsockopt | Cùng log tích hợp |
| OpenAPI JSON/tham chiếu schema | Kiểm tra bằng script đọc JSON | tmp/listing-validate-openapi.py |

Lần tích hợp dùng database test `ancu_contract_pdf_20261103`, seed và mail tắt. Kết nối thất bại trước khi chạy script SQL. Chưa có bằng chứng áp dụng V62 hoặc thay đổi dữ liệu ứng dụng từ lần chạy này.

Các kết quả trước đó gồm 147 frontend test, TypeScript, build và Playwright 1440/390 chỉ áp dụng cho checkpoint wizard đã được chạy. Các thay đổi chưa commit về discovery, source và AI ảnh được tạo sau checkpoint đó cần kiểm tra riêng.

## Commit

- `8368594` lưu nháp hồ sơ và trích xuất thông tin giấy tờ.
- `c1838af` wizard giấy tờ trước, chọn phòng và lưu tiến trình.
- Commit bổ sung L01–L02 được ghi vào WORK_PROGRESS sau khi tạo.

## Tiếp tục từ đây

1. Kiểm tra Git status và giữ đúng các thay đổi đang dở của unit khác.
2. Chạy `PropertyListingIntegrationTests` trên database test có thể kết nối. Dùng file `tmp/run-listing-l01-l02.ps1` làm điểm tham chiếu cấu hình, giữ secrets ngoài log.
3. Kiểm tra V62 chạy hai lần, khóa/version giữa hai transaction và rollback khi gắn ảnh hoặc gửi dossier thất bại. Hai test API hiện có kiểm tra create/retry/save/read/private access/stale/validation, chưa thay thế các ca đồng thời và rollback cần bổ sung.
4. Rà cách resume được hiển thị ở cả cổng tài sản và danh sách hồ sơ. Backend hiện từ chối đường gửi cũ cho wizard chưa hoàn tất.
5. Chỉ chuyển L01–L02 sang DONE khi các kiểm tra database phù hợp có kết quả.

Các phần source import, discovery nhóm tài sản và AI ảnh/mô tả đang dở thuộc L06–L08. Chưa có kết quả nghiệm thu cho toàn bộ working tree.
