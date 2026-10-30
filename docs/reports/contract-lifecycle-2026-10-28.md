# Ký tiếp và bàn giao khi hết hạn

Trong Hợp đồng, mở Xem PDF / Ký của hợp đồng đã hết hạn. Phần cuối hiển thị hai hướng xử lý cho chủ nhà.

- Ký tiếp: tạo bản hợp đồng mới liên kết bản cũ, rà soát ngày thuê và điều khoản, xuất PDF và ký lại bằng hai tài khoản. Bản cũ chỉ kết thúc khi bản mới đủ chữ ký; khách tiếp tục nằm trong danh sách thuê và lập hóa đơn theo hợp đồng mới. Không sao chép chữ ký cũ. Có thể hủy bản ký tiếp chưa hoàn tất, giữ lịch sử.
- Bàn giao: chủ nhà ghi ngày trả, chỉ số điện nước thực tế, tình trạng phòng, chìa khóa và khoản khấu trừ. Khách mở cùng hợp đồng bằng tài khoản của mình, kiểm tra và xác nhận. Khi đó hợp đồng kết thúc, phòng trống và chỉ số cuối được lưu cho lần thuê sau. Hóa đơn và chữ ký cũ không bị xóa.

Không đồng thời mở bản ký tiếp và đề nghị bàn giao. Kiểm tra quyền, phiên bản dữ liệu và khóa giao dịch ở backend. Hóa đơn nháp phải xử lý trước khi kết thúc thuê. Tiền cọc dự kiến hoàn trừ điện nước chưa nằm trong hóa đơn đã gửi và khoản khấu trừ; đây là đối soát, không tự ghi nhận giao dịch thu/hoàn tiền hoặc trả hóa đơn.

Migration V21 bổ sung liên kết hợp đồng ký tiếp và bảng lưu bàn giao. Kiểm thử tích hợp dùng database bản sao `ancu_identity_verify_20261028141004`, không ký hoặc bàn giao dữ liệu kinh doanh thật.
