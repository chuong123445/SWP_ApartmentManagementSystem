# Chi tiết các bên trong hợp đồng và bộ Auth0 nhập lại — 03/11/2026

Nhánh độc lập `feat/contract-party-profile-details` từ `origin/main`15da508, worktree `tmp/contract-party-details-20261103`. User yêu cầu bỏ trạng thái xác thực email khỏi thông tin hợp đồng và bổ sung đầy đủ10JSON Auth0, không dùng nội dung chung chung như “nơi cấp mẫu”. Bộ gốc vốn là danh tính hư cấu/example.com/CCCD999; đã hỏi nguồn dữ liệu thật và tiếp tục với giả định được thông báo: bổ sung giá trị hư cấu cụ thể, không trình bày thành thông tin thật.

## Thay đổi

- Backend/Action/API: commit `111a784`, bốn claim tùy chọn cho số điện thoại, ngày cấp, nơi cấp, thường trú; V45 thêm5cột nullable gồm timestamp bổ sung. Token cũ vẫn hoạt động. Token Auth0 mới đã được kiểm tra có thể điền **chỉ trường trống**, đúng issuer/subject và toàn bộ định danh cốt lõi. Không sửa giá trị đã có, verifiedAt, tên hiển thị, thông tin liên hệ account/cờ xác thực, mật khẩu, role hoặc khóa tài khoản. Account row lock + refresh evidence + optimistic version; sửa core trả409.
- Hợp đồng mới lấy bốn trường từ evidence; số liên hệ account được ưu tiên trước phone từ nguồn mô phỏng. Các snapshot cũ/đã ký không viết lại. API tự xác thực chỉ trả dữ liệu cho chính tài khoản. Không có form nhập căn cước mới hoặc quyền đọc chéo.
- Dữ liệu/import: commit `20942f7`,10citizen đủ trường;21nơi cấp giấy chứng nhận thay placeholder bằng tên cơ quan cụ thể. Giữ email/CCCD/core citizen,21asset/43unit IDs, số chứng nhận và credential. Generator tạo bulk metadata-only và10object app_metadata để cập nhật riêng, Action và hướng dẫn; không xuất password. Bulk upsert thay thế metadata nên hướng dẫn yêu cầu sao lưu/hợp nhất mọi dữ liệu khác trên tenant trước khi nhập. Không gọi provider.
- UI: PartyReview bỏ dòng trạng thái xác thực email cho cả Bên A/B; giữ địa chỉ email là thông tin liên hệ và nguồn căn cước. Ghi chú không còn giải thích trạng thái email. Các field thực sự thiếu ở snapshot cũ vẫn hiển thị chưa có dữ liệu, không bịa backfill. TypeScript Citizen tương thích response bổ sung.

## Kiểm tra thực tế

-90Backend tests PASS trên database riêng `ancu_party_details_20261103`:40ContractDraftIntegrationTests,18VneidIntegrationTests,7CitizenDetails,14NameConfirmation,11RSA/token-verifier. Kiểm tra flow bổ sung sau login, version retry không tăng, contact flags/credentials không đổi, identity mismatch không cập nhật, ngày/phone/độ dài/groupvalidation; context hợp đồng đầy đủ và snapshot cũ bất biến. Lần compile đầu test mới thiếu import LocalDate đã sửa trước run PASS1m12.
-8source/adapter tests PASS (2Auth0SampleProfiles+6AssetReader):10profile/21asset/43unit vẫn đọc được.32unit checks đầu task cũng PASS nhưng nằm trong90nên không cộng vào tổng unique98.
-V45 chạy lặp2lần trên chính database kiểm thử,5cột đều có; không đụng proptech_db. Startup test dùng migration mới thành công. Không chạy migration lên appDB.
-TypeScript PASS;100frontend unit PASS bằng Node native TypeScript transform/aliasloader/no worker isolation. Có2test mới kiểm tra đủ dữ liệu10profile và Action chuyển12claim vào cả ID/access token cho cả10profile. Dùng tooling native bên ngoài repo theo giới hạn EPERM đã biết; không thêm dependency.
-Vite production build PASS1.13s,2454modules; cảnh báo chunk>500kB hiện có. Native config loader và preload __dirname ngoài repo; config project không sửa.
-4callback từ spec contract-party-details chạy qua Playwright MCP PASS: complete/legacy ở1440/390. Thao tác thật mở Owner inbox, lọc đang làm hợp đồng, mở wizard, bước Bên A→Bên B; không còn dòng trạng thái email ở hai bên; complete không có “Chưa có dữ liệu”; legacy giữ4missingfield. Không page/console/unexpected network errors hoặc overflow; không gửi lệnh tạo/sửa hợp đồng. Lần đầu test dùng tên dialog cũ đã sửa selector, rồi chạy đủ4PASS. Không tuyên bố Playwright CLI/full E2E với Auth0 thật PASS.
-Đã mở ảnh mobile `tmp/contract-party-details-mobile.png` kiểm tra trực quan: thông tin đọc được, ngày/nơi cấp cụ thể, không có trạng thái email, modal cuộn và footer điều hướng rõ.
-Artifact: `output/auth0-profile-details-2026-11-03/users-upsert.json`,10file per-user-app-metadata,Action và HUONG-DAN.md;13file không chứa password/hash/user_id hoặc cờ xác thực trong bulk. Bộ ZIP được tạo ngoài Git; core nguồn và ID giữ nguyên. Không giả định upsert tạo/sửa password.

Backend test JVM đã shutdown, browsermocks/listeners gỡ/aboutblank và Vite test3011 dừng. Không restart server người dùng, không cập nhật Auth0/Action trên tenant, không SMS/email, không reset fixtures hoặc thay dữ liệu hợp đồng. Tài liệu Auth0 về bulk upsert/schema được tra qua Context7; đây không phải import thật hoặc xác minh pháp lý.

## Đưa vào sử dụng

Review/merge nhánh rồi cập nhật Backend/V45 và Frontend. Người vận hành sao lưu/so sánh metadata trên Auth0, dùng bulkupsert=true hoặc sửa app_metadata của đúng10user đang có (không Create User/xóa user), Deploy Action mới, đăng nhập lại qua VNeID. Context hợp đồng mới sẽ có trường được bổ sung. Hợp đồng/bản nháp đã lưu không tự đổi; không xóa tài liệu hoặc tạo lại tài khoản để cập nhật thông tin.

Hướng dẫn chi tiết: [IMPORT-PROFILE-DETAILS](../samples/auth0/IMPORT-PROFILE-DETAILS.md); quyết định: [vneid-citizen-details-v1](../decisions/vneid-citizen-details-v1.md).

Đã push nhánh và tạo [PR38 vào main](https://github.com/chuong123445/SWP_ApartmentManagementSystem/pull/38), không merge/push main. Ba unit code/data/UI lần lượt111a784/20942f7/f057f75; checkpoint tài liệu cuối ghi rõ kiểm thử mới so với bộ gốc. Root workspace main và các worktree/PR khác được giữ nguyên. Bộ ZIP13file đã được tạo; không có provider mutation hoặc mật khẩu được xuất vào bộ bổ sung.
