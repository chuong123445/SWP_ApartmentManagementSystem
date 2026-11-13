# Hướng dẫn bảo vệ: Luồng lập hóa đơn và thanh toán

> Phạm vi: mã nguồn hiện tại của An Cư PropTech. Tài liệu tập trung vào phần cần demo và giải thích trước hội đồng, không liệt kê các file tài chính/rút tiền không trực tiếp tham gia luồng.

## 1. Tóm tắt kiến trúc để trình bày trong 30 giây

Luồng đi theo các lớp:

`React page/modal` → `frontend service` → `Spring Controller` → `Service nghiệp vụ` → `JPA Repository` → `SQL Server`

- Chủ nhà chọn hợp đồng đang hoạt động, chọn hóa đơn **tiền thuê** hoặc **điện nước/dịch vụ**, nhập dữ liệu và tạo bản nháp.
- Backend tự kiểm tra quyền sở hữu, kỳ hóa đơn, phiên bản dữ liệu, chỉ số công tơ và tự tính tiền; frontend không phải nguồn quyết định số tiền.
- Chủ nhà gửi hóa đơn, trạng thái hóa đơn đổi từ `DRAFT` sang `SENT`; lúc này cư dân mới nhìn thấy và thanh toán được.
- Cư dân yêu cầu tạo QR. Backend cố định số tiền, tài khoản nhận và sinh nội dung chuyển khoản duy nhất `ANCU...` trong bản ghi `InvoicePayment`.
- SePay gọi webhook khi ngân hàng có giao dịch. Backend kiểm tra khóa webhook, tài khoản nhận, nội dung, đúng số tiền và trạng thái hóa đơn rồi mới ghi `paidAt`.
- Giao diện cư dân hỏi lại trạng thái mỗi 10 giây (khi tab đang hiển thị) và chuyển sang **Đã thanh toán** sau khi webhook khớp.

Điểm phải nói chính xác: `RentalInvoice.status` là vòng đời hóa đơn (`DRAFT`, `SENT`, `CANCELLED`), còn đã trả hay chưa được suy ra từ `InvoicePayment.paidAt`. Hai trạng thái này cố ý tách riêng.

## 2. Kịch bản demo đề xuất

### A. Chủ nhà lập và gửi hóa đơn

1. Đăng nhập vai trò chủ nhà, vào **Hóa đơn**.
2. Nhấn **Lập hóa đơn mới**.
3. Chọn loại:
   - `UTILITY`: điện, nước, Internet, vệ sinh/rác.
   - `RENT`: tiền thuê theo chu kỳ hợp đồng.
4. Chọn căn hộ/người thuê có hợp đồng `ACTIVE`.
5. Với `UTILITY`, nhập chỉ số cuối kỳ và hạn đóng. Chỉ số đầu kỳ, đơn giá và kỳ kế tiếp do backend cung cấp.
6. Nhấn **Lưu bản nháp** để minh họa `DRAFT`, hoặc **Lập và gửi** để tạo rồi chuyển sang `SENT`.
7. Có thể mở bản nháp để sửa/hủy/gửi và xem lịch sử thay đổi.

### B. Cư dân thanh toán

1. Đăng nhập cư dân, vào **Hóa đơn của tôi** và chọn hóa đơn chưa thanh toán.
2. Nhấn **Hiển thị QR thanh toán SePay**.
3. Giải thích QR chứa đúng tài khoản nhận, tổng tiền và nội dung duy nhất `ANCU...`.
4. Chuyển khoản đúng số tiền và nội dung.
5. SePay gửi webhook; hệ thống đối soát và ghi `paidAt`.
6. Màn hình tự kiểm tra mỗi 10 giây, hoặc nhấn **Kiểm tra trạng thái thanh toán**, rồi hiển thị **Đã thanh toán qua SePay**.

Nếu demo không có giao dịch ngân hàng thật, phải nói rõ đó là luồng thử/fixture, không gọi dữ liệu mô phỏng là giao dịch thương mại thật.

## 3. Công thức tính hóa đơn

Hàm quyết định là `InvoiceService.calculateAmounts(...)` ở backend:

