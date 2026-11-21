# Rà soát quy trình thuê và quản lý căn hộ ngày 21 tháng 11 năm 2026

Hệ thống đã chặn ngày bắt đầu quá khứ khi tạo, sửa và soạn thuê tiếp, nhưng chưa bảo đảm nhất quán toàn bộ vòng đời thực tế. Bốn điểm cần ưu tiên là ký muộn trên bản nháp cũ, đánh dấu cư trú trước ngày bắt đầu, lập điện nước cho kỳ tương lai, và đóng hồ sơ trước khi hoàn tất ghi nhận khoản phải thu. Đây là kết quả rà soát, không phải tuyên bố các điểm hở đã được sửa.

## Phạm vi và GitHub

- Source được rà soát: `1f8297905786c713cbe6ea4a494608a8e345a228`, nhánh local báo `duy/contract-start-today`; ref được Git lưu với chữ hoa `Duy`. Đã dùng `HEAD:refs/heads/duy/contract-start-today` để push đúng source.
- Đã push và `git ls-remote` xác nhận nhánh GitHub `duy/contract-start-today` ở đúng hash trên. Không merge main. Lệnh push đầu dùng tên nhánh viết thường không resolve được do casing trên Windows; không có thay đổi lịch sử hoặc force push.
- Đọc Controller/Service/Repository và kiểm tra trên SQL Server test `ancu_auto_rent_20261114`. Không ghi DB ứng dụng, đổi fixtures đang sử dụng, gọi nhà cung cấp thật hoặc tái tạo lịch sử.
- Review tập trung vào yêu cầu thuê, bản nháp, ký, hiệu lực và cư trú, tiền thuê/điện nước, thanh toán, thuê tiếp, trả phòng. Không phải kiểm toán pháp lý, pentest đầy đủ hoặc chứng nhận triển khai production.

## Phát hiện ưu tiên

### RA01 Cao Bản nháp cũ vẫn ký được sau ngày bắt đầu

`ContractDraftService.validateTerms` (dòng 236) kiểm tra startDate >= hôm nay khi tạo/sửa/soạn thuê tiếp. `requestSignatureOtp` (142) và `sign` (159) không kiểm tra lại giới hạn đó; dòng 189 chỉ từ chối khi endDate đã qua.

Tái hiện AUDIT02: tạo bản nháp hợp lệ, mô phỏng thời gian đã trôi bằng cách cho startDate/createdAt của bản nháp chưa ký về hôm qua trong fixture test; đọc lại hash và ký bằng đúng hai tài khoản/OTP. Cả hai lệnh thành công, hợp đồng ACTIVE với startDate trước hôm nay. Đây không phải POST tạo hợp đồng quá khứ vượt qua kiểm tra; đó là lỗ hổng ở chuyển bước ký sau khi bản nháp đã cũ.

Cần chặn tại bước phát OTP và tại transaction ký thực tế, kể cả qua nửa đêm. Nháp chưa có chữ ký có thể sửa ngày rồi xem/ký lại. Nháp có một chữ ký đã khóa nội dung, nên phải có luồng hủy/thỏa thuận lập bản thay thế giữ lịch sử; không âm thầm sửa tài liệu đã ký. Giữ nguyên hợp đồng lịch sử đã có hiệu lực.

### RA02 Cao Đủ chữ ký của hợp đồng thuê đầu lập tức đánh dấu OCCUPIED dù ngày bắt đầu còn xa

`ContractDraftService.sign` dòng 219/226 chuyển ACTIVE/OCCUPIED ngay sau chữ ký thứ hai, không so sánh startDate với hôm nay. Thuê tiếp có cơ chế chờ ngày bắt đầu trong `ContractRenewalActivationService`, nhưng thuê đầu không có.

Tái hiện AUDIT03: tạo hợp đồng bắt đầu ngày đầu tháng sau nữa, ký bằng hai bên. Phòng thành OCCUPIED ngay. Bước chỉ một chữ ký vẫn CONTRACT_IN_PROGRESS, đúng như yêu cầu giữ phòng. Đây là lỗi trạng thái/khả năng thao tác của phần mềm; test không chứng minh có người thực sự nhận chìa khóa hoặc dọn vào ở.

Ngoài ra, API exit không cho đề nghị kết thúc/bàn giao trước startDate; SelectionCancellationService chỉ nhận thuê đầu còn DRAFT và chưa đủ hai chữ ký. Vì vậy hợp đồng tương lai đã ký đủ không có luồng hủy song phương trước ngày thuê trong các command đã đọc.

