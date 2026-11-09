# Tiến độ thực hiện kế hoạch đăng tải căn hộ

## Phần đã triển khai

| Unit | Code hiện tại | Nghiệm thu còn lại |
|---|---|---|
| L01 | DTO/API/OpenAPI, V62, quyền và phiên bản | Migration SQL chạy hai lần |
| L02 | Draft riêng tư, resume, retry, typed completion, chống đường gửi cũ | Đồng thời và rollback qua database |
| L03 | Trích xuất có tệp/trang, chọn giá trị, cảnh báo khác nhau, đối chiếu dữ liệu wizard hiện tại qua sourceHash | Gemini thật và hồ sơ demo thực tế |
| L04 | Wizard năm bước cho chính chủ thủ công/ủy quyền/thuê lại, lưu tiến trình, phòng chọn, thu gọn | Chạy cùng backend/database thật |
| L05 | Ảnh chung/riêng, sửa từng nhóm, version, thumbnail và quyền đọc ảnh | Kiểm tra repository/download qua SQL |
| L06 | Chọn phòng nguồn, ảnh riêng khi import/bổ sung, meter để null khi thiếu | Auth0 thật với dữ liệu nguồn local được cấu hình |
| L07 | Backend nhóm trước phân trang, count/min/max cùng predicate, frontend chọn phòng theo bộ lọc | Query SQL thực tế, tải lớn và snapshot đồng thời |
| L08 | DEFERRED theo yêu cầu chỉ làm đến L07, bản nháp cất ở tmp/listing-l08-deferred | Chờ yêu cầu mới |
| Kiểm thử hỗ trợ L01–L07 | Unit test, ca browser, hướng dẫn ba bộ demo và tiến độ | Nghiệm thu SQL/provider còn chờ |

Các unit đang ở mức triển khai và kiểm tra được trong phạm vi môi trường. Kế hoạch tổng thể vẫn IN_PROGRESS vì các kiểm tra tích hợp chưa hoàn tất.

## Quyết định thực hiện

- JSON bản nháp giữ ở server, mỗi tài khoản có tối đa20 bản nháp chưa hoàn tất, tối đa50 phòng và150000 ký tự.
- Ảnh dùng lại kho property_images với apartment_id tùy chọn. Ảnh cũ là ảnh chung.
- Giới hạn staging ảnh tăng lên300 để hỗ trợ50 phòng với tối đa4 ảnh mỗi nhóm và thao tác thay ảnh.
- Danh sách phòng công khai mở ba phòng mỗi trang. Nhóm tài sản phân trang theo ID tăng dần.
- Phạm vi hiện tại kết thúc ở L07. Bản nháp AI ảnh/mô tả thuộc L08 được cất riêng ngoài source ứng dụng.
- Baseline công tơ giữ null khi chưa cung cấp. Các luồng hợp đồng/hóa đơn cần tiếp tục áp dụng kiểm tra của hệ thống.

## Kết quả kiểm tra

- 19 backend unit trong phạm vi L01–L07 được chạy lại sau khi cất L08. Lần kiểm tra 22 ca trước đó có 3 ca thuộc L08 và chỉ là bằng chứng lịch sử. Log cuối tại `tmp/listing-l07-backend-final.log`.
- 147 frontend test thành công, TypeScript và Vite build thành công. Vite còn cảnh báo kích thước chunk. Log tại `tmp/listing-current-fe.log`, `tmp/listing-current-tsc.log`, `tmp/listing-full-build.log`.
- Playwright MCP đã chạy wizard ở1440/390 với API fixture, gồm AI503 rồi thử lại, chọn gợi ý, lưu rồi tải lại, một phòng được chọn trong hai, ảnh riêng và đối chiếu địa chỉ hiện tại.
- Playwright MCP đã chạy source/discovery/gallery ở1440/390 với API fixture, gồm một trong10 phòng, ảnh từng phòng, một thẻ tài sản, danh sách3phòng và bộ lọc chung, chỉnh ảnh riêng dùng apartmentVersion.
- Ảnh screenshot đã được mở xem. Trong fixture, ảnh phòng là PNG1pixel và một số static asset được thay bằng route giả lập, nên ảnh minh họa này chỉ phục vụ kiểm tra luồng/bố cục.
- SQL integration chạy lại ba ca, lỗi khởi tạo context tại kết nối localhost1433 với Permission denied getsockopt. Chưa chạy được logic kiểm thử database.
- OpenAPI được đọc JSON và kiểm tra tham chiếu schema bằng script. Chưa có kết quả từ bộ kiểm định OpenAPI chuyên dụng.

## Module thay đổi chính

Backend có private listing drafts, metadata đối chiếu trong OwnerPrecheck, UnitGallery/AssetManagement, Vneid import/append image mapping, ApartmentGroupRepository và ApartmentService. V62 thêm index ảnh theo căn.

Frontend có PropertyListingWizard/OwnerPrecheckPanel, editor ảnh chung/riêng, VneidAssetImportForm, PropertyListingCard/usePropertyGroups, HomePage và dịch vụ/kiểu dữ liệu liên quan. Ca Playwright nằm trong `e2e/property-listing-wizard.spec.js`.

## Tiếp tục nghiệm thu

1. Dùng database test có thể kết nối để chạy V62 hai lần và PropertyListingIntegrationTests.
2. Bổ sung/chạy tình huống hai transaction lưu/hoàn tất cùng version và rollback khi bind ảnh/submit dossier lỗi.
3. Chạy hồi quy đầy đủ property/source/discovery/contract/billing trên database test.
4. Chạy luồng với backend và tài khoản thật trong môi trường local, sau đó thử Gemini thật với ba bộ demo.
5. Kiểm tra hết hạn quyền cho thuê, dữ liệu cũ và gallery cũ trong lần chạy tích hợp.
6. Cập nhật trạng thái DONE sau khi có kết quả, giữ các bằng chứng môi trường đã dùng.

Các commit hoàn chỉnh của công việc được ghi ở WORK_PROGRESS. Ba file VNeID diagnostics có sẵn được giữ ngoài commit unit này. Chưa push hoặc tạo PR trong phiên.