- Điện tiêu thụ = chỉ số điện cuối − chỉ số điện đầu.
- Tiền điện = điện tiêu thụ × đơn giá điện.
- Nếu nước theo công tơ (`METERED`): nước tiêu thụ = chỉ số cuối − chỉ số đầu.
- Nếu nước theo người (`PER_PERSON`): số lượng nước = số người ở và không yêu cầu nhập chỉ số nước.
- Tiền nước = số lượng nước × đơn giá nước.
- Tổng tiền = tiền thuê + tiền điện + tiền nước + Internet + vệ sinh/rác.

Trong hóa đơn `UTILITY`, `monthlyRent = 0`. Tiền thuê được lập thành hóa đơn `RENT` riêng theo chu kỳ hợp đồng. Đây là chủ đích tách tiền thuê và tiện ích.

## 4. File frontend quan trọng nhất

### 4.1. Lập và quản lý hóa đơn

#### `src/components/billing/CreateInvoiceModal.tsx`

Component chính của phần demo lập hóa đơn.

- `CreateInvoiceModal(...)`: hiển thị form, chỉ cho chọn hợp đồng đang `ACTIVE`, hỗ trợ hai loại `RENT` và `UTILITY`.
- `useEffect` theo `contractId/kind`: gọi `getRentBillingContext` hoặc `getBillingContext`; nạp kỳ kế tiếp, chỉ số đầu, đơn giá, chỉ số đã chốt và hạn đóng.
- `save(send)`: kiểm tra form và chống nhấn lặp bằng `submitting`; tạo bản nháp. Nếu `send=true`, gọi tiếp API gửi hóa đơn.
  - Nhánh `RENT`: gọi `createRentInvoice`, sau đó có thể gọi `sendInvoice`.
  - Nhánh `UTILITY`: nếu người dùng sửa chỉ số đã chốt thì gọi `saveMeterReadings` nhưng giữ đơn giá đã chốt; tiếp theo gọi `createInvoice`, rồi tùy chọn `sendInvoice`.

#### `src/pages/owner/billing/InvoicesPage.tsx`

Trang danh sách của chủ nhà.

- `InvoicesPage(...)`: hiển thị danh sách, tìm kiếm, số bản nháp, số đã thanh toán, phân trang và nút lập mới.
- `send(id)`: gọi callback gửi hóa đơn, quản lý trạng thái đang gửi và lỗi trên UI.
- `dateLabel(date)`: định dạng ngày ISO sang `dd/mm/yyyy`.

#### `src/components/billing/InvoiceDraftModal.tsx`

Quản lý hóa đơn nháp đã tạo.

- `InvoiceDraftModal(...)`: tải chi tiết và lịch sử hóa đơn; cho sửa, hủy hoặc gửi nếu còn `DRAFT`.
- `save(cancel)`: nếu hủy thì gọi `cancelInvoiceDraft`; nếu sửa thì gọi `updateInvoiceDraft`; luôn gửi `version`, `billingVersion` và lý do để kiểm soát xung đột/audit.
- `editable`: chỉ đúng khi hóa đơn là `DRAFT` và có phiên bản chuỗi tính tiền hợp lệ.

#### `src/services/billing/billingService.ts`

Lớp gọi API hóa đơn của frontend.

- `request<T>(url, body, method)`: wrapper cho `apiFetch`, parse lỗi API và JSON.
- `ownerTenancies()`: lấy hợp đồng của chủ nhà để chọn khi lập hóa đơn.
- `getBillingContext(id)`: lấy bối cảnh hóa đơn tiện ích.
- `saveMeterReadings(id, input)`: chốt/cập nhật chỉ số công tơ.
- `createInvoice(id, input)`: tạo hóa đơn `UTILITY` dạng nháp.
- `getRentBillingContext(id)`: lấy kỳ, số tháng và số tiền thuê kế tiếp.
- `createRentInvoice(id, input)`: tạo hóa đơn `RENT` dạng nháp.
- `sendInvoice(id, version)`: gửi hóa đơn nháp cho cư dân.
- `getInvoice(id)`: lấy chi tiết hóa đơn nếu người dùng có quyền.
- `ownerInvoices(...)`: lấy lịch sử hóa đơn của chủ nhà, có lọc trạng thái.
- `myInvoices(...)`: lấy các hóa đơn `SENT` của cư dân, có lọc đã/chưa trả.
- `updateInvoiceDraft(...)`, `cancelInvoiceDraft(...)`, `invoiceHistory(...)`: sửa, hủy và đọc audit của bản nháp.
- `invoiceView(i)`: đổi DTO API sang model hiển thị cũ của workspace.
- `tenancyViews(items)`: đổi danh sách quan hệ thuê sang dữ liệu hợp đồng/người thuê cho UI.
- `billingMoney(value)`: định dạng chuỗi số tiền thành VND mà không dùng số thực để tính nghiệp vụ.

