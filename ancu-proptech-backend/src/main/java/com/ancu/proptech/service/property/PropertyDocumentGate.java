package com.ancu.proptech.service.property;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.property.ai.DossierAiReport;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class PropertyDocumentGate {
 private final PropertyDocumentCheckRepository checks;
 private final PropertyEvidenceFileRepository files;
 private final PropertyApplicantAccess access;
 private final jakarta.persistence.EntityManager em;
 @Transactional public String begin(Jwt jwt,Long propertyId,long propertyVersion,Long fileId){String token=UUID.randomUUID().toString();store(jwt,propertyId,propertyVersion,fileId,token,null,false);return token;}
 @Transactional public boolean complete(Jwt jwt,Long propertyId,long propertyVersion,Long fileId,String token,DossierAiReport.FileReview review){return store(jwt,propertyId,propertyVersion,fileId,token,review,true);}
 private boolean store(Jwt jwt,Long propertyId,long propertyVersion,Long fileId,String token,DossierAiReport.FileReview review,boolean completing){
  var p=access.write(jwt,propertyId);if(p.getVersion()!=propertyVersion)throw new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Thông tin tài sản đã thay đổi. Hãy quét lại.");
  var file=files.findById(fileId).filter(f->f.getProperty().getId().equals(propertyId)&&f.getUploader().getId().equals(p.getOwner().getId())).orElseThrow(PropertyDocumentGate::blocked);
  boolean accepted=review!=null&&review.readable()&&Boolean.TRUE.equals(review.purposeMatch())&&file.getPurpose().name().equals(review.documentType());
  var check=checks.findById(fileId).orElseGet(PropertyDocumentCheck::new);
  if(check.getFileId()!=null)em.refresh(check,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
  if(completing&&!Objects.equals(token,check.getScanToken()))throw new ApiException(HttpStatus.CONFLICT,"STALE_SCAN","Đã có lần quét mới hơn. Hãy tải lại kết quả.");
  check.setScanToken(token);check.setFileId(fileId);check.setPropertyId(propertyId);check.setPurpose(file.getPurpose().name());check.setAccepted(accepted);check.setCheckedAt(Instant.now());checks.saveAndFlush(check);return accepted;
 }
 public List<String> acceptedIds(Property p){return files.findByPropertyIdOrderByIdAsc(p.getId()).stream().filter(f->checks.findById(f.getId()).filter(c->c.isAccepted()&&p.getId().equals(c.getPropertyId())&&f.getPurpose().name().equals(c.getPurpose())).isPresent()).map(f->f.getId().toString()).toList();}
 public void require(Property p,Collection<Long> selected){
  if(selected==null||selected.isEmpty()||selected.size()>20||new HashSet<>(selected).size()!=selected.size())throw blocked();
  var purposes=EnumSet.noneOf(PropertyEvidenceFile.Purpose.class);
  for(Long id:selected){
   if(id==null)throw blocked();var f=files.findById(id).filter(x->x.getProperty().getId().equals(p.getId())&&x.getUploader().getId().equals(p.getOwner().getId())).orElseThrow(PropertyDocumentGate::blocked);
   var check=checks.findById(id).orElseThrow(PropertyDocumentGate::blocked);
   if(!check.isAccepted()||!p.getId().equals(check.getPropertyId())||!f.getPurpose().name().equals(check.getPurpose()))throw blocked();purposes.add(f.getPurpose());
  }
  if(!purposes.contains(PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT))throw blocked();
  if(p.getRightType()==PropertyDossier.RightType.AUTHORIZATION&&!purposes.contains(PropertyEvidenceFile.Purpose.AUTHORIZATION_DOCUMENT))throw blocked();
  if(p.getRightType()==PropertyDossier.RightType.SUBLEASE&&(!purposes.contains(PropertyEvidenceFile.Purpose.ORIGINAL_LEASE)||!purposes.contains(PropertyEvidenceFile.Purpose.SUBLEASE_CONSENT)))throw blocked();
 }
 private static ApiException blocked(){return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"DOCUMENT_SCAN_REQUIRED","Giấy tờ chưa được AI xác nhận đúng loại hoặc không đọc được. Hãy tải lại giấy tờ phù hợp và quét thành công trước khi tiếp tục.");}
}
