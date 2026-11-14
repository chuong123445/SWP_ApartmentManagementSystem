package com.ancu.proptech.service.identity;
import com.ancu.proptech.dto.identity.*;
import static com.ancu.proptech.dto.identity.IdentitySubmissionDtos.*;
import com.ancu.proptech.model.identity.*;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.identity.*;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.data.domain.*;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class IdentityReviewService {
 public static final String SOURCE="ADMIN_REVIEW",ISSUER="urn:ancu:admin-review";
 private final IdentitySubmissionRepository submissions;
 private final IdentitySubmissionImagesRepository images;
 private final IdentityProfileRepository profiles;
 private final IdentityDocumentsRepository documents;
 private final AuthAccountRepository accounts;
 private final ExternalIdentityRepository identities;
 private final AccountAccessService access;
 private final ObjectMapper json;
 private final jakarta.persistence.EntityManager em;
 @Transactional(readOnly=true) public View mine(Jwt jwt){return submissions.findFirstByAccountIdOrderByIdDesc(access.account(jwt).getId()).map(this::view).orElse(null);}
 @Transactional public View submit(Jwt jwt,Submit input){
  var actor=access.account(jwt);var account=accounts.findForIdentityUpdate(actor.getId()).orElseThrow(IdentityReviewService::missing);em.refresh(account);
  if(account.hasRole(AuthAccount.Role.ADMIN))throw error(HttpStatus.FORBIDDEN,"FORBIDDEN","Admin không tự gửi hồ sơ để tự duyệt.");
  if(identities.existsById(account.getId()))throw conflict("Tài khoản đã có căn cước xác thực. Không ghi đè hồ sơ hiện tại.");
  if(!Boolean.TRUE.equals(input.consent()))throw error(HttpStatus.BAD_REQUEST,"CONSENT_REQUIRED","Cần đồng ý gửi hồ sơ và ảnh căn cước cho Admin xét duyệt.");
  if(submissions.existsByAccountIdAndStatus(account.getId(),IdentitySubmission.Status.PENDING))throw conflict("Hồ sơ đang chờ Admin duyệt.");
  var profile=profiles.findById(account.getId()).orElseThrow(()->error(HttpStatus.BAD_REQUEST,"IDENTITY_REQUIRED","Lưu đầy đủ thông tin và hai ảnh căn cước trước khi gửi."));
  if(profile.getVersion()!=input.profileVersion())throw conflict("Hồ sơ đã thay đổi. Tải lại trước khi gửi.");
  if(profile.isLocalFixture())throw error(HttpStatus.BAD_REQUEST,"SAMPLE_DOCUMENTS","Cần thay cả hai ảnh minh họa bằng ảnh căn cước của bạn trước khi gửi.");
  if(profile.getCurrentAddress().length()>300)throw error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Địa chỉ hiện tại tối đa 300 ký tự khi gửi xác thực.");
  var original=documents.findById(account.getId()).orElseThrow(IdentityReviewService::missing);
  var s=new IdentitySubmission();s.setAccountId(account.getId());s.setProfileVersion(profile.getVersion());s.setSubmittedAt(Instant.now());s.setSnapshotJson(json.writeValueAsString(IdentityProfileService.response(profile)));submissions.saveAndFlush(s);
  var copy=new IdentitySubmissionImages();copy.setId(s.getId());copy.setFrontContent(original.getFrontContent().clone());copy.setFrontContentType(original.getFrontContentType());copy.setBackContent(original.getBackContent().clone());copy.setBackContentType(original.getBackContentType());images.saveAndFlush(copy);
  return view(s);
 }
 @Transactional(readOnly=true) public Listing list(Jwt jwt,IdentitySubmission.Status status,int page){
  access.admin(jwt);if(page<0||page>100000)throw error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR","Trang không hợp lệ.");
  var result=submissions.findByStatus(status,PageRequest.of(page,10,Sort.by("submittedAt").ascending().and(Sort.by("id").ascending())));
  return new Listing(result.map(this::view).getContent(),page,result.getTotalPages(),result.getTotalElements());
 }
 @Transactional(readOnly=true) public View detail(Jwt jwt,Long id){access.admin(jwt);return view(submissions.findById(id).orElseThrow(IdentityReviewService::missing));}
 @Transactional(readOnly=true) public IdentityProfileService.Image image(Jwt jwt,Long id,String side){
  access.admin(jwt);if(!Set.of("front","back").contains(side))throw missing();
  var stored=images.findById(id).orElseThrow(IdentityReviewService::missing);
  return side.equals("front")?new IdentityProfileService.Image(stored.getFrontContent(),stored.getFrontContentType()):new IdentityProfileService.Image(stored.getBackContent(),stored.getBackContentType());
 }
 @Transactional public View decide(Jwt jwt,Long id,Decision input){
  var admin=access.admin(jwt);var initial=submissions.findById(id).orElseThrow(IdentityReviewService::missing);
  if(initial.getAccountId().equals(admin.getId()))throw error(HttpStatus.FORBIDDEN,"FORBIDDEN","Không được duyệt hồ sơ của chính mình.");
  var account=accounts.findForIdentityUpdate(initial.getAccountId()).orElseThrow(IdentityReviewService::missing);em.refresh(account);
  var s=submissions.lockById(id).orElseThrow(IdentityReviewService::missing);em.refresh(s);
  if(s.getStatus()!=IdentitySubmission.Status.PENDING||s.getVersion()!=input.version())throw conflict("Hồ sơ đã được xử lý hoặc thay đổi. Hãy tải lại.");
  String reason=input.reason()==null?"":input.reason().strip();
  if(input.action()==Action.REJECT&&reason.isBlank())throw error(HttpStatus.BAD_REQUEST,"REASON_REQUIRED","Cần ghi lý do để người gửi bổ sung hồ sơ.");
  if(input.action()==Action.APPROVE){
   if(account.getStatus()!=AuthAccount.Status.ACTIVE&&account.getStatus()!=AuthAccount.Status.PENDING_VERIFICATION)throw conflict("Tài khoản đang bị khóa/ngừng hoạt động. Không thể duyệt xác thực.");
   if(identities.existsById(account.getId()))throw conflict("Tài khoản đã xác thực qua phương thức khác. Không ghi đè.");
   var profile=json.readValue(s.getSnapshotJson(),IdentityProfileResponse.class);
   if(identities.existsByDocumentNumber(profile.documentNumber()))throw conflict("Số căn cước đã được xác thực cho tài khoản khác.");
   var evidence=new ExternalIdentity();evidence.setAccountId(account.getId());evidence.setIssuer(ISSUER);evidence.setSubject(account.getId().toString());evidence.setSource(SOURCE);evidence.setVerificationStatus("VERIFIED");evidence.setVerifiedAt(Instant.now());
   evidence.setDocumentNumber(profile.documentNumber());evidence.setLegalName(profile.legalName());evidence.setDateOfBirth(profile.dateOfBirth());evidence.setGender("Không khai báo");evidence.setAddress(profile.currentAddress());evidence.setPermanentAddress(profile.permanentAddress());evidence.setDocumentIssueDate(profile.issueDate());evidence.setDocumentIssuePlace(profile.issuePlace());identities.saveAndFlush(evidence);
   account.setIdentityVerified(true);account.setContactVerified(true);if(account.getStatus()==AuthAccount.Status.PENDING_VERIFICATION)account.setStatus(AuthAccount.Status.ACTIVE);accounts.saveAndFlush(account);
   s.setStatus(IdentitySubmission.Status.APPROVED);
  }else s.setStatus(IdentitySubmission.Status.REJECTED);
  s.setReviewerId(admin.getId());s.setReviewedAt(Instant.now());s.setReason(reason.isBlank()?null:reason);submissions.saveAndFlush(s);return view(s);
 }
 private View view(IdentitySubmission s){return new View(s.getId().toString(),s.getAccountId().toString(),json.readValue(s.getSnapshotJson(),IdentityProfileResponse.class),s.getStatus().name(),s.getSubmittedAt(),s.getReviewerId()==null?null:s.getReviewerId().toString(),s.getReviewedAt(),s.getReason(),s.getVersion());}
 private static ApiException missing(){return error(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hồ sơ căn cước.");}
 private static ApiException conflict(String message){return error(HttpStatus.CONFLICT,"IDENTITY_REVIEW_CONFLICT",message);}
 private static ApiException error(HttpStatus status,String code,String message){return new ApiException(status,code,message);}
}