#### `src/hooks/useRentalWorkspace.ts`

- `handleCreateInvoice(invoice)`: cập nhật danh sách trên workspace sau khi tạo/sửa/gửi.
- `handleSendInvoice(id)`: tìm `version` hiện tại rồi gọi `sendInvoice`, tránh gửi bằng dữ liệu cũ.

#### `src/hooks/useOwnerInvoiceHistory.ts`

- `useOwnerInvoiceHistory(...)`: tải song song hóa đơn định kỳ và khoản thu bổ sung; quản lý bộ lọc, phân trang, reload và lỗi từng nguồn.
- `changeFilter(value)`: đổi bộ lọc và đưa cả hai danh sách về trang đầu.

#### `src/types/billing.ts`

Khai báo kiểu dữ liệu frontend: `Tenancy`, `BillingContext`, `RentBillingContext`, `BillingInvoice`, `InvoiceCreate`, `InvoiceDraftUpdate`, `InvoiceHistoryEntry`. File này không xử lý nghiệp vụ nhưng là “hợp đồng kiểu dữ liệu” giữa component và service.

### 4.2. Cư dân xem và thanh toán

#### `src/pages/customer/MyInvoicesPage.tsx`

- `MyInvoicesPage()`: trang danh sách hóa đơn của cư dân; mặc định lọc `UNPAID`, cho chuyển giữa chưa trả/đã trả/tất cả.
- `refresh()`: tải lại cả hóa đơn chuẩn và khoản thu bổ sung.

#### `src/hooks/useTenantInvoices.ts`

- `useTenantInvoices(enabled, paymentStatus)`: tải danh sách hóa đơn theo trang và trạng thái thanh toán, hủy request cũ bằng `AbortController` và hỗ trợ `reload()`.

#### `src/pages/customer/InvoiceDetailPage.tsx`

- `InvoiceDetailPage({ additional })`: tải chi tiết hóa đơn thường hoặc khoản thu bổ sung; chỉ gắn panel thanh toán khi hóa đơn thường đã `SENT`.

#### `src/components/billing/InvoiceBreakdown.tsx`

- `InvoiceBreakdown(...)`: trình bày chi tiết loại hóa đơn, kỳ tính, chỉ số, đơn giá, từng thành tiền và tổng tiền. Đây chỉ là lớp hiển thị, không tự tính số tiền quyết định.

#### `src/components/billing/InvoicePaymentPanel.tsx`

Component quan trọng nhất của phần demo thanh toán.

- `InvoicePaymentPanel(...)`: tải và trình bày `UNPAID`, `PAID`, `NOT_CONFIGURED` hoặc `PLATFORM_UNAVAILABLE`; hiển thị ngân hàng, tài khoản, nội dung và QR.
- `refresh()` bên trong `useEffect`: gọi `GET /invoices/{id}/payment`; tự chạy lại mỗi 10 giây khi tab đang hiển thị; dọn timer và hủy request khi unmount.
- `generate()`: chỉ cư dân của hợp đồng mới được gọi `POST /invoices/{id}/payment` để backend tạo thông tin/QR thanh toán.

#### `src/components/billing/InvoicePaymentInfo.tsx`

