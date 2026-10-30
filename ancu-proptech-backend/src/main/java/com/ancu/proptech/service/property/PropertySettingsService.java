package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.PropertySettingsDtos.*;
import com.ancu.proptech.dto.contract.ContractSnapshot;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.persistence.EntityManager;
import java.time.Instant;
@Service @RequiredArgsConstructor
public class PropertySettingsService {
 private final PropertyRepository properties;
 private final PropertySettingsRepository settings;
 private final PropertyDossierRepository dossiers;
 private final AccountAccessService access;
 private final EntityManager em;
 @Transactional(readOnly=true) public View get(Jwt jwt,Long id) {
  var owner=access.owner(jwt);var p=properties.findById(id).filter(x->x.getOwner().getId().equals(owner.getId())).orElseThrow(PropertySettingsService::missing);
  return view(p,settings.findById(id).orElse(null));
 }
 @Transactional public View save(Jwt jwt,Long id,Save input) {
  var owner=access.owner(jwt);var p=properties.findOwnedForCreation(id,owner.getId()).orElseThrow(PropertySettingsService::missing);
  var s=settings.findById(id).orElse(null);
  if(s!=null)em.refresh(s);
  // Version 0 denotes an unconfigured property; existing versions are exposed as JPA version + 1.
  if(input.version()!=(s==null?0:s.getVersion()+1))throw new ApiException(HttpStatus.CONFLICT,"SETTINGS_VERSION_CONFLICT","Cài đặt đã thay đổi. Hãy tải lại trước khi lưu.");
  if(s==null){s=new PropertySettings();s.setProperty(p);}
  s.setElectricityUnitPrice(input.electricityUnitPrice());s.setWaterUnitPrice(input.waterUnitPrice());
  s.setInternetFee(input.internetFee());s.setGarbageFee(input.garbageFee());s.setUpdatedAt(Instant.now());s.setUpdatedBy(owner.getId());
  return view(p,settings.saveAndFlush(s));
 }
 private View view(Property p,PropertySettings s) {
  var d=dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(p.getId()).stream().filter(x->x.getStatus()==PropertyDossier.Status.APPROVED).findFirst().orElse(null);
  return new View(p.getId().toString(),p.getName(),s!=null,s==null?0:s.getVersion()+1,
   s==null?null:s.getElectricityUnitPrice().toPlainString(),s==null?null:s.getWaterUnitPrice().toPlainString(),
   s==null?null:s.getInternetFee().toPlainString(),s==null?null:s.getGarbageFee().toPlainString(),s==null?null:s.getUpdatedAt(),
   d==null?null:new ContractSnapshot.ReceivingAccount(d.getBank(),d.getAccountNumber(),d.getAccountHolderName()));
 }
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy tài sản thuộc tài khoản của bạn.");}
}
