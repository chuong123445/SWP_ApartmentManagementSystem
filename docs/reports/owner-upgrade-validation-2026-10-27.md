# Kiểm chứng đăng ký và nâng cấp Owner — 27/10/2026

## Phạm vi và kết quả

- Settings có trạng thái Email/CCCD; đăng ký chỉ CUSTOMER, không nhận role từ caller.
- Chủ động nâng cấp sau consent, persisted VNeID VERIFIED và ít nhất một tài sản Auth0 hợp lệ. M2M credentials chỉ Backend. Có xử lý không cấu hình, provider lỗi, không tài sản, stale version và liên kết thay đổi.
- Owner tiếp tục thuê nhà, xem lịch sử yêu cầu/hợp đồng/hóa đơn của chính mình; chặn tự thuê căn hộ và phone-only vượt rental verification policy.
- V14 additive auth_owner_upgrades; không tự nhập/approve/publish Property, không reset accounts/fixtures.

## Kiểm tra thực tế

Backend 63 test riêng biệt PASS, không failure/error/skip, qua các lượt theo phạm vi:

- RegistrationIntegrationTests 9: CUSTOMER mặc định, từ chối payload role và các điều kiện đăng ký.
- OwnerUpgradeIntegrationTests 10: consent, nguồn, điều kiện tài sản/liên kết, audit, stale và lịch sử thuê sau nâng cấp.
- Auth0AssetReaderTests 6: HTTP được kiểm soát, M2M và schema/nguồn lỗi; không gọi tenant thật.
- DiscoveryRentalIntegrationTests 24 và VneidIntegrationTests 14: lượt cuối target/owner-rental-policy-tests.log ghi 48 PASS/BUILD SUCCESS. Hai nhóm đầu và adapter được kiểm chứng trong owner-upgrade-tests.log, owner-upgrade-history-tests.log, owner-upgrade-final-tests.log.

Frontend: 44 unit PASS, TypeScript/lint PASS, build PASS (cảnh báo native config/bundle lớn đã tồn tại). Playwright CLI 12 PASS/22.2s: owner-upgrade 6, verification-status 4, auth 2. Desktop 1440/mobile 390, thao tác consent, thành công/reload role, không tài sản, thiếu nguồn, chưa xác thực, đăng ký không selector; không tràn ngang/page errors. Các API lỗi dự kiến chỉ cho phép đúng tình huống. favicon.ico 404 là tài nguyên thiếu có sẵn, phân loại riêng; không bỏ qua lỗi API. Đã xem ảnh mobile Settings.

Lỗi test ban đầu do session fixture chưa flush trước clear persistence context đã sửa bằng flush fixture; rerun đạt. Không khẳng định đã có dedicated concurrent upgrade race test; có version/lock và idempotency tests.

Context7 đã đối chiếu Auth0 GET user/read:users/client_credentials và Spring URI API; tài liệu Framework 7.0.5 gần installed 7.0.9/Boot4.1.1. Không thêm dependency. Playwright dùng CLI fallback theo hướng dẫn workspace.

## Giới hạn và bàn giao

Live login Auth0 do user báo thành công; agent không lặp lại đăng nhập bằng mật khẩu. Live Management API NOT_RUN: user sẽ điền AUTH0_MANAGEMENT_CLIENT_ID và AUTH0_MANAGEMENT_CLIENT_SECRET trong Backend .env.local, cấp read:users cho Management API rồi restart Backend. Không có secret trong Git/frontend/log/report. Hai key trống được thêm khi chưa tồn tại; giữ config cũ.

Dedicated Backend8082 PID2508/Vite3002 PID3372 đã kiểm tra command line và dừng; sau dừng 0 listeners. Giữ user8080/3000 và SQL Server. Test SQL dùng rollback, V14 additive đã được nạp; không chủ động nâng cấp account thật hoặc nhập dữ liệu tài sản.

## Commit

- 097746a feat(auth): đăng ký mặc định tài khoản thông thường.
- 8788a3e feat(auth): nâng cấp Owner sau kiểm tra tài sản Auth0.
- a5f7691 feat(ui): hiển thị trạng thái CCCD và nâng cấp chủ cho thuê.
- 66eaf7d fix(auth): giữ điều kiện xác thực thuê sau nâng cấp Owner.

Diff/check trước commit đạt; không push. ADR và setup giải thích phần đã triển khai và live còn chờ.
