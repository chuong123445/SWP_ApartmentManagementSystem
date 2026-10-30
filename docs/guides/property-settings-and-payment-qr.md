# Cài đặt đơn giá thật và QR nhận tiền

## Chủ nhà sử dụng

1. Vào Cài đặt đơn giá. Chọn một tài sản ở thanh bên để cấu hình riêng cho tài sản đó.
2. Nhập giá điện, nước, internet và vệ sinh/rác. Nhập 0 nếu miễn phí, không để trống. Lưu xong tải lại trang vẫn giữ dữ liệu.
3. Nước chọn Theo m³ hoặc Theo người/tháng. Ví dụ chọn Theo người, nhập 50000; hợp đồng có 2 người thì mỗi kỳ trọn tháng thu 100000 tiền nước.
4. Tạo hợp đồng mới: giá được gợi ý từ cấu hình, kiểm tra cách tính nước, số người và các phí trước khi lưu/ký. Gia hạn giữ thông tin hợp đồng trước để chủ nhà rà soát, không tự thay bằng cấu hình mới.
5. Hóa đơn lấy cách tính và đơn giá từ hợp đồng, rồi lưu bản riêng. Đổi cài đặt không thay giá của hợp đồng đang chạy hoặc hóa đơn đã lập. Muốn đổi số người/cách tính của hợp đồng đã ký phải thống nhất hợp đồng mới; chưa có phụ lục điều chỉnh giữa kỳ.

## QR riêng theo tài khoản chủ nhà

- Khu vực QR dùng chung cho các tài sản của một tài khoản, có thể dùng ngay khi đang chọn Tất cả tài sản.
- Tải ảnh QR chuyển khoản cá nhân từ ứng dụng ngân hàng: PNG/JPEG tối đa 1 MB, ảnh rõ, chỉ một mã, không gắn số tiền cố định. Chưa hỗ trợ QR ví, QR thẻ hoặc QR thanh toán cửa hàng khác chuẩn chuyển khoản tài khoản NAPAS.
- Bấm Quét QR và điền thông tin. Ngân hàng/số tài khoản được giải mã từ QR và kiểm tra CRC; giữ nguyên các số 0 đầu tài khoản.
- Nếu chọn AI, ảnh được gửi tới Gemini bằng cấu hình backend hiện có (DOSSIER_AI_ENABLED, GEMINI_API_KEY, GEMINI_MODEL). AI chỉ gợi ý tên nhìn thấy trên ảnh, không được thay ngân hàng/số tài khoản. Khi không có key, hết hạn mức hoặc không đọc chắc chắn, QR vẫn đọc được ngân hàng/số tài khoản, chủ nhà tự nhập tên.
- Kiểm tra lại ba ô bên trái, sửa tên nếu cần, tích xác nhận rồi bấm Xác nhận và lưu QR. Quét ảnh đơn thuần không thay tài khoản nhận tiền đang dùng. Thông tin gợi ý không phải xác minh chủ sở hữu tài khoản ngân hàng.
- QR đã xác nhận được lưu bất biến; thay QR tạo bản mới. Hợp đồng mới chụp thông tin nhận tiền và ID ảnh QR hiện hành. Hợp đồng/hóa đơn cũ giữ bản đã lưu, không tự chuyển sang tài khoản mới.
- Ảnh chỉ xem được bởi chủ nhà hoặc người thuê của hóa đơn đã gửi tương ứng; không có URL công khai, không cache. Hợp đồng cũ chưa lưu QR không tự nhận QR mới.
- Người thuê mở chi tiết hóa đơn để xem QR. Đây là QR cá nhân không gắn số tiền, nên phải nhập số tiền/nội dung theo hóa đơn và kiểm tra người nhận trong app ngân hàng. Quét QR không tự xác nhận đã thanh toán.

## Dữ liệu và triển khai

- V29 property_settings; V30 cách tính nước; V31 phí hợp đồng/hóa đơn; V32 owner_payment_qrs. Được chạy khi backend khởi động theo cơ chế migration hiện có.
- Phiên bản cài đặt 0 là chưa cấu hình, sau lưu là 1 trở lên. Cập nhật phiên bản cũ trả 409 và giữ nội dung đang nhập để rà soát.
- Hợp đồng/hóa đơn cũ mặc định METERED, phí internet/rác bằng 0. Không tự cộng phí mới vào hóa đơn cũ; mã băm nội dung ký cũ được giữ khi không có khoản mới.
- Tiền xử lý bằng BigDecimal ở backend; giá và số tiền API trả dạng chuỗi thập phân.
- Quy tắc hóa đơn hiện có chỉ hỗ trợ kỳ trọn tháng. Nước theo người là mức thu cố định mỗi người trong kỳ, không tính theo chỉ số m³. Bàn giao không tính thêm chênh lệch đồng hồ nước cho chế độ theo người; tiền nước hàng tháng nằm ở hóa đơn riêng.

## Kiểm tra

- PropertySettingsIntegrationTests: lưu/đọc thật, miễn phí 0, phân quyền, tài sản khác và phiên bản cũ.
- ContractDraftIntegrationTests: gợi ý cấu hình, lưu phí/cách tính trong hợp đồng, PDF/ký/gia hạn/bàn giao; QR trong hóa đơn chỉ đúng người được xem và giữ bản cũ khi đổi QR.
- BillingIntegrationTests: 2 người nhân 50000, cộng internet/rác, bản hóa đơn không đổi theo thay đổi sau đó.
- PaymentQrDecoderTests: ảnh QR thực sinh từ dữ liệu thử, CRC, số 0 đầu, ảnh lỗi và mã có số tiền cố định.
- OwnerPaymentQrIntegrationTests: quét chưa kích hoạt, xác nhận đúng chủ nhà, truy cập ảnh riêng tư, không xác nhận lại bản đã lưu.
- PaymentQrNameReaderTests: AI gợi ý tên; thông tin không khớp, lỗi provider, thiếu cấu hình không ghi nhầm dữ liệu.
- Playwright property-settings/owner-payment-qr/invoices-ui: lưu và tải lại, đổi chế độ nước, quét điền bên trái và xác nhận; màn hình điện thoại không tràn ngang. Các bài UI dùng API giả lập, kiểm tra lưu SQL và phân quyền có bài tích hợp riêng.
- Đã gọi Gemini thật với ảnh QR tổng hợp và tên NGUYEN VAN TEST: trả AI_SUGGESTED, tên đọc đúng. Không dùng ảnh/tài khoản ngân hàng thật của người dùng trong phép thử này.
- Hai bài resident-invoices cũ cần LOCAL_TENANT_* trong .env.local; không chạy được trên cấu hình máy hiện tại do thiếu tài khoản fixture. Không thêm tài khoản hay mật khẩu giả vào dữ liệu đang dùng để ép bài kiểm tra qua.

Tham khảo giải mã QR: [ZXing](https://zxing.github.io/zxing/apidocs/com/google/zxing/multi/qrcode/QRCodeMultiReader.html), [cấu trúc VietQR và CRC trong thư viện nguồn](https://github.com/sunary/vietqr).