Cần tách rõ đã ký, chờ hiệu lực và đã nhận phòng; giữ reservation để không cho người khác thuê. Một phương án phù hợp vận hành là chỉ ghi nhận cư trú sau khi đủ hai chữ ký, đến ngày bắt đầu và xác nhận bàn giao nhận phòng. Việc thêm bước nhận phòng hay tự chuyển vào ngày bắt đầu là quyết định nghiệp vụ cần chốt; chưa tự thêm trạng thái hoặc tự kích hoạt.

### RA03 Cao Có thể gửi điện nước cho kỳ chưa xảy ra

`InvoiceService.sourceAfterSent` dòng 223 chỉ đòi ACTIVE, chọn kỳ kế tiếp và kiểm tra kết thúc kỳ trong hợp đồng. Không có giới hạn kỳ theo ngày hiện tại. `create/send` không bổ sung kiểm tra ngày chốt công tơ thực tế.

Tái hiện AUDIT04: hợp đồng bắt đầu 01/2027 được ký trước ngày thuê; Owner lập và gửi UTILITY cho 01/2027 ngay trong ngày 21/11/2026. API trả SENT, dù chưa có tiêu thụ của kỳ đó. Không có baseline thì đường này dùng0 theo fallback hiện tại.

Cần quy tắc thời điểm chốt và khoảng tiêu thụ không vượt ngày chốt thực tế, cùng mốc nhận phòng đã xác nhận. Áp dụng cùng rule cho saved meter readings, tạo trực tiếp, AI suggestion được áp dụng và gửi hóa đơn. Không chặn nhầm tiền thuê trả trước hợp lệ: RENT theo cửa sổ D-7 đã được người dùng chấp thuận và khác UTILITY.

### RA04 Cao Có thể đóng hợp đồng khi chưa lập các khoản phải thu rồi mất khả năng lập qua Invoice API

`ContractExitService.requireNoDraft` dòng 128 chỉ chặn hóa đơn DRAFT đang tồn tại, không kiểm tra các kỳ chưa lập. Ký bàn giao lần hai chuyển ENDED/VACANT ở dòng 181. Sau đó `InvoiceService.sourceAfterSent` và `rentContext` chỉ nhận ACTIVE, nên không thể lập tiếp RENT/UTILITY của hợp đồng đó.

Tái hiện AUDIT05 chạy trọn command: thỏa thuận kết thúc sớm → lập biên bản có công tơ → hai bên ký. Hợp đồng ENDED/phòng VACANT dù có 0 hóa đơn; cả billing-context và rent-billing-context sau đó trả409 INVALID_STATE. Số utilityAmount trong biên bản không tự trở thành hóa đơn. Phiếu thu bổ sung độc lập không thay thế kiểm soát kỳ/chuỗi/số tiền của Invoice API.

Cần chốt khoản phải thu đến ngày trả thực tế trước khi khóa sổ, hoặc tách đóng cư trú khỏi khóa tài chính để tiếp tục lập chứng từ cuối kỳ trong phạm vi ngày đã chốt. Không đồng nhất việc lập đủ khoản phải thu với phải thu đủ tiền: công nợ SENT có thể còn sau trả phòng và không được xóa. Không tự thu phạt, cọc hoặc hoàn tiền.

## Quy tắc cần làm rõ cho vận hành thật

