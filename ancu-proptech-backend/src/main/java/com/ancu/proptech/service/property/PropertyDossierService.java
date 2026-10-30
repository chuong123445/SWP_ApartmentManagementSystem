package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.property.*;
import com.ancu.proptech.dto.common.PageResponse;
import com.ancu.proptech.exception.common.ApiException;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.apartment.ApartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class PropertyDossierService {
    private final PropertyRepository properties;
    private final PropertyDossierRepository dossiers;
    private final PropertyEvidenceFileRepository files;
    private final AccountAccessService access;
    private final PropertyApplicantAccess applicants;
    private final PropertyRightsPolicy rights;
    private final com.ancu.proptech.repository.auth.AuthAccountRepository accounts;
    private final com.ancu.proptech.repository.auth.ExternalIdentityRepository identities;
    private final com.ancu.proptech.service.property.ai.DossierAiReviewService aiReviews;
    @Transactional public PropertyDossierResponse submit(Jwt jwt,Long propertyId,PropertyDossierSubmit input){
        var p=applicants.write(jwt,propertyId);var owner=p.getOwner();
        if(p.getVersion()!=input.getPropertyVersion())throw conflict("STALE_VERSION","Tài sản đã thay đổi. Hãy tải lại trước khi gửi hồ sơ.");
        boolean renewal=p.getApprovalStatus()==Property.ApprovalStatus.APPROVED&&rights.limited(p);
        if(dossiers.existsByPropertyIdAndStatus(propertyId,PropertyDossier.Status.PENDING_APPROVAL)||
                (p.getApprovalStatus()==Property.ApprovalStatus.APPROVED&&!renewal))
            throw conflict("DOSSIER_NOT_EDITABLE","Tài sản đang chờ duyệt hoặc đã được duyệt.");
        if(p.getRightType()!=null&&p.getRightType()!=input.getRightType())throw bad("Loại quyền không khớp hồ sơ tài sản đã tạo.");
        validateRights(input.getRightType(),input.getRightsValidFrom(),input.getRightsValidUntil(),input.getOriginalLeaseFrom(),input.getOriginalLeaseUntil());
        if(input.getRightType()!=PropertyDossier.RightType.OWNERSHIP&&(clean(input.getPrincipalName())==null||input.getPrincipalDocumentNumber()==null))throw bad("Cần họ tên và số căn cước của chủ sở hữu gốc.");
        if(input.getRightType()==PropertyDossier.RightType.AUTHORIZATION&&input.getAuthorizationFileIds().isEmpty())throw bad("Cần giấy ủy quyền riêng.");
        if(input.getRightType()==PropertyDossier.RightType.SUBLEASE&&(input.getOriginalLeaseFileIds().isEmpty()||input.getSubleaseConsentFileIds().isEmpty()))throw bad("Cần hợp đồng thuê gốc và văn bản cho phép cho thuê lại riêng.");
        var all=new ArrayList<PropertyEvidenceFile>();var seen=new HashSet<Long>();
        collect(p,input.getDocumentFileIds(),PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT,seen,all);
        collect(p,input.getSupportingFileIds(),PropertyEvidenceFile.Purpose.SUPPORTING,seen,all);
        collect(p,input.getOwnerEvidenceFileIds(),PropertyEvidenceFile.Purpose.OWNER_IDENTITY,seen,all);
        collect(p,input.getAuthorizationFileIds(),PropertyEvidenceFile.Purpose.AUTHORIZATION_DOCUMENT,seen,all);
        collect(p,input.getOriginalLeaseFileIds(),PropertyEvidenceFile.Purpose.ORIGINAL_LEASE,seen,all);
        collect(p,input.getSubleaseConsentFileIds(),PropertyEvidenceFile.Purpose.SUBLEASE_CONSENT,seen,all);
        if(all.size()>20)throw bad("Hồ sơ tối đa 20 chứng từ.");
        var identity=identities.findById(owner.getId()).orElseThrow();
        var d=new PropertyDossier();d.setProperty(p);d.setRightType(input.getRightType());d.setApplicantName(identity.getLegalName());d.setApplicantDocumentNumber(identity.getDocumentNumber());d.setRenewal(renewal);
        d.setRightsValidFrom(input.getRightsValidFrom());d.setRightsValidUntil(input.getRightsValidUntil());d.setOriginalLeaseFrom(input.getOriginalLeaseFrom());d.setOriginalLeaseUntil(input.getOriginalLeaseUntil());
        d.setPrincipalName(clean(input.getPrincipalName()));d.setPrincipalDocumentNumber(input.getPrincipalDocumentNumber());
        d.setCertificateNumber(clean(input.getCertificateNumber()));d.setCertificateIssueDate(input.getCertificateIssueDate());
        d.setCertificateIssuePlace(clean(input.getCertificateIssuePlace()));d.setExploitationRightDescription(clean(input.getExploitationRightDescription()));
        var bank=input.getReceivingAccount();d.setBank(bank.getBank().strip());d.setAccountNumber(bank.getAccountNumber());d.setAccountHolderName(bank.getAccountHolderName().strip());
        d.setStatus(PropertyDossier.Status.PENDING_APPROVAL);d.setSubmittedAt(Instant.now());d.setFiles(all);
        if(!renewal)p.setApprovalStatus(Property.ApprovalStatus.PENDING_APPROVAL);dossiers.saveAndFlush(d);aiReviews.enqueue(d);return response(d);
    }
    private void collect(Property p,List<Long> ids,PropertyEvidenceFile.Purpose purpose,Set<Long> seen,List<PropertyEvidenceFile> result){
        for(var id:ids){if(!seen.add(id))throw bad("Chứng từ bị trùng trong hồ sơ.");var f=files.findById(id).orElseThrow(PropertyDossierService::missing);
            if(!f.getProperty().getId().equals(p.getId())||f.getPurpose()!=purpose)throw missing();result.add(f);}
    }
    @Transactional(readOnly=true) public List<PropertyDossierResponse> mine(Jwt jwt,Long propertyId){
        applicants.read(jwt,propertyId);
        return dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(propertyId).stream().map(this::response).toList();
    }
    @Transactional(readOnly=true) public PageResponse<PropertyDossierResponse> queue(Jwt jwt,PropertyDossier.Status status,int page,int size){
        access.admin(jwt);ApartmentService.validatePage(page,size);var paging=PageRequest.of(page,size,Sort.by("submittedAt","id"));
        return PageResponse.from((status==null?dossiers.findAll(paging):dossiers.findByStatus(status,paging)).map(this::response));
    }
    @Transactional(readOnly=true) public PropertyDossierResponse detail(Jwt jwt,Long id){access.admin(jwt);return response(dossiers.findById(id).orElseThrow(PropertyDossierService::missing));}
    @Transactional public PropertyDossierResponse decide(Jwt jwt,Long id,PropertyDossierDecision input){
        var reviewer=access.admin(jwt);var propertyId=dossiers.findPropertyId(id).orElseThrow(PropertyDossierService::missing);
        var applicantId=properties.findById(propertyId).orElseThrow(PropertyDossierService::missing).getOwner().getId();
        var applicant=accounts.findForIdentityUpdate(applicantId).orElseThrow(PropertyDossierService::missing);
        var p=properties.lockById(propertyId).orElseThrow(PropertyDossierService::missing);var d=dossiers.lockById(id).orElseThrow(PropertyDossierService::missing);
        if(d.getVersion()!=input.getVersion())throw conflict("STALE_VERSION","Hồ sơ đã thay đổi. Hãy tải lại.");
        if(d.getStatus()!=PropertyDossier.Status.PENDING_APPROVAL||(!d.isRenewal()&&p.getApprovalStatus()!=Property.ApprovalStatus.PENDING_APPROVAL))
            throw conflict("DOSSIER_NOT_PENDING","Hồ sơ không còn chờ duyệt.");
        String reason=input.getReason()==null?null:input.getReason().strip();
        if(input.getDecision()!=PropertyDossierDecision.Decision.APPROVE&&(reason==null||reason.isBlank()))throw bad("Vui lòng nhập lý do từ chối hoặc yêu cầu bổ sung.");
        switch(input.getDecision()){
            case APPROVE->{
                if(applicant.getStatus()!=com.ancu.proptech.model.auth.AuthAccount.Status.ACTIVE||!identities.existsByAccountIdAndVerificationStatus(applicantId,"VERIFIED"))throw conflict("APPLICANT_NOT_ELIGIBLE","Người nộp cần tài khoản hoạt động và căn cước VNeID đã xác thực.");
                validateRights(d.getRightType(),d.getRightsValidFrom(),d.getRightsValidUntil(),d.getOriginalLeaseFrom(),d.getOriginalLeaseUntil());
                if(d.getRightType()!=PropertyDossier.RightType.OWNERSHIP&&!input.isRightsConfirmed())throw bad("Admin cần xác nhận đã đối chiếu quyền và thời hạn trên giấy tờ.");
                if(p.isOnboardingApplication()){
                    if(applicant.getRole()==com.ancu.proptech.model.auth.AuthAccount.Role.CUSTOMER)applicant.setRole(com.ancu.proptech.model.auth.AuthAccount.Role.OWNER);
                    else if(applicant.getRole()!=com.ancu.proptech.model.auth.AuthAccount.Role.OWNER)throw conflict("APPLICANT_NOT_ELIGIBLE","Tài khoản không phù hợp để nâng cấp.");
                }
                d.setStatus(PropertyDossier.Status.APPROVED);p.setApprovalStatus(Property.ApprovalStatus.APPROVED);
                p.setRightType(d.getRightType());p.setRightsValidFrom(d.getRightsValidFrom());p.setRightsValidUntil(d.getRightsValidUntil());p.setApprovedRightsDossierId(d.getId());
            }
            case REJECT->{d.setStatus(PropertyDossier.Status.REJECTED);if(!d.isRenewal())p.setApprovalStatus(Property.ApprovalStatus.REJECTED);}
            case REQUEST_ADDITIONAL_INFORMATION->{d.setStatus(PropertyDossier.Status.NEEDS_INFORMATION);if(!d.isRenewal())p.setApprovalStatus(Property.ApprovalStatus.NEEDS_INFORMATION);}
        }
        d.setReviewer(reviewer);d.setReviewedAt(Instant.now());d.setReviewReason(reason==null||reason.isBlank()?null:reason);dossiers.flush();return response(d);
    }
    private PropertyDossierResponse response(PropertyDossier d){var p=d.getProperty();return new PropertyDossierResponse(d.getId(),p.getId(),p.getName(),p.getAddress(),d.getApplicantName(),d.getRightType().name(),d.getBank(),d.getAccountNumber(),d.getAccountHolderName(),d.getStatus().name(),d.getFiles().stream().map(PropertyEvidenceService::response).toList(),d.getSubmittedAt(),d.getReviewedAt(),d.getReviewReason(),d.getVersion(),d.getCertificateNumber(),d.getCertificateIssueDate(),d.getCertificateIssuePlace(),d.getExploitationRightDescription(),d.isLocalFixture(),d.getRightsValidFrom(),d.getRightsValidUntil(),d.getOriginalLeaseFrom(),d.getOriginalLeaseUntil(),d.getPrincipalName(),d.getPrincipalDocumentNumber(),d.getApplicantDocumentNumber(),d.isRenewal());}
    private void validateRights(PropertyDossier.RightType type,java.time.LocalDate from,java.time.LocalDate until,java.time.LocalDate originalFrom,java.time.LocalDate originalUntil){
        if(type==PropertyDossier.RightType.OWNERSHIP)return;
        if(from==null||until==null||until.isBefore(from)||until.isBefore(rights.today()))throw bad("Cần thời hạn quyền cho thuê hợp lệ và chưa hết hạn.");
        if(type==PropertyDossier.RightType.SUBLEASE&&(originalFrom==null||originalUntil==null||originalUntil.isBefore(originalFrom)||from.isBefore(originalFrom)||until.isAfter(originalUntil)))throw bad("Quyền cho thuê lại phải nằm trong thời hạn hợp đồng thuê gốc.");
    }
    private static String clean(String text){return text==null||text.isBlank()?null:text.strip();}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hồ sơ hoặc chứng từ thuộc quyền truy cập.");}
    private static ApiException conflict(String code,String text){return new ApiException(HttpStatus.CONFLICT,code,text);}
    private static ApiException bad(String text){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",text);}
}
