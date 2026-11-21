# Nhật ký sửa nghiệp vụ

Đọc file này cùng WORK_PROGRESS.md khi tiếp tục. Sau mỗi phần sửa, thêm một dòng ngắn: ngày, mã, hành vi đã sửa, kiểm tra thực tế và commit. Không ghi hoàn thành cho phần chỉ đề xuất hoặc chưa kiểm tra. Giữ các dòng cũ; chi tiết kỹ thuật nằm trong báo cáo/ADR.

| Ngày | Mã | Nội dung đã sửa | Kiểm tra | Commit |
|---|---|---|---|---|
| 21/11/2026 | RA01 | Chặn ngày bắt đầu đã qua ở cả phát OTP và ký; OTP qua nửa đêm không ký được, giữ nguyên chữ ký cũ. | 56 backend đạt; 4 biên ngày chạy lại đạt; 4 Playwright Owner/Customer desktop/mobile đạt. | `5f5f0082` |
| 21/11/2026 | RA02 | Ký đủ trước ngày thuê: giữ phòng, hiển thị chờ hiệu lực, tự kiểm tra/chuyển đúng ngày; hỗ trợ hủy song phương khi đang chờ. | 73 backend đạt qua các lượt; 165 frontend/TypeScript/build và 4 Playwright desktop/mobile đạt. | `fdc5caa7` |
| 21/11/2026 | RA03 | Chặn điện nước khi hợp đồng chưa bắt đầu hoặc kỳ vượt tháng hiện tại, dùng chung cho chỉ số/tạo/gửi/AI; nháp cũ vẫn hủy được. | 77 backend đạt, 1 scheduler skipped; 4 Playwright desktop/mobile đạt; RENT D-7 giữ nguyên. | `b5d22553` |

## Cần cân nhắc

- RA04: **cần cân nhắc, chưa sửa** — chốt các khoản phải thu trước/sau khi trả phòng.
