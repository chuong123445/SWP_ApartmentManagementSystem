# Tra cứu quan hệ thuê và thanh toán bằng View

## Cài đặt cho cả nhóm

Yêu cầu SQL Server2016SP1 trở lên, database đã nâng cấp đến V42, và DB principal có quyền ALTER bảng rental_contracts, CREATE VIEW/ALTER schema dbo. Đã chạy thực tế trên SQL Server17.0.1000.7. Không cấp quyền đọc các View cho public; có tên người và lịch sử thuê.

**Cách1 — chạy Backend:** pull nhánh/PR này và các PR nền, cấu hình database hiện có rồi khởi động Backend theo README. `spring.sql.init.schema-locations` chạy V43 rồi V44 sau V42, trước JPA. V43 thêm `activated_at datetime2(6) NULL`; V44 dùng `CREATE OR ALTER VIEW` nên có thể chạy lại. Không tạo tài khoản/fixture hay xóa bảng trong hai migration này. Các initializer khác của ứng dụng vẫn chịu cấu hình seed riêng; không bật seed để cài View.

**Cách2 — script riêng, không cần khởi động ứng dụng:** mở PowerShell ở thư mục backend, dùng credentials SQL của môi trường qua `SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD` hoặc file ignored `.env.local` như backend hiện tại. Không commit credentials.

```powershell
# Mặc định chỉ kiểm tra và hiện kế hoạch, không ghi DB.
.\tools\install-rental-read-views.ps1 -Database proptech_db

# Sau khi kiểm tra đúng server/database, áp dụng V43+V44 trong một transaction.
.\tools\install-rental-read-views.ps1 -Database proptech_db -Apply

# Server khác: truyền rõ server và database của bạn.
.\tools\install-rental-read-views.ps1 -Server 'localhost,1433' -Database your_local_database -Apply
```

Script không reset hoặc chạy toàn bộ migrations cũ; thiếu V42 sẽ dừng, không khởi tạo dữ liệu thay bạn. Mặc định kết nối localhost1433, TLS bật và trust local server certificate; máy triển khai cần cấu hình TLS tin cậy theo môi trường. Khi lỗi SQL trong apply, transaction rollback. Sau apply, kiểm tra đủ5View. Chạy lặp không cập nhật dữ liệu nghiệp vụ hoặc điền timestamp cũ.

**Cách3 — SSMS/sqlcmd:** chọn đúng database, chạy lần lượt nguyên file [V43](../../ancu-proptech-backend/src/main/resources/db/migration/V43__contract_activation_time.sql), [V44](../../ancu-proptech-backend/src/main/resources/db/migration/V44__rental_read_views.sql). Giữ các dấu GO, vì CREATE/ALTER VIEW phải đứng đầu batch. Không đổi tên/bỏ các cột để chạy trên schema cũ; nâng đủ prerequisite trước.

## activated_at chứng minh điều gì?

Đây là thời điểm UTC **hệ thống chuyển hợp đồng sang ACTIVE**, được service ghi trong cùng transaction, sau kiểm tra và đủ chữ ký. Cả kích hoạt hợp đồng ban đầu và kích hoạt kỳ ký tiếp đều ghi. Một bên ký chưa đủ, ký tiếp chưa đến hạn hoặc activation bị chặn thì không ghi. Đọc lại không đổi timestamp. Không cho frontend gửi timestamp để tự tuyên bố ACTIVE.

Nó khác ngày bắt đầu thỏa thuận (`start_date`) và ngày thực tế nhận căn. Project chưa có sự kiện nhận căn độc lập. Luồng hợp đồng ban đầu hiện có thể ACTIVE trước ngày bắt đầu; View ghi rõ `ACTIVE_BEFORE_START`, không tính là đã bắt đầu thuê. Không thay đổi quy tắc kích hoạt trong task này.

Hợp đồng cũ ACTIVE/ENDED giữ `activated_at=NULL`: biết trạng thái/nguồn lịch sử, chưa biết thời điểm chuyển chính xác. Không backfill bằng ngày bắt đầu, ngày ký, ngày chạy migration hoặc thời điểm fixture. Các fixture giữ `local_fixture` để phân biệt; không coi chữ ký fixture là bằng chứng giao dịch thực.

## 5 View và phạm vi một dòng

| View | Một dòng cho | Cột/ý nghĩa chính |
|---|---|---|
| `vw_customer_tenancy_history` | Một hợp đồng, gồm cả draft/cancelled để không giấu lịch sử | Customer/Owner, căn/tài sản, agreed dates, status, activated/ended, chữ ký timestamps, predecessor, fixture, `activation_evidence`, `tenancy_stage`, `has_started_tenancy`, `is_current_tenant`. Không bao gồm CCCD, email, ảnh chữ ký, tài khoản ngân hàng hoặc JSON hồ sơ gốc. |
| `vw_apartment_rental_overview` | Một căn, kể cả căn trống | Owner/property, publication/availability/approval riêng, hợp đồng ACTIVE, tenant, số draft/active/pending new requests và có handover pending không. Tổng hợp collection trước, không nhân bản căn do nhiều request. |
| `vw_invoice_payment_status` | Một hóa đơn tháng | `issuance_status` DRAFT/SENT riêng `payment_status` PAID/UNPAID, `is_payable_unpaid`, overdue, amount_due/paid_amount và paid_at. Có QR chưa có paid_at vẫn UNPAID; DRAFT không có amount_due hoặc overdue. Không nhập chung phiếu bổ sung SePay vào hóa đơn tháng. |
| `vw_owner_request_inbox` | Một yêu cầu có loại NEW/RENEWAL | `request_key` như NEW:42/RENEWAL:1, owner/property/customer, raw request_status, processing_stage, hợp đồng nguồn/kết quả. Loại selection nội bộ khi soạn ký tiếp khỏi NEW. Không tự chấp nhận/hủy hoặc quyết định quyền hành động. |
| `vw_account_tenancy_summary` | Một account, kể cả chưa có hợp đồng | Count hợp đồng, số quan hệ hiện tại, số căn khác nhau đã thuê, số chờ kích hoạt/hết hạn, cờ/đếm dữ liệu lịch sử không chắc và fixture. `first_recorded_activation_at` là MIN các timestamp **đã ghi nhận**, không bảo đảm là lần thuê đầu tiên nếu có legacy NULL. |

