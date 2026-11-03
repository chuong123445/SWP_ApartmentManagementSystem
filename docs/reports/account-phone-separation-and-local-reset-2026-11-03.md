# Tách số điện thoại và đặt lại hai tài khoản local — 03/11/2026

User đã xác nhận xóa2tài khoản Minh Khang/Thu Hà cùng4yêu cầu thuê, mở lại đúng4căn và bổ sung cột căn cước còn thiếu. Sau đó user xác nhận số điện thoại thuộc tài khoản thông thường, bỏ khỏi căn cước. Đây là **một thao tác local được chỉ định**, không tạo chính sách tự release căn hộ, FIFO hoặc reset dữ liệu định kỳ.

## Thao tác đã áp dụng trên proptech_db

- Xác định chính xác `7/nguyenminhkhang@example.com` và `8/tranthithuha@example.com`, cùng bằng chứng AUTH0_VNEID_SIMULATION VERIFIED. Chưa có hợp đồng lưu cho4yêu cầu và không có tài sản/hợp đồng đứng tên2account này.
- COPY_ONLY BACKUP WITH CHECKSUM vào `tmp/proptech-before-two-auth0-reset-20261103-111320.bak`; RESTORE VERIFYONLY WITH CHECKSUM thành công. Đây là kiểm tra file backup, không tuyên bố đã restore database thử.
- Một transaction SERIALIZABLE/XACT_ABORT kiểm tra lại exactemail/IDs/status/room, account/evidence và các tham chiếuFK khác; từ chối nếu xuất hiện hợp đồng mới, tài sản hoặc accepted selection khác. Không tắt FK hoặc trigger, không TRUNCATE/DB reset.
- Xóa đúng2auth_accounts,2auth_external_identities,2auth_owner_upgrades,1property_source_consents,11auth_sessions và21auth_refresh_tokens; account_reauthentications0. Không đụng tài khoản trên Auth0 hoặc credentials của người khác.
- Xóa đúng rental_requests37/38/43/44. Chuyển A.101(id4)/A.201(id1)/A.102(id3)/B.202(id6) từ CONTRACT_IN_PROGRESS về VACANT, version+1; vẫn PUBLISHED. Version sau:5/5/3/5.
- Thêm4cột nullable document_issue_date/date,document_issue_place/nvarchar(200),permanent_address/nvarchar(500),details_updated_at/datetime2(6). Không backfill. Cột phone_number đã tồn tại ở thời điểm kiểm tra sau thao tác; script **không thêm/xóa** cột đó, bản code mới để cột cũ không sử dụng.
- Hash SHA256 của toàn bộ các account/request/apartment ngoài phạm vi, mọi rental_contracts/contract_drafts/rental_properties giống nhau trước/sau trong transaction; commit chỉ sau khi so sánh thành công. Chỉ4availability/version đổi trên các căn mục tiêu, không đổi giá/pháp lý/ảnh.
- Read-back sau commit: oldaccounts/requests/bindings/sessions/upgrades/consents đều0;4căn VACANT/PUBLISHED;4cột căn cước đủ. Không tự đăng nhập/tạo lại2account để thử. Tài khoản Auth0 remote vẫn giữ nguyên để user đăng nhập lại khi đã cập nhật code/Action.

Guarded SQL/operator và JSON kết quả nằm ngoài Git tại `tmp/reopen-two-auth0-accounts-20261103.sql`, `tmp/apply-two-auth0-account-reset.ps1`, `tmp/two-auth0-account-reset-result.json`, `tmp/two-auth0-reset-final.json`. Không đưa backup hoặc hash/password/token của account vào repository. Không chạy lại script một cách định kỳ: IDs đã bị xóa và guard sẽ từ chối.

## Mã nguồn và bộ Auth0 v2

Nhánh riêng `fix/account-phone-separation` từ main2dafe57, worktree `tmp/account-phone-separation-20261103`.

- ExternalIdentity/verification DTO không còn phone; ContractDraftService luôn lấy `AuthAccount.phone`, không fallback từ căn cước. Contact verification/password/phone change flow giữ nguyên. Không sửa snapshot đã lưu.
- Citizen parser bỏ phone khỏi optionalclaims và ignores legacy phone claim; ngày/nơi cấp/thường trú vẫn validate và fillNULLonly theo đúng binding/core. Action và10JSON bỏ citizen.phone_number;11claim thay12.
- V45 chỉ thêm4cột không liên quan phone trên database mới. Cột phone_number cũ nếu có được giữ nguyên không dùng, không phát sinh DROP hoặc mất dữ liệu lịch sử.
- Generator từ chối citizen cóphone và tạo gói v2 không có password/user_id/rootverificationflags. Giữ10email/coreCCCD/21asset/43unit IDs và mọi thông tin khác. Bulk upsert vẫn phải sao lưu/hợp nhất app_metadata remote; không giả định upsert merge.
- Artifact `output/auth0-profile-details-2026-11-03-v2.zip`,13file gồm bulkmetadata,10app_metadata riêng,Action và hướng dẫn. Đã kiểm tra10record không có citizen phone. Dùng v2 thay bộ đầu tiên.

## Kiểm tra

-99backend/source tests PASS trên database riêng `ancu_account_phone_20261103`, gồm40contract/18Vneid/8CitizenDetails/14NameConfirmation/11TokenVerifier/2SampleProfiles/6AssetReader. Test mới xác nhận claim phone cũ không kích hoạt bổ sung căn cước; snapshotphone lấy từ account và không đổi sau khi account thay đổi. Code compile toàn bộ src/tests.
-Lượt đầu JVM dừng vì Windows thiếu commit memory/pagefile; chạy lại thành công1m03 với heap512MB/SerialGC, chỉ env process rồi phục hồi. Một lần cấu hình VM thiếu dấu= và một lần thiếu thư mục log đã sửa cách chạy. Không có test logic failure trong run cuối.
-TypeScript/101frontend unit/native-config Vite build PASS904ms; cảnh báo chunk>500kB hiện có.2test dữ liệu/Action cập nhật kiểm tra khôngphone/11claim. Không thêm dependency hoặc thay config project.
-4existing contract-party-details callbacks qua Playwright MCP PASS complete/legacy1440/390; UI vẫn hiện contactphone từ payload account khi có, không emailverificationstatus; không lỗi console/network/page/overflow hoặc businesswrites. Đã xem screenshot mobile `tmp/account-phone-contract-mobile.png`. Không tuyên bố CLI runner/live Auth0 PASS.
-JVM đã shutdown; mocks/listeners gỡ/aboutblank rồi đóng trang test, Vite riêng3012 đã dừng. Không restart server người dùng, không đổi Auth0Action trên tenant, không SMS/email hoặc giao dịch thanh toán.

Sau khi cập nhật nhánh vào ứng dụng: Deploy Action v2, dùng metadata v2 khi cần và đăng xuất/đăng nhập lại qua VNeID để lấy dữ liệu mới. Hai account nội bộ cũ đã xóa; lần Auth0 đăng nhập kế tiếp tạo account nội bộ mới theo policy CUSTOMER hiện có, không khôi phục OWNER hoặc yêu cầu thuê cũ tự động. Nhập số điện thoại riêng trong Cài đặt tài khoản nếu cần.
