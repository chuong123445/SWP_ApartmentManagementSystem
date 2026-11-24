# Tab hợp đồng sau hai chữ ký

24/11/2026 — người dùng yêu cầu hợp đồng chưa đủ chữ ký không xuất hiện ở tab Hợp đồng, xử lý tại Yêu cầu thuê.

Customer request query chỉ loại yêu cầu khi dự thảo có cả ownerSignedAt và customerSignedAt, áp dụng trước paging/count. Chưa ký/mới một bên ký vẫn có contractId để xem/ký; không xóa request. Backend API draft/get/PDF vẫn riêng tư đúng hai bên và giữ đọc bản chưa ký để luồng ký hoạt động.

ContractDraftList của Owner/Customer lọc bằng cả hai timestamp, không chỉ ACTIVE hay nhãn SIGNED. Vì vậy hợp đồng đủ chữ ký còn chờ ngày bắt đầu cũng hiển thị. Customer requests có sẵn nút xem/ký, giữ lại một nút (không thêm trùng); dự thảo hủy có nhãn lịch sử. Trang chi tiết chưa đủ chữ ký quay về yêu cầu thuê. Danh sách legacy loại tất cả documentIDs đã đọc, tránh lọt bản chưa ký qua fallback. Hồ sơ quan hệ thuê cũ không có document vẫn giữ mục lịch sử riêng cho ACTIVE/ENDED; không tự tạo chữ ký hay ghi lại snapshot. Hai fixture26/29 đã được read-only xác nhận có đủ timestamps, không đổi dữ liệu.

Owner queue đã có completed=false/true dựa trên hai timestamp; không thay nhận/từ chối/OTP/activation/hủy hay luồng thuê tiếp. Tài liệu draft API vẫn trả bản nháp cho exactparty, bộ lọc ở UI xác định tab trình bày. Không migration/fixture reset.

Kiểm tra:74ContractDraft integrationPASS, gồm pagination3requests trước/sau chữ ký thứ nhất,2 sau chữ ký thứhai và giữ private document/request.175frontend/TypeScript/buildPASS,4MCP1440/390 xOwner/CustomerPASS: có6drafts trộn, Contracts chỉ2đủký; requests giữ3ACCEPTED+cancelledhistorytheophíaserver; customer click xem/ký/back; mô phỏng ký bêncònlại thì futureDRAFT lênContractstab. Không console/page/network unexpected/tràn ngang; mobileảnhđãxem. BrowserAPIfixtures,SQLtest riêng, không thực hiện ký hay đổi dữ liệu ứng dụng thật. Chưa kiểm tra live bằng tài khoản người dùng, cầnrestartbackend/reloadfrontend.