Tên hai bên trong history ưu tiên tên snapshot hợp đồng, tách `customer_display_name/owner_display_name` hiện tại và cột name_source. Snapshot cũ JSON lỗi/không có thì fallback tài khoản hiện tại, ghi CURRENT_ACCOUNT; không chế tên pháp lý đã xác minh. owner_id hiện lấy từ owner của property, đúng mô hình hiện chưa có chuyển nhượng ownership; nếu sau này cho chuyển chủ phải thêm quan hệ lịch sử/snapshot party ID, không dùng owner hiện tại để chứng minh chủ nhà quá khứ.

### Trạng thái history

- DRAFT: chưa đủ chữ ký; SIGNED_WAITING_ACTIVATION: ký đủ nhưng chưa ACTIVE.
- ACTIVE_BEFORE_START: hệ thống ACTIVE nhưng ngày bắt đầu thỏa thuận chưa đến.
- CURRENT: ACTIVE và nằm trong kỳ; EXPIRED_PENDING_RESOLUTION: ACTIVE đã qua end date, còn quan hệ chờ xử lý. Cả hai có `is_current_tenant=1` nếu start date đã tới; không tự trả căn VACANT.
- CANCELLED_BEFORE_ACTIVATION: kỳ ký tiếp bị hủy trước ACTIVE; không tính căn đã từng thuê.
- ENDED: hợp đồng đã kết thúc. Legacy end_reason HANDOVER/RENEWED là bằng chứng đã thuê; ENDED không rõ lý do và không activated_at được đánh dấu UNKNOWN_ENDED_HISTORY, không tự tính như đã thuê.

Các nhãn đọc không thay state machine hoặc quyền ghi. Ngày nghiệp vụ tính theo Asia/Ho_Chi_Minh tương ứng SQL 'SE Asia Standard Time'; timestamp lưu UTC. Không dùng View label thay kiểm tra quyền/backend locks khi ký/bàn giao.

## Truy vấn mẫu

```sql
-- Điền ID từ tài khoản bạn được phép xem; API phải lấy account từ phiên và lọc owner/customer.
DECLARE @customer_id bigint = 2;
SELECT contract_id, customer_id, customer_name, customer_name_source,
       owner_id, owner_name, property_name, room_number,
       agreed_start_date, agreed_end_date, owner_signed_at, customer_signed_at,
       activated_at, activation_evidence, tenancy_stage, local_fixture
FROM dbo.vw_customer_tenancy_history
WHERE customer_id=@customer_id
ORDER BY agreed_start_date DESC,contract_id DESC;

SELECT * FROM dbo.vw_account_tenancy_summary WHERE account_id=@customer_id;

DECLARE @owner_id bigint = 3;
SELECT invoice_id,room_number,period,issuance_status,payment_status,paid_at,amount_due
FROM dbo.vw_invoice_payment_status
WHERE owner_id=@owner_id AND is_payable_unpaid=1;

SELECT * FROM dbo.vw_apartment_rental_overview WHERE owner_id=@owner_id;
SELECT * FROM dbo.vw_owner_request_inbox WHERE owner_id=@owner_id AND request_status='PENDING';
```

View không có tham số/account login filter sẵn. Không đưa `SELECT *` xuyên tất cả account ra API. Script không GRANT quyền cho account thường và không mở endpoint đọc toàn View. Cần backend filter exact-party hoặc DB policy/role được thiết kế riêng trước khi cấp truy cập cho người dùng.

## Sửa badge hóa đơn

`GET /api/v1/owner/invoices/summary?propertyId=...` trả `unpaidCount` trên toàn scope Owner/property: SENT và không có invoice payment paid_at. Không đếm DRAFT hoặc SENT đã trả, không phụ thuộc trang20hóa đơn đang mở. Frontend dùng kết quả này cho Sidebar, refresh khi đổi tài sản/làm mới/gửi hóa đơn/focus và mỗi10giây khi tab hiển thị. Lỗi thì ẩn số chưa xác định, báo lỗi ở trang hóa đơn; không fallback sang count SENT. Không đổi số tiền hoặc trạng thái payment.

API count dùng repository có ownership check, độc lập với SQL View để không biến View thành lớp phân quyền. Cùng ngữ nghĩa với `is_payable_unpaid`; integration test đối chiếu cả hai. View thường không lưu cache và không tự nhanh hơn query JOIN; index/performance tuning là việc riêng theo query plan.
