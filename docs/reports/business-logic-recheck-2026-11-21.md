# Rà soát lại nghiệp vụ, gồm tạo tài sản — 21/11/2026

Source được rà soát: `4e8c809f` trên nhánh `duy/contract-start-today`, sau sửa RA01–RA03. Lượt này chỉ review và tái hiện, chưa sửa runtime. Nhật ký tóm tắt tiếp tục dùng [CHANGELOG_NGHIEP_VU.md](../../CHANGELOG_NGHIEP_VU.md).

## Kết quả cần xử lý

### RA10 — Cao: duyệt quyền tương lai làm mất quyền hiện tại còn hạn

Vị trí: `PropertyDossierService.decide` dòng 89–96 và `PropertyRightsPolicy.requireCurrent` dòng 16–19.

Tái hiện `RightsBusinessAuditTests.audit02FutureRightsRenewalReplacesStillValidCurrentWindow`:

1. Nộp và Admin duyệt quyền SUBLEASE từ hôm nay đến một năm sau; `requireCurrent` thành công.
2. Nộp hồ sơ gia hạn bắt đầu ngày kế tiếp sau hạn cũ, kết thúc một năm tiếp theo. Hồ sơ hợp lệ về thứ tự ngày và khoảng thuê gốc.
3. Admin duyệt ngay hôm nay. API trả 200 và thay `approvedRightsDossierId`, `rightsValidFrom`, `rightsValidUntil` ngay bằng kỳ mới.
4. `requireCurrent` lập tức trả conflict vì ngày bắt đầu quyền mới chưa tới, dù quyền cũ vẫn còn hạn.

Tác động: các lệnh đăng công khai/nhận yêu cầu/chấp nhận/ký phụ thuộc quyền hiện hành bị chặn; truy vấn discovery cũng chỉ biết khoảng quyền mới. Không có mutation vào hợp đồng lịch sử trong test. Đây là mất tính liên tục của quyền đang hiệu lực, không phải đề nghị cho phép thuê ngoài thời hạn.

Hướng sửa: giữ lịch sử các khoảng đã duyệt và chọn khoảng phù hợp theo ngày/thời hạn giao dịch; duyệt trước kỳ mới không hủy quyền cũ. Không chỉ sửa `validFrom` về ngày cũ vì hai giấy tờ có thể có khoảng đứt quãng hoặc phạm vi khác nhau. Cần test biên hết ngày Việt Nam, khoảng liền/đứt, hợp đồng đã ký và hồ sơ bị từ chối.

### RA11 — Trung bình: gửi lại hồ sơ wizard bỏ qua gate giấy tờ mới

Vị trí: `PropertyDossierService.submit` dòng 30–53; đối chiếu `PropertyListingService.finish` dòng 68–81 và `PropertyDocumentGate.require`.

Tái hiện `PropertyBusinessAuditTests.audit01RejectedWizardAcceptsUnscannedReplacement`:

1. Hoàn tất wizard với giấy tờ đã qua gate, tạo đúng một căn nháp và một hồ sơ.
2. Admin trả yêu cầu bổ sung qua API thật.
3. Fixture thêm một tệp RIGHT_DOCUMENT mới thuộc đúng tài sản/người nộp, chưa có `property_document_checks`.
4. POST `/api/v1/me/rental-properties/{id}/verification-dossiers` chọn riêng tệp mới trả 201/PENDING_APPROVAL, tạo hồ sơ thứ hai, vẫn không có kết quả quét.

Các tệp thử được tạo trực tiếp trong transaction test để cô lập gate; đây không phải bằng chứng upload cho phép file binary hỏng. Upload xác minh định dạng và AI xác minh mục giấy tờ là hai bước khác nhau.

Nguyên nhân: submit chỉ từ chối wizard *chưa hoàn tất*. Sau khi completed, lần gửi bổ sung chỉ kiểm tra sở hữu/purpose/số lượng và quyền, không gọi gate như complete. Các API tạo/gửi hồ sơ cũ cũng dùng đường này; chưa chạy test riêng mọi biến thể legacy.

Tác động giới hạn: bỏ qua bước nhận diện giấy tờ đã yêu cầu; **không tự APPROVE**, không tự cấp OWNER và không làm tệp riêng tư thành công khai. Admin vẫn phải đối chiếu.

Hướng sửa: thống nhất kiểm tra giấy tờ được chọn cho hồ sơ thủ công ở lần gửi đầu/gửi lại/gia hạn, xác định rõ ngoại lệ nguồn nhập tin cậy. Không quét lại hoặc sửa hồ sơ lịch sử đã duyệt; không gọi AI khi giữ khóa DB. Nếu chỉ áp dụng gate cho wizard, tối thiểu giữ gate cho mọi lần gửi lại từ chính wizard đó.

### RA12 — Trung bình: bản thuê tiếp có một chữ ký vẫn bị Owner hủy đơn phương

