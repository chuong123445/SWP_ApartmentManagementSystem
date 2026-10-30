# Bật AI kiểm tra hồ sơ thủ công

AI đọc thông tin khai báo và từng ảnh/PDF người dùng nộp trong hồ sơ quyền cho thuê. Kết quả chỉ xuất hiện tại trang kiểm duyệt Admin. AI không phê duyệt, từ chối, yêu cầu bổ sung hay thay đổi tài sản tự động.

## API key là gì?

API key là mã để backend kết nối dịch vụ AI, tương tự mật khẩu dành cho ứng dụng. Không dán key vào chat, frontend, thông điệp commit hoặc GitHub. Dự án không kèm key thật và chưa giả lập kết nối AI trong môi trường đang dùng.

## Cấu hình local

1. Đăng nhập [Google AI Studio](https://aistudio.google.com/apikey), chọn tạo API key và sao chép key.
2. Trong AI Studio, chọn model có hỗ trợ ảnh/PDF và structured output; xem mã model mà tài khoản được phép dùng tại [danh sách model](https://ai.google.dev/gemini-api/docs/models). Không cần tự huấn luyện model. Mã model là giá trị cho GEMINI_MODEL, không phải tên project hay project number.
3. Mở file **ancu-proptech-backend/.env.local** trên máy (đã được Git bỏ qua). Thêm/sửa ba dòng, thay phần trong ngoặc bằng giá trị thật, không thêm dấu ngoặc hay dấu nháy:

```dotenv
DOSSIER_AI_ENABLED=true
GEMINI_API_KEY=<key của bạn>
GEMINI_MODEL=<mã model của bạn>
```

4. Khởi động backend bằng `ancu-proptech-backend/tools/start-local.ps1` để script nạp `.env.local`. Nếu chạy trực tiếp bằng IDE/Maven, cần đặt ba biến trong môi trường chạy của backend; Maven thông thường không tự nạp `.env.local`. Không sao chép key vào application.properties đã được Git theo dõi.
5. Người dùng gửi hồ sơ như cũ. Sau khi transaction nộp hồ sơ thành công, worker tự lấy hồ sơ trong hàng quét. Admin mở **Kiểm duyệt tài sản → chọn hồ sơ → AI hỗ trợ kiểm tra hồ sơ**. Hồ sơ đang chờ kết nối từ trước cũng được quét khi bật dịch vụ.

Mỗi tệp được gửi một lần trong một lượt quét, tối đa 20 tệp, 10 MB/tệp theo giới hạn upload đang có. Nếu dịch vụ giới hạn lượt gọi hoặc tạm lỗi, hệ thống thử lại tối đa ba lần, có thời gian chờ. Key thiếu, model chưa cấu hình hoặc tính năng chưa bật hiển thị “Chưa kết nối AI”, không hiển thị kết quả hợp lệ giả. Đặt DOSSIER_AI_ENABLED=false và khởi động lại backend để ngừng gửi hồ sơ mới sang AI.

## Cách kiểm thử chức năng

- Nộp bộ giấy tờ đủ và đọc rõ: AI có thể trả “Chưa phát hiện bất thường”. Admin vẫn cần đối chiếu bản gốc và tự bấm quyết định.
- Khai tên/số giấy chứng nhận khác nội dung ảnh: nhận xét nêu trường đã khai và giá trị đọc từ tệp.
- Tệp mờ, thiếu trang/mặt cần thiết: AI nêu thiếu ảnh, chưa đọc rõ hoặc chưa đủ cơ sở. AI không chứng minh giấy tờ thật/giả hay xác nhận quyền sở hữu hợp pháp.
- Form vẫn kiểm tra các trường/tệp bắt buộc trước khi cho nộp; AI không thay validation của hệ thống.
- Tắt cấu hình AI hoặc mô phỏng lỗi dịch vụ: hồ sơ vẫn được lưu, Admin vẫn có thể phê duyệt/từ chối thủ công.
- Thử dùng tài khoản Owner/Customer gọi API kết quả AI: bị từ chối quyền; không đọc được nhận xét Admin.

Hồ sơ nộp trước tính năng này không được gửi hàng loạt sang AI. Admin có thể bấm “Quét hồ sơ bằng AI” cho từng hồ sơ cũ. Ảnh chụp kết quả Playwright và HTTP server trong kiểm thử đều dùng dữ liệu mô phỏng; không phải bằng chứng đã gọi dịch vụ Gemini thật.

## Thiết kế và quyền hạn

- Bảng property_dossier_ai_reviews tách riêng với trạng thái property_dossiers. Worker không có repository sửa hồ sơ/tài sản.
- Khi nộp, chụp các trường và danh sách tệp cùng SHA-256. Worker kiểm tra hash trước khi đọc; không dùng nội dung bị thay thế để kết luận cho hồ sơ gốc.
- Không giữ transaction database trong thời gian gọi AI. Lượt quét có token để kết quả cũ không ghi đè lượt mới; tự phục hồi lượt bị gián đoạn quá 30 phút. Scheduler AI tách với lịch công việc khác.
- Lưu model, phiên bản prompt, thời gian, số lần xử lý và mã lỗi đã làm sạch. Không lưu key hoặc lỗi thô từ nhà cung cấp.
- GET /api/v1/admin/property-dossiers/{id}/ai-review chỉ cho ADMIN. POST cùng đường dẫn /retry nhận version để quét lại. Các API quyết định duyệt giữ nguyên và không bị kết quả AI khóa.
- Nhà cung cấp nhận các trường trong snapshot và tệp chứng từ của hồ sơ được quét; không gửi mật khẩu, token đăng nhập, lịch sử hóa đơn hoặc dữ liệu hồ sơ khác. Form nộp thông báo việc sử dụng dịch vụ AI khi cấu hình được bật.

Tham khảo giao thức: [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [xử lý PDF](https://ai.google.dev/gemini-api/docs/document-processing).
