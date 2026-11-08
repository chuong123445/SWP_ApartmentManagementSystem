# FIX-09 backend — kết thúc sớm và bàn giao cư trú

Nhánh feat/early-termination-handover, bắt đầu từ test/system-improvements-20261108 (0f05e34). Quy tắc được người dùng đồng ý 08/11; FIX-10/11 hoãn, không triển khai thu cọc cho Owner hoặc nền tảng trong unit này.

## Đã triển khai

- ContractExitController/Service/Guard, DTOs, Case/Event/Evidence models và repositories theo layer/domain. API exact-party GET state, POST actions, upload/download private evidence. V60 được đăng ký sau V59; không áp thủ công DB ứng dụng.
- Đề nghị kết thúc sớm có ngày/lý do/căn cứ điều khoản-báo trước/thỏa thuận và khoản phạt đề xuất/bên chịu. Bên còn lại đồng ý/từ chối; người đề nghị rút; không tự xử lý khi không phản hồi, không Admin phân xử.
- Luồng physical handover độc lập bảng đối soát cọc legacy: Owner ghi biên bản/chỉ số/thiết bị/chìa khóa/ảnh → Customer xác nhận hoặc phản hồi bất đồng → Owner sửa bằng bản mới/hủy có lý do. Lưu before/after các vòng, giữ các ảnh đã upload và IDs gắn trong event.
- ACTIVE/OCCUPIED giữ đến xác nhận bàn giao; ENDED/VACANT nguyên tử dưới parent+contract+apartment locks. Source/version, baseline, draft invoice, competing renewal/handover/room claims được kiểm tra. Giữ endDate/chữ ký/hash/snapshot, publication và công nợ SENT. Không thu/phạt/khấu trừ/hoàn cọc hoặc tự nhận yêu cầu thuê khác.
- Guard tích hợp renewal commands/sign/activation và legacy handover; notification event chỉ gửi feed trong ứng dụng cho bên còn lại. Không email/SMS hoặc external provider.

## Kiểm tra thực tế

Maven offline trên DB riêng ancu_settlement_test_20261103: 99 test backend khác nhau PASS qua các lượt: ContractExit13, ContractDraft46, SelectionCancellation10, Billing25, Notification5; 0 failure/error/skipped ở kết quả cuối. Log ngoài Git: tmp/fix09-backend-regression.log và fix09-backend-final.log.

13 ca mới bao gồm exact-party và Admin404; đồng thuận không mở phòng sớm; tiền đề xuất không thành giao dịch; giữ snapshot/chữ ký/cọc ghi trên hợp đồng; giữ nợ và xem invoice sau kết thúc; từ chối/rút/history; bất đồng/sửa biên bản/chống stale consent; khóa renewal; competing renewal; thiếu baseline/nguồn thay đổi; invoiceDRAFT; ảnh sai định dạng/quyền uploader; hết hạn thông thường; thông báo; hai bên gửi đồng thời cùng source chỉ một200/một409. Concurrency fixture commit riêng trên DB test và cleanup đúng IDs; không reset fixture ứng dụng.

Lượt đầu ca số tiền cọc thất bại vì BigDecimal.equals so sánh scale 10000000 với10000000.00; đổi sang compareTo, lượt cuối PASS. Compile/OpenAPI JSON/parser/diff kiểm tra riêng. Context7 transaction/locking đã đối chiếu Spring Data JPA4.1.0 gần dependency4.1.1; không thay dependency.

## Giới hạn

Chưa chạy UI nối DB ứng dụng thật; không chạy provider/khấu trừ/hoàn tiền. Hỗ trợ contract có bản authoring đã lưu, không tạo snapshot cho legacy fixture thiếu bản nội dung. Biên bản tài chính legacy không bị đổi dữ liệu; API cũ vẫn tồn tại và chỉ bị khóa khi exit đang xử lý. Xem ADR contract-exit-v1 và contract-exit.openapi.json; kết quả UI ghi ở báo cáo riêng.