| Mục | Quan sát hiện tại | Hướng cần chốt |
|---|---|---|
| RA05 Mốc công tơ thiếu | InvoiceService dòng 228 mặc định0 khi thiếu baseline, trong khi bàn giao yêu cầu mốc đã đối chiếu. Fallback0 được người dùng cho phép ngày 04/11, không phải lỗi mới tự suy diễn từ tài liệu cũ. | Với phòng đã từng có người ở, không biết số đầu không đồng nghĩa0. Nên thu thập và xác nhận mốc nhận phòng; xử lý dữ liệu thiếu bằng thủ tục đối chiếu có lưu lịch sử. Cần quyết định thay thế chính sách cũ trước khi sửa. |
| RA06 Đổi giá một kỳ | `saveReadings` dòng 71 cho Owner chọn applyPropertyRates và chụp giá/cách tính nước/phí hiện tại vào kỳ, dù hợp đồng đã ký dùng giá khác. METER_BILLING_FLOW mô tả chức năng này; hướng dẫn property-settings lại nhấn mạnh không thay điều khoản hợp đồng đang chạy. | Chốt điều kiện được đổi giá, sự đồng ý/phụ lục và ngày hiệu lực; không coi version cấu hình là sự chấp thuận của người thuê. Chưa kết luận Owner luôn sửa sai vì hợp đồng có thể có thỏa thuận thay giá, nhưng code chưa mô hình hóa thỏa thuận đó. |
| RA07 Ngày lẻ và quá hạn | RENT chỉ thu tháng dương lịch tròn; ngày lẻ do hai bên xử lý riêng. Hợp đồng hết hạn vẫn giữ người ở cho đến bàn giao, không tự mở phòng cho thuê lại. Đây là chủ trương đã được chọn. | Cần checklist/chứng từ đối chiếu ngày lẻ và thời gian ở quá hạn. Không dựng hợp đồng lùi ngày để lấp khoảng trống, không tự thêm tiền phạt/FIFO/thời gian tự trả phòng. |
| RA08 Trả sớm sau thu nhiều tháng | Biên bản kết thúc giữ nguyên hóa đơn SENT/coverage và các bản ký; chưa có credit note/điều chỉnh tiền thuê đã trả hoặc luồng hoàn tiền thuê. | Chốt cách đối chiếu khoản chưa sử dụng/khấu trừ/hoàn nếu cần. Không âm thầm sửa hóa đơn đã thanh toán hoặc coi cọc hợp đồng là tiền hệ thống đang giữ. Chưa xác minh report điều chỉnh phân bổ sau trả sớm bằng test riêng. |
| RA09 Hóa đơn 0 hoặc lẻ VND | SepayService dòng 153/156 từ chối hóa đơn lẻ VND hoặc <=0. DTO/pricing/readings cho phép số thập phân; tổng 0có thể tồn tại. Có bảo vệ không gửi ngân hàng số tiền sai, nhưng luồng hoàn tất hóa đơn cần rõ. | Chọn quy tắc làm tròn VND và chứng từ không cần thanh toán trước khi phát hành; không auto-mark paid do người dùng bấm nút. Phát hiện từ source và test fractional có sẵn, chưa tái hiện UI tổng 0trong lượt này. |

## Các chốt đã có và được kiểm tra

- Gửi yêu cầu không đổi trạng thái phòng. Owner chấp nhận khóa phòng và chuyển CONTRACT_IN_PROGRESS; các yêu cầu khác không được tự nhận, tự từ chối hoặc tự chọn FIFO.
- Chỉ tạo bản nháp từ đúng ACCEPTED request, đúng Owner/Customer và không có hợp đồng hiện hành khác. AUDIT01 xác nhận nháp giữ CONTRACT_IN_PROGRESS. Bản nháp không đồng nghĩa được vào ở.
- Hai bên ký bằng đúng tài khoản, phiên bản/hash và OTP gắn hành động; một bên không ký thay bên kia. Nội dung có chữ ký không sửa trực tiếp. Việc ký trong ứng dụng không được tuyên bố thành chữ ký số chứng thư của provider.
- Quyền khai thác tài sản và thời hạn hợp đồng được kiểm tra ở backend, không chỉ dựa UI. Owner không tự thuê căn hộ của mình.
- Hóa đơn tính ở server, version/khóa hợp đồng và uniqueness chống kỳ trùng; SENT mới tới đúng người thuê. SENT khác PAID; webhook cần mã đúng, tài khoản nhận đúng, đúng số tiền, chiều in và chống lặp. Sai/thừa/thiếu tiền không tự xác nhận paid.
- Chỉ đủ hai chữ ký biên bản bàn giao mới ENDED/VACANT; tranh chấp giữ phòng và lịch sử. Hết hạn không tự VACANT khi khách chưa trả phòng. Hóa đơn SENT/công nợ cũ được giữ sau khi trả phòng.
- Thuê tiếp không ghi đè hợp đồng gốc. Hợp đồng thuê tiếp ký trước ngày bắt đầu không kích hoạt sớm; chữ ký/hồ sơ lịch sử được giữ.

## Kiểm tra thực tế và giới hạn

