package com.ancu.proptech.service.property;
import com.ancu.proptech.model.property.OwnerPaymentQr;
import com.ancu.proptech.repository.property.*;
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
 private final OwnerPaymentQrRepository qrs;private final AccountAccessService access;private final EntityManager em;private final PropertyRepository properties;
 public enum Mode { SHARED, PRIVATE }
 public record View(String id,String bank,String bankBin,String accountNumber,String accountHolderName,String aiStatus,boolean confirmed,Instant createdAt,long version,String propertyId,Long selectionVersion){}
 public record Selection(Mode mode,long version,View sharedQr,View privateQr){}
 @Transactional(readOnly=true) public Long uploadOwner(Jwt jwt,Long propertyId){var owner=access.owner(jwt).getId();if(propertyId!=null)properties.findById(propertyId).filter(p->p.getOwner().getId().equals(owner)).orElseThrow(OwnerPaymentQrService::missing);return owner;}
 @Transactional public View saveScan(Long owner,Long propertyId,byte[] bytes,PaymentQrDecoder.Decoded d,PaymentQrNameReader.Suggestion suggestion){
  if(propertyId!=null)properties.findOwnedForCreation(propertyId,owner).orElseThrow(OwnerPaymentQrService::missing);
  var q=new OwnerPaymentQr();q.setOwnerId(owner);q.setPropertyId(propertyId);q.setBankBin(d.bankBin());q.setBank(d.bankName());q.setAccountNumber(d.accountNumber());q.setAccountHolderName(suggestion.name());q.setAiStatus(suggestion.status());q.setContentType(d.contentType());q.setContent(bytes);q.setCreatedAt(Instant.now());return view(qrs.saveAndFlush(q));
 }
 @Transactional(readOnly=true) public View current(Jwt jwt){return shared(access.owner(jwt).getId());}
 private View shared(Long owner){return qrs.findFirstByOwnerIdAndPropertyIdIsNullAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(owner).map(this::view).orElse(null);}
 @Transactional(readOnly=true) public Selection selection(Jwt jwt,Long id){var owner=access.owner(jwt).getId();var p=properties.findById(id).filter(x->x.getOwner().getId().equals(owner)).orElseThrow(OwnerPaymentQrService::missing);return selection(p,owner);}
 private Selection selection(com.ancu.proptech.model.property.Property p,Long owner){return new Selection(p.getPrivatePaymentQrId()==null?Mode.SHARED:Mode.PRIVATE,p.getVersion(),shared(owner),qrs.findFirstByOwnerIdAndPropertyIdAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(owner,p.getId()).map(this::view).orElse(null));}
 @Transactional public Selection select(Jwt jwt,Long id,Mode mode,long version){
  var owner=access.owner(jwt).getId();var p=properties.findOwnedForCreation(id,owner).orElseThrow(OwnerPaymentQrService::missing);em.refresh(p);
  if(p.getVersion()!=version)throw conflict();
  var own=mode==Mode.PRIVATE?qrs.findFirstByOwnerIdAndPropertyIdAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(owner,id).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"QR_NOT_CONFIGURED","Hãy tải và xác nhận QR riêng cho tài sản trước.")):null;
  p.setPrivatePaymentQrId(own==null?null:own.getId());properties.flush();return selection(p,owner);
 }
 @Transactional public View confirm(Jwt jwt,Long id,String name,long version,Long selectionVersion){
  var owner=access.owner(jwt).getId();var found=qrs.findById(id).filter(x->x.getOwnerId().equals(owner)).orElseThrow(OwnerPaymentQrService::missing);
  var property=found.getPropertyId()==null?null:properties.findOwnedForCreation(found.getPropertyId(),owner).orElseThrow(OwnerPaymentQrService::missing);
  if(property!=null){em.refresh(property);if(selectionVersion==null||property.getVersion()!=selectionVersion)throw conflict();}
  var q=qrs.lockOwned(id,owner).orElseThrow(OwnerPaymentQrService::missing);em.refresh(q);
  if(q.getConfirmedAt()!=null||q.getVersion()!=version)throw conflict();
  q.setAccountHolderName(name.strip());q.setConfirmedAt(Instant.now());qrs.flush();
  if(property!=null){property.setPrivatePaymentQrId(q.getId());properties.flush();}return view(q);
 }
 @Transactional(readOnly=true) public OwnerPaymentQr image(Jwt jwt,Long id){var owner=access.owner(jwt).getId();return qrs.findById(id).filter(q->q.getOwnerId().equals(owner)).orElseThrow(OwnerPaymentQrService::missing);}
 private View view(OwnerPaymentQr q){return new View(q.getId().toString(),q.getBank(),q.getBankBin(),q.getAccountNumber(),q.getAccountHolderName(),q.getAiStatus(),q.getConfirmedAt()!=null,q.getCreatedAt(),q.getVersion(),q.getPropertyId()==null?null:q.getPropertyId().toString(),q.getPropertyId()==null?null:properties.findById(q.getPropertyId()).orElseThrow(OwnerPaymentQrService::missing).getVersion());}
 private static ApiException conflict(){return new ApiException(HttpStatus.CONFLICT,"QR_VERSION_CONFLICT","QR hoặc lựa chọn tài sản đã thay đổi. Hãy tải lại trước khi lưu.");}
 public static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy QR hoặc tài sản thuộc tài khoản của bạn.");}
}