Vị trí: `ContractLifecycleService.cancelRenewal` dòng 119–125; so sánh `SelectionCancellationService.act` dòng 38–48.

Tái hiện `RenewalBusinessAuditTests.audit03OwnerCancelsCustomerSignedRenewalWithoutCustomerAgreement`: tạo thuê tiếp từ hợp đồng cũ đã hết kỳ, Customer ký bằng OTP hợp lệ, Owner chưa ký. Owner gọi cancel-renewal với version mới nhất và consent của chính Owner: API trả 200/ENDED/RENEWAL_CANCELLED, không có phản hồi đồng ý hủy của Customer. Chữ ký Customer vẫn đọc được; không có xóa lịch sử.

Đây là sự khác nhau của quy tắc hủy giữa thuê đầu và thuê tiếp: thuê đầu có bất kỳ chữ ký nào cần hai bên xử lý, thuê tiếp chỉ chặn hủy khi đã đủ hai chữ ký. Không kết luận về hiệu lực pháp lý của một chữ ký từ code. Cần chốt cùng một quy tắc sản phẩm cho các bản đã có chữ ký, rồi tái sử dụng luồng đề nghị/phản hồi và audit; không tự biến consent một bên thành đồng thuận hai bên.

### RA13 — Trung bình: thuê tiếp đã ký đủ, chờ ngày bắt đầu chưa có đường hủy song phương

Vị trí: `ContractLifecycleService.cancelRenewal` dòng 122; `SelectionCancellationService.eligible` dòng 86; `ContractExitService.competing` dòng 126–130; UI `ContractLifecyclePanel` dòng 38/57.

Tái hiện `RenewalBusinessAuditTests.audit04FullySignedWaitingRenewalHasNoSelectionCancellation`: bản thuê tiếp ký đủ giữ DRAFT/SIGNED đến ngày bắt đầu, đúng cơ chế chờ; gọi cancel-renewal bằng **version hiện tại** vẫn trả 409/INVALID_STATE. Test cũ cũng chủ động mong đợi từ chối này, nên đây là thiếu luồng vận hành, không phải hồi quy mới của RA02.

Source cho thấy luồng hủy lựa chọn RA02 chỉ nhận thuê đầu, còn hợp đồng gốc bị chặn kết thúc/bàn giao khi có bản thuê tiếp mở. Chưa chạy riêng command kết thúc hợp đồng gốc trong ca tái hiện này. Nếu hai bên đổi kế hoạch hoặc kích hoạt bị chặn bởi tài khoản/quyền, không có command đồng thuận hủy bản chờ đã ký đủ qua các service đã rà.

Hướng bổ sung cần chốt: cho hai bên đề nghị/chấp thuận hủy thuê tiếp chưa hiệu lực, giữ nguyên hợp đồng cũ và trạng thái đang cư trú, không VACANT hoặc tự giải phóng phòng. Không tái sử dụng nguyên xi kết thúc thuê đầu để vô tình mở phòng đang có người ở.

## Phần đã rà và kết quả hiện tại

| Phạm vi | Kết quả |
|---|---|
| Tạo tài sản/căn | Chủ sở hữu từ tài khoản server, SINGLE_UNIT chỉ một căn, trùng mã/đầu vào sai không để tài sản tạo dở; mới tạo riêng tư, không tự public. Bộ OwnerProperty chạy lại 7 ca đạt. |
| Hồ sơ và Admin | Exact-property/file-purpose/access, version, lock duyệt, chưa duyệt không công khai, approval không tự publish; nhóm quyền/hồ sơ chạy lại. RA10/RA11 ở chuyển bước chưa nhất quán như trên. |
| Wizard và ảnh | Gate giấy tờ bước đầu, resume, phản hồi sai/lỗi provider, thay tệp hợp lệ: 6 Playwright desktop/mobile đạt. Không dùng ảnh giấy tờ làm ảnh quảng cáo. |
| Yêu cầu thuê | Không tự thuê tài sản mình; submit không chiếm phòng; ACCEPT giữ phòng; ownership/version/điều kiện xác thực được kiểm tra; 28 DiscoveryRental + 11 SelectionCancellation chạy lại đạt. Không tự đặt FIFO hoặc reject những người khác. |
| Hợp đồng | Ngày bắt đầu không quá khứ ở create/edit/renew/OTP/sign, ký đủ trước ngày giữ chờ hiệu lực; 60 ContractDraft chạy lại đạt. Chờ hiệu lực thuê đầu có hủy song phương; thuê tiếp còn RA12/RA13. |
| Trả phòng | 18 ContractExit chạy lại đạt; giữ hợp đồng/chữ ký/hóa đơn lịch sử, không tự mở phòng khi còn claim khác. RA04 chưa sửa theo yêu cầu người dùng. |
| Bảo trì | 2 Maintenance chạy lại đạt về quyền tạo/list/ownership. Chưa kiểm thử toàn bộ vòng chi phí, hẹn thợ, nghiệm thu trong lượt này. |
| Hóa đơn/thanh toán | Kết quả lượt chạy bổ sung được ghi ở mục kiểm tra bên dưới. Không coi hóa đơn đã gửi là đã thanh toán; không gọi provider thật. |

