# Kiểm tra luồng yêu cầu thuê tiếp và bàn giao

## Kết quả

Đã triển khai luồng đã chốt ngày 02/11/2026: nhắc trước hạn trong ứng dụng, exact Tenant yêu cầu thuê tiếp, Owner xử lý, chỉ yêu cầu được chấp nhận mới mở soạn hợp đồng mới. Bàn giao đến hạn bị chặn khi còn yêu cầu hoặc bản ký tiếp chưa xử lý. Không có auto-release, auto-reject hoặc auto-renewal. Xem [ADR](../decisions/tenant-renewal-requests-v1.md), [hướng dẫn](../guides/contract-renewal-handover.md), [OpenAPI](../api/contract-drafts.openapi.json).

V42 tạo request riêng và notices 20/10 ngày có unique key. API trả lifecycle.renewalRequest với version riêng và handoverAvailable do server tính. Yêu cầu/decision/cancellation đi qua service, khóa selection gốc và contract; không có Controller truy cập persistence trực tiếp. Chữ ký mới không sao chép từ hợp đồng cũ. Bản DRAFT đã đủ hai chữ ký có thể chờ đến kỳ mới; activation service/scheduler kiểm tra lại quyền, tài khoản, xung đột, hóa đơn nháp, chốt bản cũ rồi mới lấy ACTIVE slot cho bản mới. Baseline thiếu vẫn để thiếu.

History UX cho phép mở từ bảng và card, nhãn đã ký chỉ xem, hết ngày thuê không ghi sai Đang hiệu lực. Owner mở bản đã ký bằng saved-document endpoint thay vì phải xây context mới từ hồ sơ nguồn. Hồ sơ cũ thiếu document chỉ được hiển thị summary từ API tenancy đã kiểm tra quyền; unknown ID vẫn lỗi và lỗi 500 không bị che bởi fallback.

## Kiểm tra đã chạy

- Backend compile PASS (Java 21 / Spring Boot 4.1.1). Context7 Spring Framework v7.0.5 là tài liệu tương thích gần nhất đã dùng cho scheduling/transaction proxy; không tuyên bố pin đúng bản Framework của Boot 4.1.1.
- 41 SQL integration PASS, lần cuối 1m11s: 36 ContractDraftIntegrationTests và 5 NotificationIntegrationTests. Database clone `ancu_identity_verify_20261027213854`, test profile, seed/mail/AI scheduler tắt. Coverage: đúng Tenant/Owner, verification gate, thiếu version/stale version, gửi lặp, từ chối cần lý do, cancellation lịch sử, pending request/open successor chặn bàn giao, ký trước hạn không kết thúc kỳ cũ, due activation, chữ ký/snapshot cũ giữ, kỳ mới dùng chữ ký mới, notices 20/10 ngày không trùng và đúng người nhận. V42 khởi tạo lặp qua các lần chạy thành công. Đây không phải chạy đồng hồ scheduler qua nhiều ngày hoặc bài stress concurrency đa tiến trình.
- Frontend `npm run lint` PASS; 88 unit tests PASS qua Node native transform-types + shared alias loader, không sửa dependency. Ban đầu strip-only không hỗ trợ parameter property của ApiError; đổi test harness sang transform-types.
- 14 Playwright MCP callback PASS cho yêu cầu/accept/reject/no request trước-sau hạn/signed-waiting/stale tại 1440 và 390px. 10 callback history/legacy/unknown/500 PASS; 4 callback mở đúng contract từ request card PASS. 3 callback hồi quy wizard/bàn giao/Tenant confirmation PASS. Tổng 31 ca, API fixtures, không phải đăng nhập thật Hữu Hà. Có kiểm tra không tràn ngang, no pageerror/unexpected API trong các ca mới. Các phản hồi 404/409/500 được tiêm có chủ đích để kiểm tra lỗi. Test CLI worker bị `spawn EPERM` trong phiên trước; callbacks thực tế được chạy qua MCP với assertion harness tương đương, không tuyên bố CLI PASS.
- Lượt history đầu thiếu property/apartment trong fixture nên không có dữ liệu hiển thị; đã sửa fixture và chạy lại 10 ca PASS. Lượt handover hồi quy đầu input điện trống khiến native form không submit; kiểm tra lại input và toàn bộ 3 ca chạy lại PASS, không đổi policy để vượt kiểm tra.
- Đã xem ảnh panel Owner trên mobile `tmp/renewal-owner-mobile.png`: sau accept có Tạo hợp đồng ký tiếp, không có nút bàn giao. Desktop/mobile được kiểm tra thao tác và overflow.
- Default `npm run build` bị lỗi nạp/bundle Vite config trong môi trường. Cùng React/Tailwind plugins và alias, native config loader với config tạm trong ignored test-results build PASS 8.12s, 2451 modules; còn cảnh báo bundle >500kB có sẵn. Không thay config/dependency của project để né lỗi.
- JSON/schema refs và root OpenAPI copy đồng bộ; staged diff kiểm tra trước từng commit.

## Giới hạn và bàn giao

Chưa restart Backend đang do người dùng chạy, chưa áp V42 vào `proptech_db`, không sửa HD-4/HD-2/fixtures, không chạy yêu cầu hoặc bàn giao thật. Backend cần restart để nạp migration và endpoints; Frontend cần reload. Job mặc định bật ngoài profile test, có `app.contract-lifecycle.scheduler-enabled=false` để tắt nếu cần. Job tự động chỉ tạo notices và chuyển những successor đã ký đủ và đến hạn, không tự gia hạn hợp đồng không có chữ ký. Không có email/SMS/provider/signature-certificate/live Auth0 test trong task. Các dedicated test JVM đã kết thúc; không có test server giữ cổng.

Quy tắc bổ sung đang áp dụng rõ ràng: một yêu cầu mỗi hợp đồng, rejected/cancelled không có resubmit; ký đủ nhưng chưa đến kỳ không được hủy đơn phương. Không bổ sung termination sớm, thanh toán/hoàn cọc tự động, báo trước mang tính pháp lý, FIFO hoặc reset dữ liệu. RDS/diagrams giữ nguyên; các đoạn tài liệu 28/10 mô tả Owner tạo trực tiếp là lịch sử, bị ADR mới thay thế.