- `InvoicePaymentInfo(...)`: phương án hiển thị thông tin tài khoản nhận đã chốt trong hợp đồng khi kết nối SePay riêng chưa được cấu hình. Không tự đánh dấu hóa đơn đã trả.

#### `src/services/payment/sepayService.ts`

- `paymentApi<T>(path, method, body, signal)`: wrapper gọi `/api/v1/...`, bật `no-store`, parse lỗi và JSON.
- `SepayConfig`, `SepayEvent`, `InvoicePayment`, `TestReceipt`, `TestRecipient`: các kiểu dữ liệu thanh toán phía frontend.

#### `src/routes/AppRoutes.tsx` và `src/routes/WorkspaceRoutes.tsx`

- Khai báo đường dẫn trang hóa đơn cư dân, chi tiết hóa đơn và gắn trang hóa đơn chủ nhà vào workspace.
- `RequireAccount role="CUSTOMER"` bảo vệ route cư dân ở frontend; backend vẫn kiểm tra quyền độc lập.

## 5. File backend quan trọng nhất

### 5.1. API và nghiệp vụ hóa đơn

#### `controller/billing/InvoiceController.java`

Controller mỏng: nhận HTTP, validate DTO, chuyển cho `InvoiceService`.

- `rentContext(...)`: `GET .../rent-billing-context`, lấy kỳ tiền thuê kế tiếp.
- `createRent(...)`: `POST .../rent-invoices`, tạo hóa đơn tiền thuê.
- `context(...)`: `GET .../billing-context`, lấy dữ liệu lập hóa đơn tiện ích.
- `readings(...)`: `POST .../meter-readings`, lưu chỉ số công tơ.
- `create(...)`: `POST .../invoices`, tạo hóa đơn tiện ích và trả HTTP `201 Created`.
- `send(...)`: gửi bản nháp.
- `update(...)`, `cancel(...)`, `history(...)`: sửa, hủy và lấy audit.
- `owner(...)`: danh sách hóa đơn của chủ nhà.
- `mine(...)`: chỉ trả hóa đơn `SENT` thuộc cư dân hiện tại.
- `detail(...)`: chi tiết hóa đơn có kiểm tra người sở hữu/người thuê.

#### `service/billing/InvoiceService.java`

Đây là file cần đọc kỹ nhất vì chứa luật nghiệp vụ và công thức.

- `context(jwt, id)`: xác thực chủ nhà, kiểm tra hợp đồng thuộc họ rồi dựng `BillingContext`.
- `billingContext(contract)`: tìm kỳ/chỉ số đầu, chỉ số đã chốt, đơn giá hợp đồng và đơn giá mặc định của tài sản.
- `estimate(...)`: tạo bản tính thử từ chỉ số đã chốt.
- `calculateAmounts(invoice)`: tính lượng điện/nước, thành tiền và tổng hóa đơn.
- `saveReadings(...)`: khóa hợp đồng, kiểm tra `billingVersion`, kỳ kế tiếp, đơn giá và chỉ số không giảm; lưu `MeterReading` rồi tăng phiên bản.
- `create(...)`: tạo hóa đơn tiện ích. Chống trùng kỳ, kiểm tra dữ liệu cũ, kỳ tuần tự, hạn đóng và chỉ số; backend tự tính tiền và lưu `DRAFT`.
- `send(...)`: khóa chuỗi dữ liệu, kiểm tra quyền, trạng thái, `version`, hợp đồng `ACTIVE` và nguồn chỉ số trước khi gửi.
- `sendLocked(...)`: đổi sang `SENT`, tạo `InvoiceNotification`, tăng `billingVersion` và ghi audit.
- `updateDraft(...)`: chỉ sửa `DRAFT`; kiểm tra hai phiên bản, thứ tự kỳ, lý do; tính lại tiền và đồng bộ chỉ số.
- `cancel(...)`: chỉ hủy `DRAFT`; có tính idempotent nếu lặp đúng cùng thao tác/lý do; ghi audit.
- `history(...)`: đọc các snapshot trước/sau trong `InvoiceEvent`.
- `owner(...)`: truy vấn hóa đơn theo chủ nhà/tài sản/bộ lọc.
- `mine(...)`: chỉ lấy `SENT` của cư dân hiện tại và lọc theo có/không có `paidAt`.
- `detail(...)`: chỉ chủ nhà hoặc người thuê của hợp đồng được xem; cư dân không xem được bản nháp.
- `source(...)`, `sourceAfterSent(...)`, `expectedSource(...)`: xác định kỳ và chỉ số nối tiếp; ngăn sửa/gửi làm đứt chuỗi hóa đơn.
- `rentContext(...)`: tính chu kỳ tiền thuê kế tiếp, khoảng bao phủ, tổng tiền và bản nháp đã tồn tại.
- `createRent(...)`, `createRentLocked(...)`: tạo hóa đơn tiền thuê theo số tháng và đơn giá hợp đồng.
- `scheduledRentContracts()`, `prepareScheduledRent(...)`: hỗ trợ tự tạo/tự gửi hóa đơn thuê theo cài đặt.
- `audit(...)`: lưu hành động `CREATED/UPDATED/CANCELLED/SENT` cùng JSON trước/sau.
- `response(...)`: map entity thành DTO và bổ sung `paymentStatus` từ `InvoicePayment.paidAt`.

