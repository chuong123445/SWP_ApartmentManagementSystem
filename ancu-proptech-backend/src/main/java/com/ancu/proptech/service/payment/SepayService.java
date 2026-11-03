package com.ancu.proptech.service.payment;
import com.ancu.proptech.dto.payment.SepayDtos.*;
import com.ancu.proptech.model.payment.*;
import com.ancu.proptech.model.billing.RentalInvoice;
import com.ancu.proptech.model.contract.RentalContract;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.payment.*;
import com.ancu.proptech.repository.billing.RentalInvoiceRepository;
import com.ancu.proptech.repository.contract.RentalContractRepository;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
@Service @RequiredArgsConstructor
public class SepayService {
 private final SepayConnectionRepository connections;
 private final InvoicePaymentRepository payments;
 private final SepayEventRepository events;
 private final TestPaymentRepository testPayments;
 private final RentalInvoiceRepository invoices;
 private final RentalContractRepository contracts;
 private final AuthAccountRepository accounts;
 private final AccountAccessService access;
 private final SepayBankClient bankClient;
 private final SettlementService settlements;
 private final com.ancu.proptech.repository.contract.ContractDraftRepository contractDrafts;
 private final tools.jackson.databind.ObjectMapper json;
 @Value("${app.payment.public-base-url:}") private String publicBaseUrl;
 @Value("${app.payment.platform-source-email:}") private String platformSourceEmail;
 private static final SecureRandom RANDOM=new SecureRandom();
 private static final Pattern CODE=Pattern.compile("(?<![A-Z0-9])ANCU(?:TEST)?[A-F0-9]{24}(?![A-Z0-9])");
 @Transactional(readOnly = true)
 public Connection config(Jwt jwt) {
  Long owner = access.owner(jwt).getId();
  requireLegacySettings(owner);
  return view(connections.findByOwnerId(owner).orElse(null), owner, null);
 }

 @Transactional(readOnly = true)
 public Connection platformConfig(Jwt jwt) {
  access.admin(jwt);
  Long source = platformSourceId();
  var connection = source == null ? null : connections.findByOwnerId(source).orElse(null);
  return view(connection, source, null);
 }

 public boolean platformEnabled() {
  return !platformSourceEmail.isBlank();
 }

 private Long platformSourceId() {
  if (!platformEnabled()) return null;
  return accounts.findByEmail(platformSourceEmail.strip()).map(AuthAccount::getId).orElse(null);
 }

 private void requireLegacySettings(Long owner) {
  if (platformEnabled() || payments.existsByCollectionOwnerId(owner) || testPayments.existsByCollectionOwnerId(owner)) {
   throw new ApiException(HttpStatus.FORBIDDEN, "PLATFORM_MANAGED_SEPAY",
           "Kết nối SePay dùng chung do hệ thống quản lý.");
  }
 }

 public BankPage banks(Jwt jwt, ApiToken input) {
  requireLegacySettings(access.owner(jwt).getId());
  return bankClient.banks(input.apiToken(), input.page());
 }

