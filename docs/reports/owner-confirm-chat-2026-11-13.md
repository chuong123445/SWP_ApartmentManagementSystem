# Xác nhận tạo hợp đồng và trợ lý Owner — 13/11/2026

## Xác nhận hợp đồng

Trước đây nút từ bước điều khoản tự lưu ngay, tải PDF và hiện ký. Nay bước cuối rà soát thông tin/điều khoản, không gọi API lưu hoặc PDF trước khi Owner bấm **Xác nhận tạo hợp đồng**. Sửa bản đã lưu dùng **Xác nhận lưu thay đổi**. Chỉ lưu thành công mới mở PDF và phần ký; lỗi lưu hoặc nguồn cũ giữ bước rà soát. Bỏ khung chữ ký minh họa khỏi phần rà soát; giữ luồng ký/OTP/phân quyền backend hiện có. Hợp đồng đã lưu mở lại vẫn xem và ký như trước.

Kiểm tra: TypeScript và 162 frontend unit PASS; 8 Playwright desktop1440/mobile390 PASS gồm tạo/sửa, lỗi lưu503 rồi thử lại, lỗi PDF503 rồi tải lại, nguồn cũ409 chặn lưu. Có kiểm tra không POST/PDF/khung ký trước xác nhận, không tràn ngang và không lỗi console/network ngoài lỗi fixture chủ động. API fixtures, không tạo hợp đồng trong DB ứng dụng.
