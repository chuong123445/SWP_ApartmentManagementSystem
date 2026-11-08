# AI-04 — Người nộp tự kiểm tra hồ sơ trước khi nộp

Từ form hồ sơ đang nhập, người nộp chọn **Kiểm tra thông tin bản nháp** để nhận checklist trường/chứng từ thiếu; thao tác này không gọi Gemini. Không yêu cầu điền đủ form mới được kiểm tra. Quy tắc validation khi nộp chính thức vẫn giữ nguyên.

**Quét chứng từ bằng AI** chỉ chạy sau checkbox đồng ý gửi các tệp đang chọn và thông tin đối chiếu đến Gemini. Mỗi request quét một tệp đã upload, tối đa 20 tệp/bản nháp, 10 MB/tệp theo adapter hiện có. UI quét tuần tự, hiển thị tiến độ và thành công/tệp lỗi riêng; không có kết luận toàn bộ khi quét thiếu. HTTP nằm ngoài transaction/khóa database. Giới hạn 40 lượt/phút/người nộp (đủ hai batch20), tối đa4 HTTP AI đang chạy chung cùng AI-01; giới hạn theo process. Lỗi/thiếu cấu hình không chặn quy trình nộp thông thường.

## Quyền và nguồn dữ liệu

- Hai namespace `/api/v1/owner/properties/{id}/ai-precheck` và `/api/v1/me/rental-properties/{id}/ai-precheck` dùng cùng service kiểm tra đúng chủ tài sản/người nộp. Customer đã xác thực được kiểm tra hồ sơ onboarding của chính mình, không được cấp OWNER từ thao tác này.
- Không đọc kết quả, reviewReason, quyết định hoặc nhận xét nội bộ Admin. Prompt riêng `owner-precheck-v1` dùng chung HTTP adapter/JSON schema đã kiểm chứng với scanner hiện có; đường gọi Admin và QR giữ prompt cũ.
- Backend kiểm tra propertyVersion, trạng thái còn có thể lập hồ sơ, danh sách ID duy nhất/max20, đúng property/uploader/purpose và file đang nằm trong bản nháp. Không nhận raw attachment/URL/actor từ model. Tệp đã upload không có lệnh cập nhật nội dung; fingerprint gồm draft, các ID/filename/purpose bất biến, phiên bản và trường tài sản/tên pháp lý dùng đối chiếu.
- Checklist/fingerprint được dựng trong transaction đọc ngắn. Trước mỗi tệp yêu cầu sourceHash của lần kiểm tra hiện tại; sau network revalidate tài sản, quyền và sourceHash. 409 không trả kết quả cũ thành thành công.
- Không gửi số căn cước có cấu trúc từ hồ sơ tài khoản vào provider. Khai báo ngân hàng chỉ gửi khi tệp SUPPORTING cần đối chiếu; chứng từ được chọn vẫn có thể chứa thông tin cá nhân và đã được thông báo trước khi đồng ý. Metadata log không ghi raw input/token; kết quả riêng tư được lưu trong bảng audit, không có API public đọc kết quả.

## API

`POST .../{id}/ai-precheck` nhận `{draft, fileId?, sourceHash?, consent?}`. `draft` dùng đúng các field của PropertyDossierSubmit nhưng cho phép thiếu dữ liệu để tạo checklist. Luôn cần propertyVersion/rightType, danh sách ID hợp lệ. Không fileId: trả checklist/files/sourceHash/propertyVersion, không có AI result. Có fileId: yêu cầu consent=true và sourceHash khớp, trả review riêng tệp đã được kiểm tra lại theo schema, runId/model/promptVersion/finishedAt.

`POST .../{id}/ai-precheck/{runId}/acknowledge` nhận `{draft,sourceHash}`. Chỉ ghi đã xem cho run COMPLETED đúng actor/property/source; không thay form, không nộp hồ sơ hoặc duyệt. V58 audit từ AI-01 ghi hash/model/prompt/time/status/error và kết quả/lượt xem; không ghi vào `property_dossier_ai_reviews` dành cho Admin.

## Giao diện và giới hạn

Kết quả thuộc đúng fingerprint form. Đổi thông tin/tệp sẽ bỏ toàn bộ kết quả cũ, hủy request phía client và yêu cầu đồng ý lại; phản hồi về muộn không khôi phục dữ liệu đã cũ. Đọc đủ không đồng nghĩa pháp lý hợp lệ. Các mã giấy chứng nhận/tài khoản/căn cước trích được khác nhau giữa tệp được cảnh báo để đối chiếu bản gốc; không so tên/địa chỉ bằng phép bằng tuyệt đối. Chỉ hiển thị nhận xét cho chính người nộp. Người dùng vẫn chủ động sửa/nộp; backend áp dụng validation chính thức như trước.

Không có queue/recovery cho scan trước nộp: mỗi request có timeout, người dùng chủ động thử lại. Audit RUNNING bị ngắt bởi restart là lượt chưa hoàn tất, không phải kết quả thành công. Không chỉnh sửa lại submission đã nộp hoặc tự phê duyệt tài sản.
