# Xác thực thủ công và chặn giấy tờ sai loại

Đã hoàn thành trên nhánh duy/manual-account-review từ7627db00, không push.

- 81f5f61a: form nhập tay + gửi snapshot/ảnh CCCD, Admin queue/detail/images/approve/reject, nguồn ADMIN_REVIEW. Giữ lựa chọn Auth0; không tự xác thực email, cấp OWNER, phê duyệt tài sản, mở khóa hoặc reset fixture.
- 7b4e13a8: gate AI extraction nhận đúng loại/readable, lưu kết quả server theo immutable evidence file và scanToken; chặn sửa step/complete bằng cờ client, chặn phản hồi cũ. Có quét lại và bỏ/tải lại tệp phù hợp.
- Hoàn thiện nhãn nguồn Admin trên trang xác thực/cài đặt/khách thuê, OpenAPI và kiểm tra replay nguồn Admin trong V55.

Backend:73 kiểm tra khác nhau PASS qua các lượt cuối:41 bộ hợp nhất identity/policy/listing/gate/precheck/unit;18Auth0 integration;14Gemini adapter/schema/parser qua HTTP loopback. Identity12 đã chạy lại cùng adapter14 sau bổ sung replayV55 trên bản ghi ADMIN_REVIEW;26PASS. Một kỳ vọng cũ của test Gemini3 đã cập nhật đúng maxOutputTokens16384/thinkingLevel=low đang có trong source, không thay production config để né kiểm tra.

Frontend:162unit,TypeScript và production build PASS; còn cảnh báo bundle lớn có sẵn.8Playwright MCP scenarios:2manual1440/390 (gửi→từ chối→gửi lại→duyệt),6gate1440/390 (422/503/JSON phân loại mâu thuẫn→resume vẫn chặn→bỏ/tải đúng tài liệu→tự điền/đi tiếp).8CLItests cùng các scenarios đã lưu PASS.2CLIwizardtests cũ với4desktop/mobileflowsPASS, gồm tài liệu đọc thành công, resume, ảnh chung/riêng, mô tảAI, source import và lọc nhóm tài sản. Không page/console/network lỗi bất ngờ hoặc tràn ngang trong các fixture; đã xem ảnh mobile Admin và lỗi giấy tờ.

Backend test dùng SQL Server riêng ancu_listing_ai_20261113; API/browser/provider đều test fixtures hoặc HTTP loopback, không gửi giấy tờ thật sang Gemini/Auth0, không có xác minh thực tế. Không sửa DBứngdụng, tài khoản, hợp đồng hay tài sản cũ. Startup backend sẽ chạy thêmV67/V68; cần backup theo quy trình vận hành trước nâng cấp. V55 giữ ràng buộc ADMIN_REVIEW khi initializer replay; migration không tự duyệt ai. Giấy tờ wizard đang chuẩn bị đã quét kiểu cũ cần quét lại theo gate mới; hồ sơ đã gửi/duyệt giữ nguyên.

Maven/Vite/Node cần quyền đọc cache/spawn ngoài sandbox, đã chạy bằng quyền được duyệt. Server kiểm tra riêng3196 dừng trước bàn giao. Ba file VNeID diagnostics chưa theo dõi có sẵn được giữ nguyên, không stage; không sửa RDS/drawio hoặc push/merge.

Sử dụng sau khi restart backend và reload frontend:

1. Tài khoản chưa xác thực căn cước: /account/settings/identity → nhập7trường +2ảnh → đồng ý gửi → Gửi Admin xét duyệt. /account/verification có liên kết vào form.
2. ACTIVE ADMIN: /admin/property-dossiers?tab=identity → chọn hồ sơ → đọc thông tin/ảnh → duyệt hoặc ghi lý do từ chối. Người nộp cập nhật trạng thái hoặc tải lại trang; hồ sơ từ chối có thể gửi lại.
3. Wizard đăng tài sản thủ công: upload đủ loại giấy tờ; sai loại/mờ/AI lỗi giữ bước giấy tờ. Bỏ tệp sai, gửi đúng tài liệu hoặc Quét lại giấy tờ. Chỉ khi toàn bộ tệp đang chọn và các nhóm bắt buộc đạt mới được tiếp tục. Phải có cấu hình Gemini hoạt động và ASSISTANCE_AI_ENABLED=true.

Tham chiếu: docs/decisions/manual-identity-review-v1.md, property-document-gate-v1.md; docs/api/manual-identity-review.openapi.json, property-listing-assistance.openapi.json, vneid.openapi.json.
