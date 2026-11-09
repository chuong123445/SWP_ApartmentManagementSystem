package com.ancu.proptech.service.property.ai;

import static com.ancu.proptech.dto.property.OwnerPrecheckDtos.*;
import com.ancu.proptech.dto.property.PropertyDossierSubmit;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.ai.AssistanceRunRepository;
import com.ancu.proptech.service.ai.*;
import com.ancu.proptech.service.property.PropertyApplicantAccess;
import com.ancu.proptech.service.auth.VerifiedIdentityPolicy;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class OwnerPrecheckService {
 public static final String PROMPT="owner-precheck-v1";
 private final PropertyApplicantAccess access;private final PropertyEvidenceFileRepository files;private final PropertyEvidenceContentRepository contents;
 private final PropertyDossierRepository dossiers;private final DossierAiClient client;private final AssistanceAudit audit;private final AssistanceLimit limit;private final ObjectMapper json;private final PlatformTransactionManager manager;private final VerifiedIdentityPolicy identities;private final AssistanceRunRepository runs;
 @Value("${app.assistance-ai.enabled:false}") private boolean enabled;
 private record Snapshot(Long actor,long version,String hash,List<String> checklist,List<File> files,JsonNode fields,DossierAiClient.Document document){}
 private <T>T read(java.util.function.Supplier<T> work){var tx=new TransactionTemplate(manager);tx.setReadOnly(true);return tx.execute(s->work.get());}
 public View check(Jwt jwt,Long propertyId,Request input){return checkInternal(jwt,propertyId,input,false);}
 public View extract(Jwt jwt,Long propertyId,Request input){return checkInternal(jwt,propertyId,input,true);}
 private View checkInternal(Jwt jwt,Long propertyId,Request input,boolean extract){
  var snapshot=read(()->snapshot(jwt,propertyId,input.draft(),input.fileId()));
  if(input.fileId()==null)return view(snapshot,null,null,null);
  if(!Boolean.TRUE.equals(input.consent()))throw bad("Cần đồng ý gửi thông tin và tệp đã chọn đến Gemini.");
  if(!snapshot.hash().equals(input.sourceHash()))throw stale();
  try(var slot=limit.acquire("precheck:"+snapshot.actor(),40)){
   var run=audit.startHashed("OWNER_PRECHECK",snapshot.actor(),propertyId,snapshot.hash(),extract?"property-extraction-v1":PROMPT);
   try{
    if(!enabled)throw GeminiAssistanceClient.failure("AI_NOT_CONFIGURED");
    var response=extract?client.extract(json.valueToTree(Map.of("rightType",input.draft().getRightType())),snapshot.document()):client.analyzeOwner(snapshot.fields(),snapshot.document());
    var review=DossierAiReport.parse(json.valueToTree(response),snapshot.document().id());
    // Revalidate after network I/O, without holding property/database locks while waiting.
    var current=read(()->snapshot(jwt,propertyId,input.draft(),null));if(!snapshot.hash().equals(current.hash()))throw stale();
    var result=view(snapshot,run.getId(),run.getModel(),review);
    if(extract)result=new View(result.sourceHash(),result.propertyVersion(),List.of(),result.files(),result.runId(),result.model(),"property-extraction-v1",result.finishedAt(),result.review());audit.finish(run.getId(),json.writeValueAsString(result),null);return result;
   }catch(DossierAiClient.Failure e){audit.finish(run.getId(),null,e.code);throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"AI_"+e.code,"Quét tệp chưa thành công. Bạn vẫn có thể kiểm tra và nộp hồ sơ theo cách thông thường.");}
   catch(ApiException e){audit.finish(run.getId(),null,e.code);throw e;}catch(RuntimeException e){audit.finish(run.getId(),null,"AI_PROCESSING_FAILED");throw GeminiAssistanceClient.failure("AI_PROCESSING_FAILED");}
  }catch(ApiException e){throw e;}catch(Exception e){throw GeminiAssistanceClient.failure("AI_UNAVAILABLE");}
 }
 private View view(Snapshot s,String run,String model,DossierAiReport.FileReview review){return new View(s.hash(),s.version(),s.checklist(),s.files(),run,model,PROMPT,review==null?null:Instant.now(),review==null?null:json.valueToTree(review));}
 private Snapshot snapshot(Jwt jwt,Long propertyId,PropertyDossierSubmit draft,Long selected){
  var p=access.read(jwt,propertyId);
  if(draft==null||draft.getPropertyVersion()==null||draft.getRightType()==null||json.writeValueAsString(draft).length()>20000)throw bad("Dữ liệu bản nháp không hợp lệ.");
  if(p.getVersion()!=draft.getPropertyVersion())throw stale();
  if(dossiers.existsByPropertyIdAndStatus(propertyId,PropertyDossier.Status.PENDING_APPROVAL)||(p.getApprovalStatus()==Property.ApprovalStatus.APPROVED&&(p.getRightType()==null||p.getRightType()==PropertyDossier.RightType.OWNERSHIP)))throw new ApiException(HttpStatus.CONFLICT,"DOSSIER_NOT_EDITABLE","Hồ sơ đang chờ duyệt hoặc tài sản đã được duyệt.");
  if(p.getRightType()!=null&&p.getRightType()!=draft.getRightType())throw bad("Loại quyền không khớp tài sản.");
  var groups=new LinkedHashMap<PropertyEvidenceFile.Purpose,List<Long>>();groups.put(PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT,draft.getDocumentFileIds());groups.put(PropertyEvidenceFile.Purpose.SUPPORTING,draft.getSupportingFileIds());groups.put(PropertyEvidenceFile.Purpose.OWNER_IDENTITY,draft.getOwnerEvidenceFileIds());groups.put(PropertyEvidenceFile.Purpose.AUTHORIZATION_DOCUMENT,draft.getAuthorizationFileIds());groups.put(PropertyEvidenceFile.Purpose.ORIGINAL_LEASE,draft.getOriginalLeaseFileIds());groups.put(PropertyEvidenceFile.Purpose.SUBLEASE_CONSENT,draft.getSubleaseConsentFileIds());
  var manifest=new ArrayList<File>();var seen=new HashSet<Long>();DossierAiClient.Document document=null;
  for(var group:groups.entrySet()){
   if(group.getValue()==null||group.getValue().size()>20)throw bad("Danh sách tệp không hợp lệ.");
   for(var id:group.getValue()){
    if(id==null||!seen.add(id)||seen.size()>20)throw bad("Tối đa 20 tệp khác nhau trong hồ sơ.");
    var f=files.findById(id).filter(x->x.getProperty().getId().equals(propertyId)&&x.getUploader().getId().equals(p.getOwner().getId())&&x.getPurpose()==group.getKey()).orElseThrow(OwnerPrecheckService::missing);
    manifest.add(new File(id.toString(),f.getFilename(),f.getPurpose().name()));
    if(id.equals(selected)){byte[] bytes=contents.findById(id).orElseThrow(OwnerPrecheckService::missing).getContent();document=new DossierAiClient.Document(id.toString(),f.getPurpose().name(),f.getContentType(),f.getFilename(),bytes);}
   }
  }
  if(selected!=null&&document==null)throw missing();
  var checklist=new ArrayList<String>();
  if(draft.getDocumentFileIds().isEmpty())checklist.add("Thiếu giấy tờ sở hữu hoặc quyền khai thác.");
  if(draft.getRightType()==PropertyDossier.RightType.AUTHORIZATION&&draft.getAuthorizationFileIds().isEmpty())checklist.add("Thiếu giấy ủy quyền riêng.");
  if(draft.getRightType()==PropertyDossier.RightType.SUBLEASE){if(draft.getOriginalLeaseFileIds().isEmpty())checklist.add("Thiếu hợp đồng thuê gốc.");if(draft.getSubleaseConsentFileIds().isEmpty())checklist.add("Thiếu văn bản riêng cho phép cho thuê lại.");}
  if(!draft.isCertificateComplete())checklist.add("Thông tin giấy chứng nhận phải đủ số, ngày cấp và nơi cấp.");
  if(draft.getRightType()!=PropertyDossier.RightType.OWNERSHIP){
   if(blank(draft.getPrincipalName())||draft.getPrincipalDocumentNumber()==null||!draft.getPrincipalDocumentNumber().matches("[0-9]{12}"))checklist.add("Thiếu thông tin hợp lệ của chủ sở hữu gốc.");
   if(draft.getRightsValidFrom()==null||draft.getRightsValidUntil()==null||draft.getRightsValidFrom().isAfter(draft.getRightsValidUntil()))checklist.add("Thời hạn quyền cho thuê chưa hợp lệ.");
   if(draft.getRightType()==PropertyDossier.RightType.SUBLEASE&&(draft.getOriginalLeaseFrom()==null||draft.getOriginalLeaseUntil()==null||draft.getRightsValidFrom()==null||draft.getRightsValidUntil()==null||draft.getOriginalLeaseFrom().isAfter(draft.getOriginalLeaseUntil())||draft.getRightsValidFrom().isBefore(draft.getOriginalLeaseFrom())||draft.getRightsValidUntil().isAfter(draft.getOriginalLeaseUntil())))checklist.add("Thời hạn cho thuê lại phải nằm trong hợp đồng thuê gốc.");
  }
  var fields=new LinkedHashMap<String,Object>();fields.put("propertyName",p.getName());fields.put("propertyAddress",p.getAddress());fields.put("city",p.getCity());fields.put("district",p.getDistrict());fields.put("ward",p.getWard());fields.put("rightType",draft.getRightType());
  fields.put("applicantName",identities.verified(p.getOwner().getId()).map(x->x.getLegalName()).orElse(p.getOwner().getFullName()));fields.put("principalName",draft.getPrincipalName());fields.put("certificateNumber",draft.getCertificateNumber());fields.put("certificateIssueDate",draft.getCertificateIssueDate());fields.put("certificateIssuePlace",draft.getCertificateIssuePlace());fields.put("exploitationRightDescription",draft.getExploitationRightDescription());fields.put("rightsValidFrom",draft.getRightsValidFrom());fields.put("rightsValidUntil",draft.getRightsValidUntil());fields.put("originalLeaseFrom",draft.getOriginalLeaseFrom());fields.put("originalLeaseUntil",draft.getOriginalLeaseUntil());
  String hash=AssistanceAudit.hash(json.writeValueAsString(List.of(p.getVersion(),draft,manifest,fields)));
  return new Snapshot(p.getOwner().getId(),p.getVersion(),hash,List.copyOf(checklist),List.copyOf(manifest),json.valueToTree(fields),document);
 }
 public void acknowledge(Jwt jwt,Long propertyId,String id,Acknowledge input){
  var current=read(()->snapshot(jwt,propertyId,input.draft(),null));if(!current.hash().equals(input.sourceHash()))throw stale();
  new TransactionTemplate(manager).execute(s->{var r=runs.lockById(id).filter(x->"OWNER_PRECHECK".equals(x.getTask())&&Objects.equals(x.getAccountId(),current.actor())&&Objects.equals(x.getPropertyId(),propertyId)&&"COMPLETED".equals(x.getStatus())).orElseThrow(OwnerPrecheckService::missing);
   if(!json.readTree(r.getResultJson()).path("sourceHash").asString().equals(current.hash()))throw stale();r.setAcceptedAt(Instant.now());r.setAcceptedJson(json.writeValueAsString(Map.of("sourceHash",current.hash(),"reviewed",true)));runs.saveAndFlush(r);return null;});
 }
 private static boolean blank(String s){return s==null||s.isBlank();}
 private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy chứng từ hoặc kết quả thuộc tài khoản của bạn.");}
 private static ApiException stale(){return new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Bản nháp hoặc chứng từ đã thay đổi. Hãy kiểm tra và quét lại.");}
 private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",message);}
}
