package com.ancu.proptech.service.property;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.OwnerPaymentQrRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service @RequiredArgsConstructor
public class PropertyPaymentQrResolver {
 private final OwnerPaymentQrRepository qrs;
 public OwnerPaymentQr resolve(Property property){
  if(property.getPrivatePaymentQrId()!=null)return qrs.findById(property.getPrivatePaymentQrId()).filter(q->q.getConfirmedAt()!=null&&q.getOwnerId().equals(property.getOwner().getId())&&property.getId().equals(q.getPropertyId())).orElseThrow(OwnerPaymentQrService::missing);
  return qrs.findFirstByOwnerIdAndPropertyIdIsNullAndConfirmedAtNotNullOrderByConfirmedAtDescIdDesc(property.getOwner().getId()).orElse(null);
 }
}