#### `service/billing/RentInvoiceScheduler.java`

- `prepare()`: tác vụ định kỳ lấy các hợp đồng cần lập tiền thuê và gọi `prepareScheduledRent`; lỗi một hợp đồng không làm dừng toàn bộ lượt chạy.

### 5.2. API và nghiệp vụ thanh toán SePay

#### `controller/payment/SepayController.java`

- `status(...)`: `GET /api/v1/invoices/{id}/payment`, đọc trạng thái/thông tin thanh toán.
- `payment(...)`: `POST /api/v1/invoices/{id}/payment`, tạo bản ghi thanh toán và QR cho chính cư dân.
- `webhook(...)`: endpoint công khai cho máy chủ SePay; chuyển việc xác thực/đối soát cho service.
- `config(...)`, `configure(...)`, `enabled(...)`, `rotate(...)`: đọc, thiết lập, bật/tắt và đổi khóa webhook.
- `banks(...)`, `vas(...)`: lấy tài khoản ngân hàng/virtual account từ SePay.
- `events(...)`: lịch sử 20 webhook gần nhất.
- Các hàm `createTest`, `testHistory`, `tenantTestHistory`, `...Detail`: phục vụ khoản thanh toán thử/bổ sung, không phải hóa đơn thuê chuẩn.

#### `service/payment/SepayService.java`

File quan trọng thứ hai sau `InvoiceService`.

- `status(jwt, invoiceId)`: kiểm tra người xem có quyền và hóa đơn đã gửi; trả `PAID` nếu có `paidAt`, nếu chưa thì trả trạng thái khả dụng của nguồn thu.
- `payment(jwt, invoiceId)`: chỉ cho đúng cư dân của hợp đồng tạo thanh toán; khóa dữ liệu để chống tạo trùng; kiểm tra kết nối, URL HTTPS, tài khoản nhận khớp hợp đồng, số tiền VND nguyên và lớn hơn 0; sinh mã duy nhất `ANCU...` và lưu snapshot thông tin nhận tiền.
- `visible(...)`: chỉ chủ nhà hoặc cư dân liên quan được xem, và chỉ xử lý thanh toán cho hóa đơn `SENT`.
- `collectionSource(...)`: chọn nguồn thu của chủ nhà hoặc tài khoản thu tập trung của nền tảng.
- `canCollect(...)`: kiểm tra kết nối đang bật và nguồn nhận tiền phù hợp.
- `matchesSavedQr(...)`: đối chiếu tài khoản SePay với tài khoản đã chốt trong snapshot hợp đồng.
- `webhook(ownerId, authorization, webhook)`: xác thực API key bằng hash; bỏ qua webhook trùng `transactionId`; chỉ nhận giao dịch vào; trích đúng một payment code; đối chiếu nguồn nhận, số tiền và trạng thái; ghi `paidAt` khi khớp; lưu `SepayEvent` cho mọi kết quả.
- `recipient(...)`: so tài khoản/gateway/virtual account của giao dịch với snapshot thanh toán.
- `paymentView(...)`: che QR với chủ nhà, chỉ trả QR cho cư dân; tạo URL VietQR với số tiền và nội dung cố định.
- `configure(...)`, `enabled(...)`, `rotate(...)`: quản lý kết nối và optimistic locking bằng `version`; khóa bí mật chỉ được lưu dạng SHA-256.
- `history(...)`: trả lịch sử đối soát gần nhất.
- `createTest(...)` và nhóm `test...`: luồng phiếu thu thử/bổ sung độc lập với công nợ hóa đơn chuẩn.

