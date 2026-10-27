# Import tài sản Auth0 mô phỏng — 27/10/2026

## Kết quả

Backend91aacb5: GET /api/v1/owner/properties/vneid-assets và POST /vneid-imports. Đọc exact linked subject VERIFIED, source snapshot/hash, terms theo exact unit IDs, SQL account lock/recheck/link/session, unique issuer+asset, atomic approved property + published/vacant units + rates/baselines + V15 evidence. Không Admin decision giả; manual tạo DRAFT/Admin review giữ nguyên. Chặn thêm căn thủ công vào source property để tránh mượn approval cho căn khác.

UI764d190: Thêm tài sản → Chọn tài sản từ VNeID → bổ sung giá thuê/cọc/điện/nước/chỉ số/tầng/sức chứa/địa phương → Thêm và cho thuê. Card nguồn có nhãn VNeID, không yêu cầu hồ sơ Admin; duplicate disabled, empty/error/retry/stale, preserve terms on transient save failure. Public/Owner detail hiện đơn giá. Không tự sửa các hợp đồng/hóa đơn cũ; source certificate chưa được nối sang snapshot hợp đồng, receiving bank vẫn theo workflow hợp đồng riêng.

## Kiểm chứng thực tế

- 71 Backend PASS/0failure/error/skip: Import14 + AssetReader6 + OwnerUpgrade10 + OwnerProperty7 + PropertyDossier10 + DiscoveryRental24. Log target/asset-import-final-tests.log BUILD SUCCESS/56.514s. SQL test rollback, V15 additive applied; không tự nhập/publish tài sản thật.
- Import kiểm tra success/no manual identity/no Admin, discovery/public detail/rates/private audit, multi-unit, duplicate, asset người khác/removed/stale, invalid/missing prices/extra authority/incorrect units, missing identity/wrong role/LOCKED, provider503, binding changed during provider call, manualDRAFT and injected unit denied. Không có dedicated concurrent import race test; serialize account + DB unique constraint là cơ chế hiện có, không khẳng định đã chạy race.
- Frontend44unit PASS, TypeScript/lint PASS, build PASS (existing Vite native-loader/large-bundle warnings).
- Playwright15 PASS/20.7s: 8new vneid-assets +7owner identity gate. Sau thay đổi nhỏ clear list on reload, rerun affected8 PASS/12.7s +final lint/buildPASS. Desktop1440/mobile390; complete import+reload badge/no Admin dossier, missing terms/no POST, manual path, already imported, empty source, GET503retry, source409refresh, POST503preserve/retry. Không overflow/pageerrors/unexpected requestfailures; console excludes exact existing favicon404 and scenario-specific expected503/409 only. Viewed mobile terms PNG. Browser APIs controlled, no real data writes.
- Initial backend failures: decimal scale expectation normalized2digits; LOCKED expected401 per existing session policy; discovery contact flag excluded valid VNeID evidence, corrected discovery/address query and regression pass. Initial browser fixtures missed CSRF endpoint for session restoration, mobile sidebar needs menu opened, StrictMode GET count cannot be fixed2; corrected test expectations/fixture, final runs PASS.
- Context7 Framework7.0.5 closest available to installed7.0.9/Boot4.1.1 and React19.3 checked; no newdeps. Playwright MCP opened3002 and CLI suites executed.

## Live source / giới hạn

Read-only live Management diagnostic token+user metadata schema succeeded: owner02 có2assets với ID/name/mode/address/right/certificate/units. Chỉ tên trường/số lượng in ra, không token/secret hoặc hồ sơ cá nhân. Diagnostic lookup by email chỉ kiểm tra schema; production always issuer/subject từ binding đã xác thực. Không claim đã thao tác chọn/import tài sản thật qua Auth0 trong browser; người dùng cần restart Backend/reload để dùng endpoint mới. Feature không thay metadata Auth0 hoặc reset credentials/fixtures.

Dedicated Vite3002 PID16096 verified/stopped; user8080/3000/SQL preserved. Không tạo Backend server riêng trong task này. Repo local commits, no push; root OpenAPI/ADR/report/plan/API/AGENTS/progress synced, RDS/diagrams untouched. Historical statement that all properties need Admin is superseded only for source imports.

## Proposal mới: ủy quyền/thuê lại

Đã đánh giá khả thi trong ADR, chưa code: RightType hiện OWNERSHIP/AUTHORIZATION, chưa SUBLEASE hoặc bắt buộc phân loại giấy tờ theo từng loại. Nâng cấp Owner hiện đòi asset chính chủ nên cần Self dossier onboarding cho Customer không có asset trước khi nhóm này dùng được. Giữ một account role OWNER quản lý, right type theo property, public label không public papers. SMS/provider và expiry/revocation/legal notarization chưa là tính năng đã triển khai. Không tự nới gate để thực hiện proposal chỉ mới được hỏi đánh giá.