 public VaPage vas(Jwt jwt, VaRequest input) {
  requireLegacySettings(access.owner(jwt).getId());
  return bankClient.vas(input.apiToken(), input.bankAccountId(), input.page());
 }
 @Transactional public Connection configure(Jwt jwt,Setup input){
  Long owner=access.owner(jwt).getId();
  requireLegacySettings(owner);
  var bank=bankClient.bank(input.apiToken(),input.bankAccountId());
  var va=input.virtualAccountId()==null?null:bankClient.va(input.apiToken(),input.bankAccountId(),input.virtualAccountId());
  if(va==null&&Set.of("BIDV","OCB","MSB","KienLongBank").stream().anyMatch(b->b.equalsIgnoreCase(bank.bank())))throw new ApiException(HttpStatus.BAD_REQUEST,"VA_REQUIRED","Ngân hàng này cần VA chính thức để nhận diện giao dịch. Chọn VA đã tạo trên SePay.");
  var c=connections.lockOwner(owner).orElse(null);
  if(c==null){accounts.findForIdentityUpdate(owner).orElseThrow(SepayService::missing);c=connections.lockOwner(owner).orElse(null);}
  String key=null;
  if(c==null){if(input.version()!=0)throw stale();c=new SepayConnection();c.setOwnerId(owner);key=secret();c.setSecretHash(hash(key));}
  else if(c.getVersion()!=input.version())throw stale();
  c.setBank(bank.bank());c.setBankAccountId(bank.id());c.setAccountNumber(bank.accountNumber());c.setAccountHolderName(va!=null&&!va.holder().isBlank()?va.holder():bank.accountHolderName());c.setVirtualAccount(va==null?null:va.number());c.setEnabled(input.enabled());
  connections.saveAndFlush(c);return view(c,owner,key);
 }
 @Transactional public Connection enabled(Jwt jwt,boolean enabled,long version){Long owner=access.owner(jwt).getId();requireLegacySettings(owner);var c=connections.lockOwner(owner).orElseThrow(SepayService::missing);if(c.getVersion()!=version)throw stale();c.setEnabled(enabled);connections.flush();return view(c,owner,null);}
 @Transactional public Connection rotate(Jwt jwt,long version){Long owner=access.owner(jwt).getId();requireLegacySettings(owner);var c=connections.lockOwner(owner).orElseThrow(SepayService::missing);if(c.getVersion()!=version)throw stale();String key=secret();c.setSecretHash(hash(key));connections.flush();return view(c,owner,key);}
 @Transactional(readOnly=true) public List<Event> history(Jwt jwt){Long owner=access.owner(jwt).getId();requireLegacySettings(owner);return events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(owner).stream().map(e->new Event(e.getTransactionId().toString(),e.getInvoiceId()==null?null:e.getInvoiceId().toString(),e.getTestPaymentId()==null?null:e.getTestPaymentId().toString(),e.getResult(),e.getAmount().toPlainString(),e.getReceivedAt())).toList();}
 @Transactional(readOnly = true)
 public Payment status(Jwt jwt, Long invoiceId) {
  var actor = access.account(jwt);
  var invoice = visible(actor, jwt, invoiceId);
  boolean tenant = invoice.getContract().getCustomer().getId().equals(actor.getId());
  var payment = payments.findByInvoiceId(invoiceId).orElse(null);
  if (payment != null && payment.getPaidAt() != null) return paymentView(payment, tenant);
  Long owner = invoice.getContract().getApartment().getProperty().getOwner().getId();
  Long source = collectionSource(owner, payment);
  var connection = source == null ? null : connections.findByOwnerId(source).orElse(null);
  if (!canCollect(invoice, payment, connection)) {
   String status = platformEnabled() ? "PLATFORM_UNAVAILABLE" : "NOT_CONFIGURED";
   return new Payment(status, null, invoice.getTotalAmount().toPlainString(), null, null, null, null, null);
  }
  return payment == null
          ? new Payment("UNPAID", null, invoice.getTotalAmount().toPlainString(), null, null, null, null, null)
          : paymentView(payment, tenant);
 }

