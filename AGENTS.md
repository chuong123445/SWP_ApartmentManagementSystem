# Định hướng An Cư PropTech

## Mục tiêu cuối cùng

Phát triển An Cư PropTech thành sản phẩm thương mại cho người dùng thật tại Việt Nam, có website, ứng dụng điện thoại (Android/iOS) và ứng dụng máy tính (PC). Đây là định hướng chung cho toàn bộ dự án, không chỉ là đồ án hoặc bản demo.

## Nguyên tắc phát triển

- Thiết kế các ứng dụng dùng chung backend/API và dữ liệu, tận dụng code hiện có khi phù hợp.
- Tối ưu trải nghiệm theo thiết bị và vai trò: chủ nhà cần quản lý, nhập liệu và báo cáo thuận tiện trên PC; cư dân cần hóa đơn, thanh toán, thông báo, chụp ảnh và báo sự cố thuận tiện trên điện thoại.
- Ưu tiên luồng nghiệp vụ trọn vẹn với dữ liệu thật, tính đúng tiền, phân quyền, độ ổn định và khả năng vận hành. Không trình bày dữ liệu giả hoặc tích hợp mô phỏng như chức năng thương mại đã được kiểm chứng.
- Khi chuẩn bị đưa ra thị trường, tính đến triển khai ổn định, sao lưu/khôi phục, giám sát lỗi, bảo mật, cập nhật phiên bản và thử nghiệm với chủ nhà thật.
- Capacitor, Tauri hoặc Electron mới là các phương án đã trao đổi; chưa được chốt. Không tự coi việc đổi công nghệ, đóng gói hay phát hành app là công việc đã được yêu cầu chỉ từ định hướng này.

## Cách làm việc đã thống nhất

- Giao tiếp và viết commit bằng tiếng Việt.
- Làm từng phần nhỏ có ý nghĩa, kiểm tra rồi commit và push ngay trước khi làm phần khác.
- Theo yêu cầu ngày 25/11/2026, làm trực tiếp trên nhánh `main`; không tự tạo nhánh chức năng hay chuyển sang `Duy/all`.
- Commit từng đơn vị hoàn chỉnh sau kiểm tra trên `main`; không bắt buộc tạo PR hoặc chia nhánh cho công việc thường ngày. Giữ nguyên công việc đang dở của người dùng.
- Tuân thủ phạm vi từng yêu cầu. Khi được yêu cầu chỉ sửa frontend, không sửa backend.
- Không đưa mật khẩu, API key hoặc file cấu hình riêng chứa bí mật lên GitHub.


## Nhật ký sửa nghiệp vụ dùng chung

Khi tiếp tục, đọc CHANGELOG_NGHIEP_VU.md cùng WORK_PROGRESS.md và CODING_PLAN.md ở thư mục cha nếu có. Sau mỗi đơn vị sửa hoàn chỉnh, cập nhật đúng CHANGELOG_NGHIEP_VU.md bằng một dòng ngắn: ngày, mã hoặc phạm vi, thay đổi người dùng nhìn thấy, kiểm tra thực tế và commit. Ghi rõ phần đang làm hoặc cần cân nhắc; giữ các dòng cũ, không tạo nhật ký tóm tắt song song. Chi tiết kỹ thuật và bằng chứng tiếp tục đặt trong ADR/báo cáo tương ứng.

## Override 24 November 2026 — no Auth0/VNeID property source

User explicitly retired source asset selection/import/append for both Auth0 and ordinary accounts. Auth0/VNeID is authentication/account identity verification only. New OWNERSHIP/AUTHORIZATION/SUBLEASE properties all use manual property information/dossier/Admin review; no source-based approval/publication/role grant. Old source APIs return410, source-consent readfalse/write410, no provider asset calls. Preserve historical assets/provenance/contracts without retrospective resets; existing eligible multi-unit assets use ordinary manual add-unit rules. Do not restore source UI or trust flags from old plans. Read docs/decisions/retire-vneid-property-source-v1.md and latest WORK_PROGRESS/CHANGELOG.