#### `config/payment/SepayWebhookSecurity.java`

- `sepayWebhook(...)`: tạo security filter riêng cho webhook: stateless, tắt CSRF/form/basic/logout, chỉ cho `POST` đúng đường dẫn. `permitAll` ở đây không có nghĩa là bỏ xác thực; webhook không dùng JWT người dùng mà API key được kiểm tra trong `SepayService.webhook(...)`.

### 5.3. Entity và repository cần biết

#### Entity

- `model/billing/RentalInvoice.java`: dữ liệu hóa đơn, loại `RENT/UTILITY`, trạng thái `DRAFT/SENT/CANCELLED`, chỉ số/đơn giá/thành tiền, `@Version` chống ghi đè đồng thời.
- `model/billing/MeterReading.java`: chỉ số công tơ và biểu giá đã chốt theo hợp đồng/kỳ.
- `model/billing/InvoiceEvent.java`: audit hành động và snapshot trước/sau.
- `model/billing/InvoiceNotification.java`: bản ghi thông báo tạo lúc gửi hóa đơn.
- `model/payment/InvoicePayment.java`: snapshot thanh toán; `invoiceId` và `paymentCode` là duy nhất; `paidAt` là bằng chứng hệ thống đã đối soát thành công.
- `model/payment/SepayConnection.java`: cấu hình tài khoản nhận và hash khóa webhook.
- `model/payment/SepayEvent.java`: log từng giao dịch webhook và kết quả như `MATCHED`, `AMOUNT_MISMATCH`, `ACCOUNT_MISMATCH`, `ALREADY_PAID`.

#### Repository

- `repository/billing/RentalInvoiceRepository.java`:
  - `ownerHistory(...)`: danh sách của chủ nhà, lọc trạng thái hóa đơn/thanh toán.
  - `findByCustomerAndPaymentStatus(...)`: danh sách cư dân theo có/không `paidAt`.
  - `findWithContractById(...)`: tải hóa đơn cùng hợp đồng/tài sản/người dùng.
  - Nhóm `existsBy...`: chống trùng kỳ và bảo vệ thứ tự chuỗi hóa đơn.
  - `findContractId(...)`: lấy hợp đồng trước khi khóa để cập nhật.
- `repository/billing/MeterReadingRepository.java`: `findByContractIdAndPeriod(...)` tìm chỉ số đã chốt.
- `repository/billing/InvoiceEventRepository.java`: đọc audit theo thứ tự và tìm sự kiện hủy gần nhất.
- `repository/payment/InvoicePaymentRepository.java`:
  - `findByInvoiceId(...)`: đọc thanh toán của hóa đơn.
  - `findByPaymentCode(...)`: webhook ghép giao dịch với hóa đơn.
- `repository/payment/SepayEventRepository.java`:
  - `findByOwnerIdAndTransactionId(...)`: bảo đảm idempotency webhook.
  - `findTop20...`: lịch sử đối soát.
- `repository/payment/SepayConnectionRepository.java`: đọc/khóa cấu hình nhận tiền theo chủ tài khoản.

### 5.4. DTO

- `dto/billing/BillingContext.java`, `RentBillingContext.java`: dữ liệu backend cấp để frontend lập đúng kỳ.
- `InvoiceCreate.java`, `RentInvoiceCreate.java`, `MeterReadingSave.java`: input tạo hóa đơn/chốt chỉ số.
- `InvoiceDraftChange.java`, `InvoiceCancel.java`, `InvoiceSend.java`: command sửa/hủy/gửi kèm phiên bản.
- `InvoiceResponse.java`: dữ liệu trả về, gồm cả vòng đời hóa đơn và trạng thái thanh toán.
- `InvoiceHistoryResponse.java`: audit trước/sau.
- `dto/payment/SepayDtos.java`: request/response cấu hình, QR, webhook, event và phiếu thử.