- Hồi quy 7 lớp backend: 176 trường hợp, 175 đạt, 0 lỗi còn lại, 1 skipped. Gồm Billing 42 (41 đạt/1 skipped), SePay 22, ContractDraft 52, ContractExit 18, DiscoveryRental 28, SelectionCancellation 11 và RentSchedule 3. Tổng hợp kết quả từng lớp từ lượt rộng và lượt SePay chạy lại; không tuyên bố một lần chạy cả bộ đều xanh.
- Lượt rộng đầu: 176 chạy, 7 thất bại/1 skipped. Cả 7 thất bại thuộc fixture SePay còn dùng 5.540.000đ của hóa đơn cũ gộp tiền thuê. Hóa đơn UTILITY hiện tại đúng là (1120−1000)×3500+(208−200)×15000=540.000đ. Đã sửa fixture/expected QR và các webhook hợp lệ thành 540.000đ; giữ kiểm tra sai số tiền, tài khoản, chiều tiền, replay và concurrency. Chạy lại riêng 22 test SePay: 22/22 PASS, Maven exit 0. Không thay mã tính tiền hoặc kiểm tra webhook runtime. Commit `eff93ea9` — `fix(payment): cập nhật kiểm thử webhook cho hóa đơn điện nước riêng`.
- Một case scheduler bị skipped do điều kiện có sẵn assumeTrue(due.dayOfMonth<=28); với ngày 21/11 và offset 8, hạn thành 29/11 vượt miền ngày thanh toán 1–28. Các case còn lại của cửa sổ gửi và kiểm tra trực tiếp D-8/D-7 có kết quả trong bộ test; không ghi case skipped thành PASS.
- 5 kiểm thử tái hiện: AUDIT01 xác nhận nháp không tạo cư trú; AUDIT02–05 tái hiện các điểm hở RA01–RA04. BUILD SUCCESS nghĩa là tái hiện đúng hành vi đã mô tả, không có nghĩa các lỗi nghiệp vụ đã được sửa.
- Frontend 164/164 PASS và TypeScript noEmit PASS. Playwright MCP 8/8 PASS tại 1440/390, browser timezone America/Los_Angeles: tạo/sửa chặn hôm qua không gửi request, hôm nay lưu/mở PDF được, lỗi save/PDF retry và stale context. Không có console/network/page error ngoài lỗi 503/409 được chủ đích mô phỏng; không tràn ngang dialog.
- Evidence ngoài Git: tmp/real-workflow-regression-20261121.log; tmp/real-workflow-payments-final-20261121.log; tmp/real-workflow-audit-20261121.log; tmp/real-workflow-fe-20261121.log; tmp/audit-contract-browser-20261121.js. Không live-test Gemini, SePay hoặc SMTP.
- Vite tạm 3197 đã dừng và không còn listener; JVM test kết thúc. Giữ nguyên 3 file VNeID diagnostics chưa track, không sửa RDS/diagrams.

Reproducer được tạo tạm từ fixture kiểm thử sẵn có: `WorkflowAuditReproductionTests#audit01..audit04` và `ExitWorkflowAuditReproductionTests#audit05`. Các assertion đặc tả hành vi có vấn đề để tái hiện, không coi đó là hành vi đúng cần giữ. Các class tạm được xóa khỏi source sau kiểm tra; generator/evidence nằm trong `F:/2026/Fa26/DTD/tmp/audit-workflows-reproduce.py` và `real-workflow-audit-20261121.log`. Transaction test rollback dữ liệu fixture; test concurrency có cleanup riêng trên DB test.

Playwright dùng SPA thật và API fixtures, không phải UI nối DB/provider thật. Không thay runtime business logic trong lượt review này. Không rerun build frontend vì không đổi mã frontend; TypeScript, unit và browser chạy thực tế.

Context7 đã resolve Spring Data JPA và đọc tài liệu transaction/locking 4.1.0 gần với dependency 4.1.1 của Boot 4.1.1; catalog không có đúng patch 4.1.1. Dùng để đối chiếu transaction ở service và khóa repository, không coi annotation là bằng chứng thay cho test SQL. Nguồn chính thức: https://github.com/spring-projects/spring-data-jpa/blob/4.1.0/src/main/antora/modules/ROOT/pages/jpa/transactions.adoc và locking.adoc.

## Thứ tự xử lý đề xuất

1. RA01: kiểm tra lại ngày tại phát OTP/ký; xác định cách xử lý bản đã ký một bên khi ngày hết hợp lệ. Test qua nửa đêm, cả hai thứ tự ký, OTP đã phát trước nửa đêm, không sửa lịch sử.
2. RA02: chốt cách ghi nhận nhận phòng, chờ hiệu lực và hủy song phương trước nhận phòng; giữ khóa phòng xuyên suốt.
3. RA03/RA05: chốt nguồn/mốc đo và ngày được lập điện nước, không mặc định tiêu thụ tương lai.
4. RA04/RA07/RA08: thiết kế checklist cuối kỳ/chứng từ điều chỉnh và khả năng đối chiếu sau trả phòng. Tách cư trú, công nợ và chuyển tiền; không đặt điều kiện phải hết nợ mới được ghi nhận đã trả chìa khóa.
5. RA06/RA09: thống nhất điều chỉnh đơn giá theo thỏa thuận và làm tròn/hoàn tất chứng từ. Giữ thu cọc/hoàn cọc ngoài hệ thống theo quyết định hiện có.

Các bước trên là đề xuất có thể review, chưa phải tính năng đã triển khai. Không thể kết luận hệ thống đã bảo đảm toàn bộ quy trình phục vụ thật khi RA01–RA04 còn mở.