## Các quyết định còn mở, không tự thay

- **RA04 vẫn cần cân nhắc**: trả phòng có thể khóa khả năng lập các kỳ cuối chưa có hóa đơn. Việc chuyển kỳ thuê tiếp cũng kết thúc hợp đồng cũ và chuyển baseline từ hóa đơn SENT cuối; source chưa bắt buộc mọi kỳ cũ đã được lập. Phần chuyển kỳ này mới review source, chưa có ca tài chính tái hiện riêng; cần xử lý cùng thiết kế đóng tài chính, không tự chặn trả chìa khóa vì còn nợ.
- RA05 baseline mặc định 0, RA06 áp dụng giá kỳ từ cấu hình, RA07 ngày lẻ/ở quá hạn, RA08 đối chiếu tiền thuê trả trước khi trả sớm, RA09 tổng 0 hoặc lẻ VND: giữ phân loại và giới hạn của [báo cáo trước](real-rental-workflow-audit-2026-11-21.md). Không gọi các quyết định đã cho phép là lỗi mới và không tự thay chính sách tiền.
- Chống trùng giấy chứng nhận hiện dùng toàn bộ tài sản APPROVED, kể cả quyền khai thác hết hạn; đây là phạm vi cần thiết kế khi chuyển người khai thác, chưa kết luận là lỗi đã tái hiện. Không tắt chống trùng để né yêu cầu nghiệp vụ.

## Kiểm tra thực tế và giới hạn

- SQL Server test riêng `ancu_auto_rent_20261114`, Java 21, Boot 4.1.1; không ghi DB ứng dụng `proptech_db`, không reset fixture đang dùng, không SMTP/Gemini/SePay thật.
- Nhóm tài sản: 38 ca đạt (OwnerProperty 7, PropertyApprovalLock 3, PropertyDocumentGate 6, PropertyListing 3, PropertyRightsOnboarding 15, PropertySettings 2, tái hiện RA10/RA11 mỗi mục 1).
- Nhóm thuê: 121 ca đạt (ContractDraft 60, ContractExit 18, DiscoveryRental 28, SelectionCancellation 11, Maintenance 2, tái hiện RA12/RA13 2).
- Nhóm hóa đơn/thanh toán: 78 ca, 77 đạt/1 skipped (Billing 45 gồm 1 skipped, SePay 22, RentSchedule 3, UtilityInvoiceAiService 8). Case skipped có điều kiện ngày thanh toán <=28; ngày test 21/11 cộng 8 thành 29/11 nên assumption không thỏa, không ghi thành PASS.
- Tổng ba lượt: 237 ca, gồm 232 ca hồi quy đạt, 4 ca tái hiện vấn đề đạt và 1 skipped; không phải một lần chạy full-suite. Không có failure/error ở ba lượt cuối.
- Bốn ca tái hiện **mong đợi hành vi đang có vấn đề**, vì vậy PASS nghĩa là tái hiện được, không có nghĩa đã sửa hay nghiệp vụ đó đúng.
- Evidence: `F:/2026/Fa26/DTD/tmp/business-recheck-properties-20261121.log`, `business-recheck-rental-20261121.log`, `business-recheck-billing-20261121.log`; generators `property-business-audit-generate.py`, `renewal-business-audit-generate.py` tạo các lớp tạm từ fixture gốc. Test transaction rollback, các lớp tạm không đưa vào bộ regression để tránh cố định hành vi sai.
- Playwright MCP: 6 ca đạt tại 1440/390 với SPA hiện tại và API fixtures, kiểm tra chặn bước/resume/thay tệp/không tràn ngang, không có page/console error bất ngờ hoặc API route ngoài dự kiến. Đã xem ảnh mobile. Đây không phải UI nối DB/provider thật.
- Lượt browser đầu dùng script cũ chờ thông báo đã đổi nên timeout; dùng scenario từ e2e hiện tại chạy lại cả 6 ca đạt. Không sửa UI để làm test qua. Không chạy lại frontend build/unit vì không thay frontend.
- Context7 đối chiếu transaction/locking Spring Data JPA 4.1.0 gần dependency 4.1.1 của Boot 4.1.1; catalog không có đúng patch. Không lấy annotation hoặc tài liệu làm bằng chứng thay cho kiểm thử SQL.

Không tuyên bố hệ thống đã sẵn sàng phục vụ thật toàn diện. Ưu tiên tiếp theo là RA10 và RA11; RA12/RA13 cần thống nhất quy tắc hủy thuê tiếp. RA04 giữ ở trạng thái cần cân nhắc theo chỉ đạo hiện tại.
