# Owner: tách yêu cầu thuê mới và thuê tiếp

## Thay đổi

Trang Yêu cầu thuê có hai tab **Thuê mới / Thuê tiếp**, mặc định lọc **Chờ xử lý**. Trạng thái hiển thị gồm Chờ xử lý, Đang làm hợp đồng, Đã ký hợp đồng, Đã từ chối, Đã hủy; Tất cả được đưa cuối danh sách, không phải mặc định. Backend vẫn giữ `ACCEPTED` như quyết định chấp thuận; không đổi enum hoặc lịch sử. Yêu cầu chưa đủ hai chữ ký hiển thị Đang làm hợp đồng, chỉ đủ cả hai mới hiện Đã ký hợp đồng. Không tự ký hoặc kích hoạt thuê sau khi Owner đồng ý.

GET `/api/v1/owner/renewal-requests` mới trả trang yêu cầu thuê tiếp theo exact Owner, tài sản và trạng thái, gồm hợp đồng gốc, khách, version yêu cầu và liên kết bản ký tiếp gần nhất. Controller gọi service; repository lọc/count trước phân trang. Tab Thuê tiếp xử lý đồng ý/từ chối trực tiếp, bắt buộc lý do khi từ chối, gửi đúng version yêu cầu, có trạng thái bận/lỗi cũ và làm mới. Đã đồng ý mới được mở wizard soạn kỳ mới hoặc mở bản đã tồn tại. Trước khi có bản nháp, lệnh hủy chấp nhận hiện có vẫn dùng version/consent và giữ lịch sử.

GET ordinary Owner inbox thêm `contractCompleted` chỉ dùng với `status=ACCEPTED`: false là đang chuẩn bị/chưa ký đủ, true là đã ký đủ. Cả items và count dùng cùng predicate, không lọc sau khi nhận một trang. Bản ghi selection tạo nội bộ trong renewal authoring bị loại khỏi Thuê mới, tránh hiển thị lẫn/đếm hai luồng. API bỏ trống status vẫn trả mọi trạng thái để tương thích; UI mới chủ động gửi PENDING.

Thông báo Owner về yêu cầu thuê tiếp mở `/app?tab=rental_requests&requestType=renewal&propertyId=...`. Chuyển tab giữ tài sản đang chọn và đúng trang Yêu cầu thuê, không để query cũ đưa người dùng trở lại trang khác. Có tab keyboard Arrow/Home/End và label/filter gắn id rõ ràng. Chỉ tab đang mở mới tải/poll inbox; đổi tab hoặc tài sản bắt đầu lại PENDING/page0. Customer vẫn gửi yêu cầu từ hợp đồng như đã chốt; không đổi layout các trang Customer trong task này.

## Kiểm tra thực tế

- 66 backend SQL-clone integration PASS, 1m42s: 38 ContractDraftIntegrationTests và 28 DiscoveryRentalIntegrationTests. Test mới kiểm tra exact Owner/Customer/guest, property scope, enum/page không hợp lệ, status/count/page trước phân trang, signed/unsigned filter, hai chữ ký thật trên record và không lẫn selection ký tiếp vào ordinary inbox. Transaction acceptance và trạng thái Apartment hiện có vẫn qua hồi quy.
- Sau đổi link thông báo: 6 test bị ảnh hưởng PASS, 47.6s (1 inbox +5 NotificationIntegrationTests), gồm đúng URL tab/tài sản và quyền Owner. Không cộng trùng thành 72 test độc lập.
- SQL clone `ancu_identity_verify_20261027213854`, profile test, seed/mail/AI jobs tắt. Không chạy lệnh quyết định hay reset dữ liệu trên proptech_db. Không có migration mới cho task này; V42 từ task trước là prerequisite.
- Frontend TypeScript PASS; toàn bộ 90 unit tests PASS qua Node transform-types/shared alias loader. Test mới kiểm tra false/true không bị bỏ khỏi query, filter ALL xóa stage, scope/page/status renewal không có ownerId từ client.
- 12 callback Playwright MCP PASS tại 1440/390: mặc định PENDING, lọc contracting/signed, tab thuê tiếp/deep link, đồng ý ngay trên danh sách, từ chối bắt buộc lý do, stale409 giữ thông báo lỗi, mở wizard trực tiếp, lịch sử successor link, keyboard, đổi tài sản và không tràn ngang. Callback chạy từ spec qua MCP với polling/assertion harness; không tuyên bố CLI worker PASS (môi trường trước đó chặn spawn EPERM). API fixtures; không đăng nhập thật Hữu Hà/Owner để quyết định dữ liệu.
- Lượt đầu test label exact không tìm được vì label chứa cả options; đã tách label/select và chạy lại. Mobile test chọn tài sản ban đầu chưa mở menu responsive; bổ sung thao tác mở menu theo UI, cả 12 ca sau đó PASS. Không bỏ kiểm tra để vượt lỗi.
- Visual QA mobile bắt được class bg-white của nút phụ xung đột với nền nút chính, làm chữ trắng khó thấy. Đã tách style chính/phụ, chạy lại 12 ca PASS, xem ảnh `tmp/owner-request-inbox-mobile-final.png`: nút Làm mới/Soạn hiển thị nền xanh chữ trắng. Kiểm tra modal từ chối có nền rose/chữ trắng. Console happy path cuối 0 errors; stale409 là phản hồi thử lỗi có chủ đích. Browser mocks được gỡ sau test và về about:blank.
- Trong khoảng sau khi gỡ mock và trước cleanup cuối, poller của trang test dùng token fixture gọi backend thật bị 401 rồi chuyển login; đã đưa tab test về about:blank. Không dùng hoặc đăng xuất session của người dùng; không tính các 401 cleanup này là bằng chứng kiểm thử authenticated live.
- Native-config Vite build PASS (cùng React/Tailwind plugins/alias, config tạm ignored test-results, không sửa config/dependency project); còn cảnh báo bundle lớn >500kB có sẵn. Default config bundler/CLI worker giới hạn môi trường vẫn như task trước.
- Context7 Spring Data JPA 4.1.0 đối chiếu Page/countQuery/named params với Boot4.1.1; exact 4.1.1 không có trong catalog. React Router thực tế 8.4.0, tài liệu hiện hành useSearchParams qua Context7 không pin 8.4.0. OpenAPI contract/discovery và root copies được đồng bộ/kiểm tra schema refs.

## Bàn giao

Restart Backend để nạp GET renewal inbox, filter mới và link thông báo, sau đó reload Frontend. Không restart server người dùng trong task; dedicated test JVM đã kết thúc. Không có appDB/schema/fixture/credential/provider/AI sửa đổi hoặc tự push. Backend contract/request trạng thái cũ và các HD-4/5/6/7 vẫn giữ nguyên. RDS/diagrams không đổi.
