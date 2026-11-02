# Thuê tiếp và bàn giao hợp đồng

Khởi động lại Backend để nạp code và migration V42, sau đó tải lại Frontend. Migration chỉ bổ sung dữ liệu hỗ trợ; không reset tài khoản, căn hộ, hợp đồng hoặc chữ ký mẫu. Không cần chạy lại script tạo HD-4.

## Thông báo trước hạn

Chuông thông báo trong ứng dụng nhắc hai bên trước hạn 20 ngày và 10 ngày. Job chạy sau khoảng một phút khi Backend khởi động, sau đó mỗi giờ; thời gian theo Việt Nam. Nếu ứng dụng ngừng chạy qua một mốc, chỉ gửi mốc hiện tại còn phù hợp, không dồn hai lời nhắc cũ. Không có email/SMS trong phần này.

## Muốn thuê tiếp

1. Tenant mở hợp đồng, nhập lời nhắn nếu cần, xác nhận muốn thuê tiếp và bấm **Gửi yêu cầu thuê tiếp**. Có thể gửi trước ngày hết hạn. Không muốn thuê tiếp thì không cần gửi.
2. Owner mở thông báo hoặc cùng hợp đồng, chọn **Chấp nhận thuê tiếp** hoặc **Từ chối thuê tiếp**. Từ chối phải có lý do; quyết định chưa có nghĩa đã ký hợp đồng.
3. Sau khi chấp nhận, Owner bấm **Tạo hợp đồng ký tiếp**, rà soát ngày/giá/điều khoản rồi tạo bản mới. Hai bên ký lại bằng tài khoản của mình.
4. Nếu ký sớm, bản mới hiện **Đã ký — chờ chuyển kỳ thuê**. Bản cũ vẫn giữ đến hết kỳ. Đến ngày bắt đầu kỳ mới, Backend chuyển kỳ khi đủ điều kiện; nếu còn hóa đơn nháp, vấn đề quyền thuê hoặc tài khoản thì cần xử lý trước. Không tự đặt chỉ số điện/nước bằng 0.

Mỗi hợp đồng có một yêu cầu; gửi lặp không tạo trùng. Yêu cầu từ chối/hủy vẫn lưu và không mở lại bằng nút gửi mới. Khi chưa có bản ký tiếp, Owner có thể **Hủy chấp nhận thuê tiếp**. Nếu đã có bản nháp, dùng **Hủy bản ký tiếp** trước khi đủ hai chữ ký. Không hỗ trợ hủy đơn phương bản đã có đủ hai chữ ký.

## Không thuê tiếp

Đến ngày kết thúc, nếu không có yêu cầu hoặc yêu cầu đã bị từ chối/hủy và không còn hợp đồng ký tiếp đang mở, Owner được **Lập biên bản bàn giao**. Yêu cầu còn chờ phải được xử lý rõ ràng, không tự từ chối vì quá hạn.

Owner nhập ngày trả phòng, số đo thực tế, tình trạng tài sản/chìa khóa và đối soát cọc. Tenant kiểm tra, xác nhận bàn giao trên chính hợp đồng. Chỉ khi đó hợp đồng kết thúc và căn về trống. Biên bản không tự xác nhận đã hoàn cọc hoặc trả hóa đơn.

## Xem lại và dữ liệu mẫu

Hợp đồng đã ký/đã kết thúc có nút **Xem hợp đồng**. Bảng **Quan hệ thuê đã lưu** có **Xem hồ sơ** và phân biệt **Hết hạn — chờ xử lý** với **Đã kết thúc**. Hồ sơ rất cũ không có nội dung gốc chỉ xem được thông tin quan hệ thuê đã lưu, không có PDF/chữ ký tự tạo.

Mẫu hiện có: Hữu Hà (`huuha205@gmail.com`) mở `/contracts/4` để gửi yêu cầu; Owner `owner@ancu.local` mở cùng đường dẫn để xử lý. HD-4 đã hết hạn nên không nhận thông báo 20/10 ngày trong tương lai. Chữ ký sao chép của HD-4 chỉ là mẫu được cho phép trước đây; bản hợp đồng ký tiếp không sao chép chúng. Các kiểm tra của phiên triển khai dùng SQL clone/API browser fixtures, chưa thực hiện quyết định hoặc bàn giao trên mẫu thật này.