 @Transactional
 public Payment payment(Jwt jwt, Long invoiceId) {
  var actor = access.account(jwt);
  var invoice = visible(actor, jwt, invoiceId);
  if (!invoice.getContract().getCustomer().getId().equals(actor.getId())) {
   throw new ApiException(HttpStatus.FORBIDDEN, "TENANT_PAYMENT_ONLY", "Chỉ người thuê của hợp đồng được tạo QR thanh toán.");
  }
  var payment = payments.findByInvoiceId(invoiceId).orElse(null);
  if (payment != null && payment.getPaidAt() != null) return paymentView(payment, true);
  Long owner = invoice.getContract().getApartment().getProperty().getOwner().getId();
  Long source = collectionSource(owner, payment);
  var connection = source == null ? null : connections.lockOwner(source).orElse(null);
  contracts.lockById(invoice.getContract().getId()).orElseThrow(SepayService::missing);
  payment = payments.findByInvoiceId(invoiceId).orElse(null);
  if (payment != null && payment.getPaidAt() != null) return paymentView(payment, true);
  if (!java.util.Objects.equals(source, collectionSource(owner, payment))) {
   throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_SOURCE_CHANGED", "Khoản thanh toán vừa được tạo. Vui lòng tải lại.");
  }
  if (connection == null || !connection.isEnabled()) {
   throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_NOT_CONFIGURED", "Kết nối nhận thanh toán hiện chưa sẵn sàng.");
  }
  if (view(connection, source, null).webhookUrl() == null) {
   throw new ApiException(HttpStatus.CONFLICT, "PUBLIC_URL_MISSING", "Quản trị viên chưa cấu hình URL HTTPS nhận webhook SePay.");
  }
  if (!canCollect(invoice, payment, connection)) {
   throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_RECEIVER_MISMATCH",
           "Tài khoản SePay khác QR đã lưu trong hợp đồng.");
  }
  if (payment == null) {
   BigDecimal amount = invoice.getTotalAmount();
   try {
    amount.toBigIntegerExact();
   } catch (ArithmeticException error) {
    throw new ApiException(HttpStatus.CONFLICT, "FRACTIONAL_VND_UNSUPPORTED", "Hóa đơn có phần lẻ VND, cần rà soát trước khi thanh toán.");
   }
   if (amount.signum() <= 0) {
    throw new ApiException(HttpStatus.CONFLICT, "INVALID_PAYMENT_AMOUNT", "Số tiền thanh toán phải lớn hơn 0.");
   }
   payment = new InvoicePayment();
   payment.setInvoiceId(invoiceId);
   payment.setOwnerId(owner);
   if (platformEnabled()) payment.setCollectionOwnerId(source);
   payment.setBank(connection.getBank());
   payment.setAmount(amount);
   payment.setPaymentCode("ANCU" + randomHex(12));
   payment.setAccountNumber(connection.getAccountNumber());
   payment.setVirtualAccount(connection.getVirtualAccount());
   payment.setAccountHolderName(connection.getAccountHolderName());
   payments.saveAndFlush(payment);
  }
  return paymentView(payment, true);
 }

 private Long collectionSource(Long owner, InvoicePayment payment) {
  if (payment == null) return platformEnabled() ? platformSourceId() : owner;
  return payment.getCollectionOwnerId() == null ? owner : payment.getCollectionOwnerId();
 }

 private boolean canCollect(RentalInvoice invoice, InvoicePayment payment, SepayConnection connection) {
  if (connection == null || !connection.isEnabled()) return false;
  if (payment == null && platformEnabled()) return view(connection, connection.getOwnerId(), null).webhookUrl() != null;
  if (payment != null && payment.getCollectionOwnerId() != null) return true;
  return matchesSavedQr(invoice, payment == null ? connection.getBank() : payment.getBank(),
          payment == null ? connection.getAccountNumber() : payment.getAccountNumber(),
          payment == null ? connection.getVirtualAccount() : payment.getVirtualAccount());
 }
 private boolean matchesSavedQr(RentalInvoice invoice,String bank,String account,String virtualAccount){
  var draft=contractDrafts.findByContractId(invoice.getContract().getId()).orElse(null);if(draft==null)return true;
  var snapshot=json.readValue(draft.getSnapshotJson(),com.ancu.proptech.dto.contract.ContractSnapshot.class);
  if(snapshot.ownerPaymentQrId()==null)return true;
  var receiver=snapshot.receivingAccount();return receiver!=null&&normalizeBank(receiver.bank()).equals(normalizeBank(bank))&&receiver.accountNumber().equals(virtualAccount==null?account:virtualAccount);
 }
 private static String normalizeBank(String bank){String value=bank==null?"":bank.replaceAll("[^A-Za-z0-9]","").toUpperCase(Locale.ROOT);return switch(value){case "MB"->"MBBANK";case "VCB"->"VIETCOMBANK";case "ICB"->"VIETINBANK";case "TCB"->"TECHCOMBANK";case "VPB"->"VPBANK";default->value;};}
 // Phiếu thử độc lập với công nợ; chốt số tiền và người nhận khi tạo.
 @Transactional public TestReceipt createTest(Jwt jwt,TestPaymentRequest input){
  Long owner = access.owner(jwt).getId();
  boolean platform = platformEnabled();
  if (platform && input.contractId() == null) {
   throw new ApiException(HttpStatus.BAD_REQUEST, "TENANT_RECEIPT_REQUIRED", "Chọn hợp đồng của người thuê để tạo khoản thu.");
  }
  Long source = platform ? platformSourceId() : owner;
  var c = source == null ? null : connections.lockOwner(source).orElse(null);
  if(c==null||!c.isEnabled())throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_NOT_CONFIGURED","Hãy bật cấu hình SePay trước.");
  if(view(c,source,null).webhookUrl()==null)throw new ApiException(HttpStatus.CONFLICT,"PUBLIC_URL_MISSING","Chưa cấu hình URL HTTPS nhận webhook.");
  RentalContract contract=null;
  if(input.contractId()!=null){
   contract=contracts.lockById(input.contractId()).orElseThrow(SepayService::missing);
   if(!contract.getApartment().getProperty().getOwner().getId().equals(owner))throw missing();
   if(contract.getStatus()!=RentalContract.Status.ACTIVE||contract.getCustomer().getId().equals(owner))throw new ApiException(HttpStatus.CONFLICT,"TEST_RECIPIENT_INVALID","Chỉ gửi phiếu thử cho người thuê có hợp đồng đang hoạt động của bạn.");
  }
  var p=new TestPayment();p.setContractId(contract==null?null:contract.getId());p.setCustomerId(contract==null?null:contract.getCustomer().getId());p.setOwnerId(owner);if(platform)p.setCollectionOwnerId(source);p.setAmount(input.amount());p.setPaymentCode("ANCUTEST"+randomHex(12));p.setBank(c.getBank());p.setAccountNumber(c.getAccountNumber());p.setVirtualAccount(c.getVirtualAccount());p.setAccountHolderName(c.getAccountHolderName());p.setCreatedAt(Instant.now());testPayments.saveAndFlush(p);return testView(p);
 }
 @Transactional(readOnly=true) public List<TestReceipt> testHistory(Jwt jwt){return testPayments.findTop20ByOwnerIdOrderByIdDesc(access.owner(jwt).getId()).stream().map(this::testView).toList();}
 @Transactional(readOnly=true) public com.ancu.proptech.dto.common.PageResponse<TestReceipt> ownerReceivedHistory(Jwt jwt,int page,int size,Long propertyId,com.ancu.proptech.dto.billing.InvoicePaymentFilter paymentStatus){
  com.ancu.proptech.service.apartment.ApartmentService.validatePage(page,size);
  Boolean paid=paymentStatus==com.ancu.proptech.dto.billing.InvoicePaymentFilter.PAID?Boolean.TRUE:paymentStatus==com.ancu.proptech.dto.billing.InvoicePaymentFilter.UNPAID?Boolean.FALSE:null;
  var items=testPayments.ownerReceived(access.owner(jwt).getId(),propertyId,paid,org.springframework.data.domain.PageRequest.of(page,size,org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,"createdAt","id")));
  return com.ancu.proptech.dto.common.PageResponse.from(items.map(this::testView));
 }
 @Transactional(readOnly=true) public TestReceipt ownerReceivedDetail(Jwt jwt,Long id){return testView(testPayments.ownerReceivedDetail(access.owner(jwt).getId(),null,null,id).orElseThrow(SepayService::missing));}
 @Transactional(readOnly=true) public List<TestRecipient> testRecipients(Jwt jwt){return contracts.findByApartmentPropertyOwnerIdAndStatusOrderByStartDateDescIdAsc(access.owner(jwt).getId(),RentalContract.Status.ACTIVE).stream().filter(c->!c.getCustomer().getId().equals(c.getApartment().getProperty().getOwner().getId())).map(c->new TestRecipient(c.getId().toString(),c.getCustomer().getFullName(),c.getApartment().getRoomNumber())).toList();}
 @Transactional(readOnly=true) public List<TestReceipt> tenantTestHistory(Jwt jwt,com.ancu.proptech.dto.billing.InvoicePaymentFilter paymentStatus){
  Long customer=access.customer(jwt).getId();
  var items=switch(paymentStatus){
   case ALL -> testPayments.findTop20ByCustomerIdOrderByIdDesc(customer);
   case UNPAID -> testPayments.findTop20ByCustomerIdAndPaidAtIsNullOrderByIdDesc(customer);
   case PAID -> testPayments.findTop20ByCustomerIdAndPaidAtIsNotNullOrderByIdDesc(customer);
  };
  return items.stream().map(p -> testView(p, true)).toList();
 }
 @Transactional(readOnly=true) public TestReceipt tenantTestDetail(Jwt jwt,Long id){return testView(testPayments.findByIdAndCustomerId(id,access.customer(jwt).getId()).orElseThrow(SepayService::missing), true);}
 private TestReceipt testView(TestPayment p) { return testView(p, false); }
 private TestReceipt testView(TestPayment p, boolean showQr){
  var c=p.getContractId()==null?null:contracts.findById(p.getContractId()).orElseThrow(SepayService::missing);
  return new TestReceipt(p.getId().toString(),p.getCreatedAt(),paymentView(p.getBank(),p.getAccountNumber(),p.getVirtualAccount(),p.getAccountHolderName(),p.getAmount(),p.getPaymentCode(),p.getPaidAt(),showQr),c==null?null:c.getId().toString(),c==null?null:c.getCustomer().getFullName(),c==null?null:c.getApartment().getRoomNumber(),c==null?null:c.getApartment().getProperty().getOwner().getFullName());
 }

 private RentalInvoice visible(AuthAccount actor,Jwt jwt,Long id){
  var i=invoices.findWithContractById(id).orElseThrow(SepayService::missing);
  boolean owner=i.getContract().getApartment().getProperty().getOwner().getId().equals(actor.getId());
  if(owner)access.owner(jwt);else if(i.getContract().getCustomer().getId().equals(actor.getId()))access.customer(jwt);else throw missing();
  if(i.getStatus()!=RentalInvoice.Status.SENT)throw new ApiException(HttpStatus.CONFLICT,"INVOICE_NOT_SENT","Chỉ thanh toán hóa đơn đã gửi.");return i;
 }
 @Transactional public void webhook(Long ownerId,String authorization,Webhook w){
  var c=connections.lockOwner(ownerId).orElseThrow(SepayService::unauthorized);
  String supplied=authorization!=null&&authorization.startsWith("Apikey ")?authorization.substring(7):"";
  if(supplied.length()>256||!MessageDigest.isEqual(c.getSecretHash().getBytes(StandardCharsets.US_ASCII),hash(supplied).getBytes(StandardCharsets.US_ASCII)))throw unauthorized();
  // SePay Gửi thử dùng id=0. Chỉ xác nhận kết nối sau kiểm tra khóa;
  // không tạo giao dịch, đọc mã hóa đơn hay ghi nhận thanh toán từ bản tin thử.
  if(w.id()==0){c.setLastWebhookAt(Instant.now());return;}
  if(events.findByOwnerIdAndTransactionId(ownerId,w.id()).isPresent())return;
  c.setLastWebhookAt(Instant.now());
  var e=new SepayEvent();e.setOwnerId(ownerId);e.setTransactionId(w.id());e.setAmount(w.transferAmount());e.setReceivedAt(Instant.now());e.setResult("UNMATCHED");
  if(!c.isEnabled())e.setResult("DISABLED");
  else if(!w.transferType().equals("in"))e.setResult("IGNORED_OUTGOING");
  else {
   var codes=new HashSet<String>();var matcher=CODE.matcher(w.content().toUpperCase(Locale.ROOT));while(matcher.find())codes.add(matcher.group());
   if(w.code()!=null&&!w.code().isBlank()){String code=w.code().toUpperCase(Locale.ROOT);if(!CODE.matcher(code).matches()||(!codes.isEmpty()&&!codes.contains(code)))codes.add("INVALID");else codes.add(code);}
   var test=codes.size()==1?testPayments.findByPaymentCode(codes.iterator().next()).orElse(null):null;
   if(test!=null&&webhookSource(test.getOwnerId(), test.getCollectionOwnerId()).equals(ownerId)){
    e.setTestPaymentId(test.getId());
    if(!recipient(test.getBank(),test.getAccountNumber(),test.getVirtualAccount(),w))e.setResult("ACCOUNT_MISMATCH");
    else if(test.getAmount().compareTo(w.transferAmount())!=0)e.setResult("AMOUNT_MISMATCH");
    else if(test.getPaidAt()!=null)e.setResult("ALREADY_PAID");
        else {
     test.setPaidAt(e.getReceivedAt());
     if (test.getCollectionOwnerId() != null) {
      settlements.credit(test.getOwnerId(), com.ancu.proptech.model.payment.SettlementEntry.Kind.ADDITIONAL_RECEIPT,
              test.getId(), test.getAmount());
     }
     e.setResult("MATCHED");
    }
   }
   var p=codes.size()==1?payments.findByPaymentCode(codes.iterator().next()).orElse(null):null;
   if(p!=null&&webhookSource(p.getOwnerId(), p.getCollectionOwnerId()).equals(ownerId)){
    e.setInvoiceId(p.getInvoiceId());
    // BIDV VA chính thức: gốc + subAccount=VA, hoặc accountNumber chính là VA.
    boolean recipient=recipient(p.getBank(),p.getAccountNumber(),p.getVirtualAccount(),w);
    if(!recipient)e.setResult("ACCOUNT_MISMATCH");
    else if(p.getAmount().compareTo(w.transferAmount())!=0)e.setResult("AMOUNT_MISMATCH");
    else {
     var invoice=invoices.findWithContractById(p.getInvoiceId()).orElseThrow(SepayService::missing);contracts.lockById(invoice.getContract().getId()).orElseThrow(SepayService::missing);
     if(invoice.getStatus()!=RentalInvoice.Status.SENT)e.setResult("INVOICE_NOT_SENT");
     else if(p.getPaidAt()!=null)e.setResult("ALREADY_PAID");
          else {
      p.setPaidAt(e.getReceivedAt());
      if (p.getCollectionOwnerId() != null) {
       settlements.credit(p.getOwnerId(), com.ancu.proptech.model.payment.SettlementEntry.Kind.INVOICE,
               p.getId(), p.getAmount());
      }
      e.setResult("MATCHED");
     }
    }
   }
  }
  events.saveAndFlush(e);
 }
 private static Long webhookSource(Long owner, Long collector) { return collector == null ? owner : collector; }
 private static boolean recipient(String bank,String account,String va,Webhook w){return bank.equalsIgnoreCase(w.gateway())&&(va==null?account.equals(w.accountNumber())&&(w.subAccount()==null||w.subAccount().isBlank()):((account.equals(w.accountNumber())&&va.equals(w.subAccount()))||(va.equals(w.accountNumber())&&(w.subAccount()==null||w.subAccount().isBlank()||va.equals(w.subAccount())))));}
 private Payment paymentView(InvoicePayment p, boolean showQr){return paymentView(p.getBank(),p.getAccountNumber(),p.getVirtualAccount(),p.getAccountHolderName(),p.getAmount(),p.getPaymentCode(),p.getPaidAt(),showQr);}
 private Payment paymentView(String bank,String account,String va,String holder,BigDecimal amount,String code,Instant paidAt,boolean showQr){
  String recipient=va==null?account:va;
  String qr=showQr&&paidAt==null?"https://vietqr.app/img?bank="+bank+"&acc="+URLEncoder.encode(recipient,StandardCharsets.UTF_8)+"&amount="+amount.toBigIntegerExact()+"&des="+(bank.equalsIgnoreCase("VietinBank")?"SEVQR%20":"")+code+"&template=compact&showinfo=true&holder="+URLEncoder.encode(holder,StandardCharsets.UTF_8):null;
  return new Payment(paidAt==null?"UNPAID":"PAID",code,amount.toPlainString(),bank,recipient,holder,qr,paidAt);
 }
 private Connection view(SepayConnection c,Long owner,String key){String url=null;if(owner!=null&&!publicBaseUrl.isBlank()){
  URI uri=URI.create(publicBaseUrl);if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getUserInfo()!=null)throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"PUBLIC_URL_INVALID","Quản trị viên cần cấu hình APP_PUBLIC_BASE_URL là URL HTTPS hợp lệ.");
  url=publicBaseUrl.replaceAll("/+$","")+"/api/v1/payments/sepay/webhooks/"+owner;
 }return new Connection(c!=null,c==null?null:c.getBank(),c==null?null:c.getAccountNumber(),c==null?null:c.getAccountHolderName(),c==null?null:c.getVirtualAccount(),c!=null&&c.isEnabled(),c==null?0:c.getVersion(),url,c==null?null:c.getLastWebhookAt(),key);}
 private static String secret(){return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));}
 private static byte[] randomBytes(int size){byte[] b=new byte[size];RANDOM.nextBytes(b);return b;}
 private static String randomHex(int size){return HexFormat.of().withUpperCase().formatHex(randomBytes(size));}
 private static String hash(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy thông tin thanh toán thuộc tài khoản của bạn.");}
 private static ApiException stale(){return new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Cấu hình đã thay đổi. Hãy tải lại.");}
 private static ApiException unauthorized(){return new ApiException(HttpStatus.UNAUTHORIZED,"WEBHOOK_UNAUTHORIZED","Khóa webhook không hợp lệ.");}
}
