package com.ancu.proptech.service.property;
import com.ancu.proptech.model.property.OwnerPaymentQr;
import com.ancu.proptech.repository.property.OwnerPaymentQrRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityManager;
import java.time.Instant;
@Service @RequiredArgsConstructor
public class OwnerPaymentQrService {
 private final OwnerPaymentQrRepository qrs;private final AccountAccessService access;private final EntityManager em;
 public record View(String id,String bank,String bankBin,String accountNumber,String accountHolderName,String aiStatus,boolean confirmed,Instant createdAt,long version){}
 @Transactional public View saveScan(Long owner,byte[] bytes,PaymentQrDecoder.Decoded d,PaymentQrNameReader.Suggestion suggestion){
  var q=new OwnerPaymentQr();q.setOwnerId(owner);q.setBankBin(d.bankBin());q.setBank(d.bankName());q.setAccountNumber(d.accountNumber());q.setAccountHolderName(suggestion.name());q.setAiStatus(suggestion.status());q.setContentType(d.contentType());q.setContent(bytes);q.setCreatedAt(Instant.now());return view(qrs.saveAndFlush(q));
 }
 @Transactional(readOnly=true) public View current(Jwt jwt){return qrs.findFirstByOwnerIdAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(access.owner(jwt).getId()).map(this::view).orElse(null);}
 @Transactional public View confirm(Jwt jwt,Long id,String name,long version){
  var q=qrs.lockOwned(id,access.owner(jwt).getId()).orElseThrow(OwnerPaymentQrService::missing);em.refresh(q);
  if(q.getConfirmedAt()!=null||q.getVersion()!=version)throw new ApiException(HttpStatus.CONFLICT,"QR_VERSION_CONFLICT","QR đã được xác nhận hoặc thay đổi. Hãy tải lại.");
  q.setAccountHolderName(name.strip());q.setConfirmedAt(Instant.now());qrs.flush();return view(q);
 }
 @Transactional(readOnly=true) public OwnerPaymentQr image(Jwt jwt,Long id){return qrs.findById(id).filter(q->q.getOwnerId().equals(access.owner(jwt).getId())).orElseThrow(OwnerPaymentQrService::missing);}
 private View view(OwnerPaymentQr q){return new View(q.getId().toString(),q.getBank(),q.getBankBin(),q.getAccountNumber(),q.getAccountHolderName(),q.getAiStatus(),q.getConfirmedAt()!=null,q.getCreatedAt(),q.getVersion());}
 public static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy QR thuộc tài khoản hoặc hợp đồng của bạn.");}
}