## 6. Trạng thái và chuyển trạng thái

### Hóa đơn

- Tạo mới → `DRAFT`.
- `DRAFT` → sửa nhiều lần (vẫn `DRAFT`).
- `DRAFT` → `SENT` khi chủ nhà gửi.
- `DRAFT` → `CANCELLED` khi chủ nhà hủy.
- Không sửa/hủy hóa đơn đã `SENT`.
- Cư dân chỉ thấy `SENT`.

### Thanh toán

- Chưa có `InvoicePayment`, hoặc có nhưng `paidAt = null` → `UNPAID`.
- Webhook khớp ghi `paidAt` → `PAID`.
- Không có nguồn thu hợp lệ → `NOT_CONFIGURED` hoặc `PLATFORM_UNAVAILABLE`.
- Frontend không có API “đánh dấu đã trả”; đây là điểm an toàn quan trọng.

## 7. Các cơ chế bảo vệ dữ liệu nên nhấn mạnh

1. **Phân quyền ở backend**: chủ nhà chỉ thao tác hợp đồng/tài sản thuộc họ; cư dân chỉ xem và tạo QR cho hợp đồng của chính mình.
2. **Tính tiền ở backend**: frontend chỉ nhập chỉ số; backend kiểm tra và tính lại.
3. **Chống hóa đơn trùng kỳ**: repository + kiểm tra nghiệp vụ; database migration còn có ràng buộc duy nhất cho hóa đơn chưa hủy.
4. **Optimistic locking**: `RentalInvoice.@Version` và `billingVersion` phát hiện hai tab/người cùng sửa dữ liệu cũ.
5. **Pessimistic/chain locking**: service khóa hợp đồng trước các ghi quan trọng để giữ thứ tự kỳ và chống race condition.
6. **Audit**: lưu actor, thời gian, lý do, dữ liệu trước/sau cho mọi tạo/sửa/hủy/gửi.
7. **Webhook idempotent**: cùng `ownerId + transactionId` chỉ xử lý một lần; thanh toán đã có `paidAt` không ghi lại.
8. **Đối soát chặt**: đúng mã, đúng số tiền, đúng tài khoản/VA, giao dịch chiều vào và hóa đơn vẫn `SENT`.
9. **Bảo vệ bí mật**: khóa webhook lưu hash SHA-256, so sánh constant-time bằng `MessageDigest.isEqual`.
10. **Không cache dữ liệu nhạy cảm**: API thanh toán trả `Cache-Control: no-store`; frontend cũng dùng `cache: no-store`.

## 8. Câu hỏi hội đồng có thể hỏi và câu trả lời ngắn

### “Tiền hóa đơn được tính ở frontend hay backend?”

Backend. Frontend thu thập dữ liệu và hiển thị; `InvoiceService.calculateAmounts` mới là nguồn quyết định để tránh sửa request/UI làm sai tiền.

### “Vì sao cần bản nháp?”

Để chủ nhà rà soát chỉ số, hạn đóng và số tiền trước khi công bố. Chỉ hóa đơn `SENT` mới hiện cho cư dân và mới được thanh toán.

### “Thanh toán xong ai bấm xác nhận?”

Không ai bấm thủ công trong luồng SePay. SePay gửi webhook từ giao dịch ngân hàng; backend đối chiếu rồi ghi `paidAt`. Frontend chỉ đọc lại kết quả.

### “Nếu người dùng chuyển sai tiền hoặc sai nội dung?”

Webhook vẫn được lưu nhưng kết quả là `AMOUNT_MISMATCH` hoặc `UNMATCHED`; hóa đơn không chuyển sang `PAID`.

### “Nếu SePay gửi webhook hai lần?”

