# Nhật ký sửa nghiệp vụ

Đọc file này cùng WORK_PROGRESS.md khi tiếp tục. Sau mỗi phần sửa, thêm một dòng ngắn: ngày, mã, hành vi đã sửa, kiểm tra thực tế và commit. Không ghi hoàn thành cho phần chỉ đề xuất hoặc chưa kiểm tra. Giữ các dòng cũ; chi tiết kỹ thuật nằm trong báo cáo/ADR.

| Ngày | Mã | Nội dung đã sửa | Kiểm tra | Commit |
|---|---|---|---|---|
| 21/11/2026 | RA01 | Chặn ngày bắt đầu đã qua ở cả phát OTP và ký; OTP qua nửa đêm không ký được, giữ nguyên chữ ký cũ. | 56 backend đạt; 4 biên ngày chạy lại đạt; 4 Playwright Owner/Customer desktop/mobile đạt. | `5f5f0082` |
| 21/11/2026 | RA02 | Ký đủ trước ngày thuê: giữ phòng, hiển thị chờ hiệu lực, tự kiểm tra/chuyển đúng ngày; hỗ trợ hủy song phương khi đang chờ. | 73 backend đạt qua các lượt; 165 frontend/TypeScript/build và 4 Playwright desktop/mobile đạt. | `fdc5caa7` |
| 21/11/2026 | RA03 | Chặn điện nước khi hợp đồng chưa bắt đầu hoặc kỳ vượt tháng hiện tại, dùng chung cho chỉ số/tạo/gửi/AI; nháp cũ vẫn hủy được. | 77 backend đạt, 1 scheduler skipped; 4 Playwright desktop/mobile đạt; RENT D-7 giữ nguyên. | `b5d22553` |

## Cần cân nhắc

- RA04: **cần cân nhắc, chưa sửa** — chốt các khoản phải thu trước/sau khi trả phòng.

## Rà soát bổ sung 21/11/2026 — chưa sửa runtime

- RA10 (cao, đã tái hiện): duyệt gia hạn quyền khai thác tương lai thay ngay quyền hiện tại, làm tài sản bị chặn dù hạn cũ còn hiệu lực.
- RA11 (trung bình, đã tái hiện): hồ sơ wizard bị yêu cầu bổ sung gửi lại bằng giấy tờ mới chưa quét vẫn vào hàng chờ Admin. Chưa tự duyệt/công khai.
- RA12/RA13 (trung bình, cần thống nhất quy tắc): Owner hủy thuê tiếp có một chữ ký không cần bên kia đồng ý; thuê tiếp ký đủ đang chờ lại chưa có luồng hủy song phương.
- Đã chạy lại: 232 ca hồi quy đạt, 4 ca tái hiện xác nhận vấn đề, 1 ca skipped; 6 Playwright desktop/mobile đạt. Không sửa runtime hoặc dữ liệu ứng dụng.
- Kiểm tra và phạm vi chi tiết: [báo cáo rà soát gồm tạo tài sản](docs/reports/business-logic-recheck-2026-11-21.md). Bốn ca tái hiện xác nhận vấn đề còn tồn tại, không đánh dấu là đã sửa. Tiếp tục ưu tiên RA10/RA11, giữ RA04 cần cân nhắc.

## Rà sâu tạo/thêm căn hộ và bộ test Thu Hà — 21/11/2026

- Chưa sửa runtime: RA14 thêm căn đăng được giá thuê 0/thiếu đơn giá; RA15 publication chưa kiểm tra lại ảnh riêng; RA16 thêm căn ngoài wizard có thể làm wizard SINGLE_UNIT không hoàn tất. Cần thống nhất policy phát hành và quyền quản lý danh sách căn lúc đang soạn.
- 55 backend đạt (52 hồi quy + 3 tái hiện), 6 Playwright desktop/mobile cho ba hình thức đạt; giấy mẫu 6 PDF đã mở lại/render/xem. Chi tiết tại [báo cáo tạo/thêm căn hộ](docs/reports/apartment-creation-deep-review-2026-11-21.md).
- Đã tạo 3 bộ **file riêng tư để tự upload** cho Thu Hà: chính chủ, ủy quyền, thuê lại; hai bộ sau chủ gốc chuongaln. Theo lựa chọn file-only, đã gỡ ba nháp tạm và dữ liệu fixture vừa thêm có backup/guard; không để lại nháp hoặc tự duyệt/xác thực, không đưa giấy tờ cá nhân vào Git. Xem đầu ra trong báo cáo; không chạy lại helper Apply.

## K? kh?ng OTP ?? ki?m th? ? 22/11/2026

- Local m?c ??nh t?t OTP k? h?p ??ng/b?n giao; v? ch? k? v? ??ng ? r?i k? tr?c ti?p. B?t l?i b?ng APP_SIGNING_OTP_ENABLED=true. Ngo?i local/test lu?n b?t bu?c OTP; OTP t?i kho?n gi? nguy?n. Backend ki?m tra ??y ?? quy?n/ng?y/hash/version v? hai b?n.
- ??t 106 backend, 162 frontend, TypeScript/build, 16 Playwright desktop/mobile v?i API fixture; kh?ng g?i email th?t hay s?a d? li?u ?ng d?ng. Xem [quy?t ??nh v? c?u h?nh](docs/decisions/test-signing-without-otp-v1.md). Commit: tra git log theo feat(contract): cho ph?p k? kh?ng OTP khi ki?m th? c?c b?.
