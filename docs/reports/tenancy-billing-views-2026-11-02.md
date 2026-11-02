# Tenant read views, activation timestamp và badge hóa đơn — 02/11/2026

## Kết quả

- Badge Hóa đơn & Thu đếm SENT chưa có payment paid_at trên toàn Owner/property qua API summary, không dùng số hóa đơn ở trang hiện tại. Refresh sau gửi/làm mới/đổi property/focus và poll10s khi visible. Service kiểm tra eligible Owner và repository ràng buộc owner_id; không tin caller ownerId. API no-store; tenant/guest không được gọi.
- V43 thêm `rental_contracts.activated_at datetime2(6) NULL`. Service ký thông thường và activation ký tiếp ghi actual UTC time cùng transaction chuyển ACTIVE. Ký một bên, ký tiếp chưa tới hạn/activation bị chặn không ghi; không backfill hợp đồng cũ.
- V44 tạo5View history/apartment/invoice/inbox/account summary. Một dòng theo contract/apartment/invoice/typed request/account; tên snapshot riêng display name hiện tại; giữ legacy uncertainty/fixture, không tính cancelled draft như đã thuê. Exclude internal renewal selection khỏi NEW, không duplicate do collections. View invoice tách issuance/payment/due và không coi QR đã tạo như đã thu tiền.
- Backend startup đăng ký V43→V44. Script PowerShell [install-rental-read-views.ps1](../../ancu-proptech-backend/tools/install-rental-read-views.ps1) PREVIEW mặc định, `-Database ... -Apply` áp dụng hai migration atomic. Không reset/drop/delete, không cấp quyền đọc toàn View cho public. Hướng dẫn và query mẫu: [rental-read-views.md](../database/rental-read-views.md).
- Nhánh `feat/tenancy-billing-views` dựa trên `feat/owner-request-inbox` (PR29) để dùng schema V42 đã có; PR này chỉ có thay đổi mới, không nhập fixtures/Home/audit vào diff. Không push/merge main. Mã AI đã sửa không thay đổi. V43/V44 dành riêng unit này; nhánh VNeID xác nhận khác tên cần số migration khác và giữ contract snapshot schema tương thích.

## Kiểm tra thực tế

- SQL clone: preview không ghi; Apply V43/V44 hai lần PASS; Backend startup migrations lần nữa PASS. SQL Server17.0.1000.7. Không tự coi đây là migration từ mọi phiên bản/schema tùy ý; script yêu cầu DB đã nâng đủ V42.
- Backend: BillingIntegrationTests11 + ContractDraftIntegrationTests41 = **52test PASS**, 1m31. Trong đó có3test mới cho history snapshot/invalid JSON, legacy/cancelled uncertainty và grain/request counts; bổ sung assertion activation ở normal signing/renewal. **2test targeted rerun PASS** 25.9s sau bổ sung invoice View/API parity và future renewal NULL activation; không tính thành54test độc lập.
- Billing summary regression gồm SENT paid, QR chưa paid_at, chưa tạo payment, DRAFT, pagination size1, exact property, foreign property/owner, tenant403, guest401, Cache-Control. Lượt đầu API mới bị SecurityConfig denyAll vì thiếu matcher; thêm matcher authenticated và giữ service Owner gate, chạy lại11PASS.
- TypeScript PASS; toàn bộ **91frontend unit PASS** bằng Node native transform-types/alias loader do môi trường runner; native-config Vite build PASS1.39s, cảnh báo bundle>500kB có sẵn. Không đổi dependencies.
- **2Playwright MCP spec callbacks PASS** desktop1440/mobile390, kiểm tra badge25 khi list ít hơn và chuyển trang, refresh sau payment summary0, đổi property→count4, không tràn ngang/pageerror/unexpected API. API fixtures, không giao dịch thật. Lượt đầu mobile click chính giữa overlay bị sidebar che, rồi property selection tự đóng menu; chỉnh test thao tác vùng overlay và mở lại menu, không sửa product để ép test. CLI runner không được chạy thành công trong unit này; không nhận là CLI E2E PASS.
- Gọi MCP qua filename dùng dynamic import ban đầu không được runtime hỗ trợ; chuyển sang compile spec bằng Node rồi truyền callback/harness vào MCP. Không thêm dependency hoặc dùng session người dùng.
- Đã dừng Vite test riêng3007; không restart server người dùng hoặc gọi provider/email/Auth0. Test JVM tự shutdown. Root source workspace giữ nguyên; code mới ở worktree riêng.

## DB local đã áp dụng phần bổ sung

Sau khi kiểm thử clone, áp dụng V43/V44 vào `proptech_db` theo yêu cầu tạo View. Không xóa database/bảng/dòng và không điền activation cũ. Đã so fingerprint toàn bộ nội dung cột cũ của auth_accounts/rental_contracts/contract_drafts trước/sau: count/hash giữ nguyên, bao gồm snapshot/chữ ký và credential hashes (không in nội dung).

Readback5View có đủ và grain đúng:7contracts→7history;19apartments→19overview;4invoices→4invoice view;30accounts→30summary. Inbox42NEW+1RENEWAL;0recorded activation vì tất cả hợp đồng có sẵn chưa có timestamp thực. Lúc đọc4hóa đơn tháng đều SENT/UNPAID; không suy luận phiếu bổ sung đã trả là payment hóa đơn tháng. Fingerprints/readback tạm ở tmp/views-business-before.json, views-business-after.json, views-live-verify.json ngoài Git; không commit bản ghi thật.

Chưa có live signature/activation mới bằng code mới: cần checkout/gộp PR và restart Backend để nạp setter activated_at + endpoint summary, rồi reload Frontend. Schema/View đã sẵn sàng; không gán kết quả test clone là hành vi server đang chạy. Các View là read model, không thay authority/object ownership hoặc tự sửa state machine. Không có triển khai auth/VNeID khác tên trong unit này.