`SepayEventRepository.findByOwnerIdAndTransactionId` phát hiện giao dịch đã xử lý và trả về, nên không ghi nhận hai lần.

### “Nếu hai tab cùng sửa hóa đơn?”

Request mang `version` của hóa đơn và `billingVersion` của chuỗi tính tiền. Nếu dữ liệu đã đổi, backend trả conflict và yêu cầu tải lại thay vì ghi đè.

### “Vì sao trạng thái thanh toán không nằm thẳng trong bảng hóa đơn?”

Vì vòng đời chứng từ và sự kiện tiền là hai khái niệm khác nhau. `RentalInvoice` lưu chứng từ; `InvoicePayment` lưu snapshot/mã đối soát và `paidAt`. Cách tách này giúp audit rõ, tránh trộn “đã gửi” với “đã thu tiền”.

### “Chủ nhà có nhìn thấy QR của cư dân không?”

Service chỉ trả `qrUrl` khi người xem là cư dân của hợp đồng. Chủ nhà được xem trạng thái nhưng QR được che.

### “Webhook permitAll có phải lỗ hổng không?”

Không. Endpoint máy-chủ-với-máy-chủ không dùng JWT/cookie nên security chain cho request đi vào; `SepayService.webhook` xác thực API key đã băm trước khi xử lý nội dung. Request sai khóa nhận `401`.

### “Hệ thống có hỗ trợ nước tính theo đầu người không?”

Có. `waterBillingMode` có `METERED` và `PER_PERSON`. Với `PER_PERSON`, lượng tính tiền là `occupantCount` và UI không yêu cầu chỉ số nước cuối.

### “Tại sao tiền thuê và điện nước tách hóa đơn?”

Tiền thuê theo chu kỳ hợp đồng, còn tiện ích theo kỳ/chỉ số hằng tháng. Entity dùng `kind = RENT/UTILITY`, giúp lập, đối soát và tự động hóa độc lập.

## 9. File kiểm thử liên quan để dẫn chứng

Frontend:

- `tests/billing.test.ts`: unit test service/hàm chuyển đổi hóa đơn.
- `tests/separate-billing.test.ts`: kiểm tra tách hóa đơn thuê và tiện ích.
- `e2e/billing.spec.ts`: luồng hóa đơn tổng thể.
- `e2e/invoices-ui.spec.ts`: giao diện danh sách/chi tiết.
- `e2e/invoice-inline-readings.spec.ts`: nhập chỉ số khi lập hóa đơn.
- `e2e/invoice-draft-changes.spec.js`: sửa/hủy/gửi bản nháp.

Backend: tìm trong `src/test/java` các test có tên/chứa từ khóa `Invoice`, `Billing`, `Sepay`, `Payment`. Khi hội đồng hỏi, có thể nói hệ thống kiểm thử ở cả service/API và E2E; chỉ khẳng định test đã chạy thành công nếu đã chạy thật trong môi trường bảo vệ.

## 10. Thứ tự đọc code nếu chỉ còn ít thời gian

1. `CreateInvoiceModal.tsx` — thao tác demo lập hóa đơn.
2. `billingService.ts` — ánh xạ nút UI sang endpoint.
3. `InvoiceController.java` — danh sách API.
4. `InvoiceService.java` — luật nghiệp vụ, công thức và khóa dữ liệu.
5. `InvoicePaymentPanel.tsx` — thao tác demo QR/trạng thái.
6. `SepayController.java` — API thanh toán/webhook.
7. `SepayService.java` — tạo payment, QR và đối soát webhook.
8. `RentalInvoice.java` + `InvoicePayment.java` — mô hình dữ liệu và cách tách trạng thái.

## 11. Một câu kết khi demo

“Luồng này không chỉ hiển thị hóa đơn và QR. Backend giữ quyền quyết định kỳ, chỉ số, đơn giá, tổng tiền và phân quyền; thanh toán chỉ được ghi nhận khi webhook SePay khớp mã, số tiền và tài khoản. Các phiên bản, khóa giao dịch, audit và idempotency giúp tránh trùng hóa đơn, ghi đè và xác nhận tiền hai lần.”
