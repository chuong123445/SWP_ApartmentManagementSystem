package com.ancu.proptech.service.payment;
import com.ancu.proptech.dto.payment.SepayDtos.*;
import com.ancu.proptech.model.payment.*;
import com.ancu.proptech.model.billing.RentalInvoice;
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
 private final RentalInvoiceRepository invoices;
 private final RentalContractRepository contracts;
 private final AuthAccountRepository accounts;
 private final AccountAccessService access;
 private final SepayBankClient bankClient;
 @Value("${app.payment.public-base-url:}") private String publicBaseUrl;
 private static final SecureRandom RANDOM=new SecureRandom();
 private static final Pattern CODE=Pattern.compile("(?<![A-Z0-9])ANCU[A-F0-9]{24}(?![A-Z0-9])");
 @Transactional(readOnly=true) public Connection config(Jwt jwt){Long owner=access.owner(jwt).getId();return view(connections.findByOwnerId(owner).orElse(null),owner,null);}
 public BankPage banks(Jwt jwt,ApiToken input){access.owner(jwt);return bankClient.banks(input.apiToken(),input.page());}
 public VaPage vas(Jwt jwt,VaRequest input){access.owner(jwt);return bankClient.vas(input.apiToken(),input.bankAccountId(),input.page());}
 @Transactional public Connection configure(Jwt jwt,Setup input){
  Long owner=access.owner(jwt).getId();
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
 @Transactional public Connection rotate(Jwt jwt,long version){Long owner=access.owner(jwt).getId();var c=connections.lockOwner(owner).orElseThrow(SepayService::missing);if(c.getVersion()!=version)throw stale();String key=secret();c.setSecretHash(hash(key));connections.flush();return view(c,owner,key);}
 @Transactional(readOnly=true) public List<Event> history(Jwt jwt){return events.findTop20ByOwnerIdOrderByReceivedAtDescIdDesc(access.owner(jwt).getId()).stream().map(e->new Event(e.getTransactionId().toString(),e.getInvoiceId()==null?null:e.getInvoiceId().toString(),e.getResult(),e.getAmount().toPlainString(),e.getReceivedAt())).toList();}
 @Transactional(readOnly=true) public Payment status(Jwt jwt,Long invoiceId){
  var i=visible(access.account(jwt),jwt,invoiceId);var p=payments.findByInvoiceId(invoiceId).orElse(null);
  if(p!=null&&p.getPaidAt()!=null)return paymentView(p);
  var c=connections.findByOwnerId(i.getContract().getApartment().getProperty().getOwner().getId()).orElse(null);
  if(c==null||!c.isEnabled())return new Payment("NOT_CONFIGURED",null,null,null,null,null,null,null);
  return p==null?new Payment("UNPAID",null,null,null,null,null,null,null):paymentView(p);
 }
 @Transactional public Payment payment(Jwt jwt,Long invoiceId){
  var actor=access.account(jwt);var i=visible(actor,jwt,invoiceId);
  var p=payments.findByInvoiceId(invoiceId).orElse(null);
  if(p!=null&&p.getPaidAt()!=null)return paymentView(p);
  var c=connections.lockOwner(i.getContract().getApartment().getProperty().getOwner().getId()).orElse(null);
  if(c==null||!c.isEnabled())throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_NOT_CONFIGURED","Chủ nhà chưa bật thanh toán SePay.");
  if(view(c,c.getOwnerId(),null).webhookUrl()==null)throw new ApiException(HttpStatus.CONFLICT,"PUBLIC_URL_MISSING","Quản trị viên chưa cấu hình URL HTTPS nhận webhook SePay.");
  // Cùng thứ tự khóa với ghi hóa đơn: connection -> contract. Snapshot người nhận không đổi sau khi cấp QR.
  contracts.lockById(i.getContract().getId()).orElseThrow(SepayService::missing);
  p=payments.findByInvoiceId(invoiceId).orElse(null);
  if(p==null){
   BigDecimal amount=i.getTotalAmount();try{amount.toBigIntegerExact();}catch(ArithmeticException e){throw new ApiException(HttpStatus.CONFLICT,"FRACTIONAL_VND_UNSUPPORTED","Hóa đơn có phần lẻ VND, cần rà soát trước khi thanh toán.");}
   if(amount.signum()<=0)throw new ApiException(HttpStatus.CONFLICT,"INVALID_PAYMENT_AMOUNT","Số tiền thanh toán phải lớn hơn 0.");
   p=new InvoicePayment();p.setInvoiceId(invoiceId);p.setOwnerId(c.getOwnerId());p.setBank(c.getBank());p.setAmount(amount);p.setPaymentCode("ANCU"+randomHex(12));p.setAccountNumber(c.getAccountNumber());p.setVirtualAccount(c.getVirtualAccount());p.setAccountHolderName(c.getAccountHolderName());payments.saveAndFlush(p);
  }
  return paymentView(p);
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
  if(events.findByOwnerIdAndTransactionId(ownerId,w.id()).isPresent())return;
  c.setLastWebhookAt(Instant.now());
  var e=new SepayEvent();e.setOwnerId(ownerId);e.setTransactionId(w.id());e.setAmount(w.transferAmount());e.setReceivedAt(Instant.now());e.setResult("UNMATCHED");
  if(!c.isEnabled())e.setResult("DISABLED");
  else if(!w.transferType().equals("in"))e.setResult("IGNORED_OUTGOING");
  else {
   var codes=new HashSet<String>();var matcher=CODE.matcher(w.content().toUpperCase(Locale.ROOT));while(matcher.find())codes.add(matcher.group());
   if(w.code()!=null&&!w.code().isBlank()){String code=w.code().toUpperCase(Locale.ROOT);if(!CODE.matcher(code).matches()||(!codes.isEmpty()&&!codes.contains(code)))codes.add("INVALID");else codes.add(code);}
   var p=codes.size()==1?payments.findByPaymentCode(codes.iterator().next()).orElse(null):null;
   if(p!=null&&p.getOwnerId().equals(ownerId)){
    e.setInvoiceId(p.getInvoiceId());
    // BIDV VA chính thức: gốc + subAccount=VA, hoặc accountNumber chính là VA.
    boolean recipient=p.getBank().equalsIgnoreCase(w.gateway())&&(p.getVirtualAccount()==null ? p.getAccountNumber().equals(w.accountNumber())&&(w.subAccount()==null||w.subAccount().isBlank()) : ((p.getAccountNumber().equals(w.accountNumber())&&p.getVirtualAccount().equals(w.subAccount()))||(p.getVirtualAccount().equals(w.accountNumber())&&(w.subAccount()==null||w.subAccount().isBlank()||p.getVirtualAccount().equals(w.subAccount())))));
    if(!recipient)e.setResult("ACCOUNT_MISMATCH");
    else if(p.getAmount().compareTo(w.transferAmount())!=0)e.setResult("AMOUNT_MISMATCH");
    else {
     var invoice=invoices.findWithContractById(p.getInvoiceId()).orElseThrow(SepayService::missing);contracts.lockById(invoice.getContract().getId()).orElseThrow(SepayService::missing);
     if(invoice.getStatus()!=RentalInvoice.Status.SENT)e.setResult("INVOICE_NOT_SENT");
     else if(p.getPaidAt()!=null)e.setResult("ALREADY_PAID");
     else {p.setPaidAt(e.getReceivedAt());e.setResult("MATCHED");}
    }
   }
  }
  events.saveAndFlush(e);
 }
 private Payment paymentView(InvoicePayment p){String qr=p.getPaidAt()==null?"https://vietqr.app/img?bank="+p.getBank()+"&acc="+URLEncoder.encode(p.getVirtualAccount()==null?p.getAccountNumber():p.getVirtualAccount(),StandardCharsets.UTF_8)+"&amount="+p.getAmount().toBigIntegerExact()+"&des="+(p.getBank().equalsIgnoreCase("VietinBank")?"SEVQR%20":"")+p.getPaymentCode()+"&template=compact&showinfo=true&holder="+URLEncoder.encode(p.getAccountHolderName(),StandardCharsets.UTF_8):null;return new Payment(p.getPaidAt()==null?"UNPAID":"PAID",p.getPaymentCode(),p.getAmount().toPlainString(),p.getBank(),p.getVirtualAccount()==null?p.getAccountNumber():p.getVirtualAccount(),p.getAccountHolderName(),qr,p.getPaidAt());}
 private Connection view(SepayConnection c,Long owner,String key){String url=null;if(!publicBaseUrl.isBlank()){
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
