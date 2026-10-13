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
    @Transactional public PropertyDossierResponse submit(Jwt jwt,UUID propertyId,PropertyDossierSubmit input){
        var owner=access.owner(jwt);var p=properties.findOwnedForCreation(propertyId,owner.getId()).orElseThrow(PropertyDossierService::missing);
        if(p.getVersion()!=input.getPropertyVersion())throw conflict("STALE_VERSION","Tài sản đã thay đổi. Hãy tải lại trước khi gửi hồ sơ.");
        if((p.getApprovalStatus()==Property.ApprovalStatus.PENDING_APPROVAL&&dossiers.existsByPropertyId(propertyId))||p.getApprovalStatus()==Property.ApprovalStatus.APPROVED)
            throw conflict("DOSSIER_NOT_EDITABLE","Tài sản đang chờ duyệt hoặc đã được duyệt.");
        var all=new ArrayList<PropertyEvidenceFile>();var seen=new HashSet<UUID>();
        collect(p,input.getDocumentFileIds(),PropertyEvidenceFile.Purpose.RIGHT_DOCUMENT,seen,all);
        collect(p,input.getSupportingFileIds(),PropertyEvidenceFile.Purpose.SUPPORTING,seen,all);
        collect(p,input.getOwnerEvidenceFileIds(),PropertyEvidenceFile.Purpose.OWNER_IDENTITY,seen,all);
        if(all.size()>20)throw bad("Hồ sơ tối đa 20 chứng từ.");
        var d=new PropertyDossier();d.setProperty(p);d.setRightType(input.getRightType());d.setApplicantName(owner.getFullName());
        var bank=input.getReceivingAccount();d.setBank(bank.getBank().strip());d.setAccountNumber(bank.getAccountNumber());d.setAccountHolderName(bank.getAccountHolderName().strip());
        d.setStatus(PropertyDossier.Status.PENDING_APPROVAL);d.setSubmittedAt(Instant.now());d.setFiles(all);
        p.setApprovalStatus(Property.ApprovalStatus.PENDING_APPROVAL);dossiers.saveAndFlush(d);return response(d);
    }
    private void collect(Property p,List<UUID> ids,PropertyEvidenceFile.Purpose purpose,Set<UUID> seen,List<PropertyEvidenceFile> result){
        for(var id:ids){if(!seen.add(id))throw bad("Chứng từ bị trùng trong hồ sơ.");var f=files.findById(id).orElseThrow(PropertyDossierService::missing);
            if(!f.getProperty().getId().equals(p.getId())||f.getPurpose()!=purpose)throw missing();result.add(f);}
    }
    @Transactional(readOnly=true) public List<PropertyDossierResponse> mine(Jwt jwt,UUID propertyId){
        var owner=access.owner(jwt);if(properties.findById(propertyId).filter(p->p.getOwner().getId().equals(owner.getId())).isEmpty())throw missing();
        return dossiers.findByPropertyIdOrderBySubmittedAtDescIdDesc(propertyId).stream().map(this::response).toList();
    }
    @Transactional(readOnly=true) public PageResponse<PropertyDossierResponse> queue(Jwt jwt,PropertyDossier.Status status,int page,int size){
        access.admin(jwt);ApartmentService.validatePage(page,size);var paging=PageRequest.of(page,size,Sort.by("submittedAt","id"));
        return PageResponse.from((status==null?dossiers.findAll(paging):dossiers.findByStatus(status,paging)).map(this::response));
    }
    @Transactional(readOnly=true) public PropertyDossierResponse detail(Jwt jwt,UUID id){access.admin(jwt);return response(dossiers.findById(id).orElseThrow(PropertyDossierService::missing));}
    @Transactional public PropertyDossierResponse decide(Jwt jwt,UUID id,PropertyDossierDecision input){
        var reviewer=access.admin(jwt);var propertyId=dossiers.findPropertyId(id).orElseThrow(PropertyDossierService::missing);
        var p=properties.lockById(propertyId).orElseThrow(PropertyDossierService::missing);var d=dossiers.lockById(id).orElseThrow(PropertyDossierService::missing);
        if(d.getVersion()!=input.getVersion())throw conflict("STALE_VERSION","Hồ sơ đã thay đổi. Hãy tải lại.");
        if(d.getStatus()!=PropertyDossier.Status.PENDING_APPROVAL||p.getApprovalStatus()!=Property.ApprovalStatus.PENDING_APPROVAL)
            throw conflict("DOSSIER_NOT_PENDING","Hồ sơ không còn chờ duyệt.");
        String reason=input.getReason()==null?null:input.getReason().strip();
        if(input.getDecision()!=PropertyDossierDecision.Decision.APPROVE&&(reason==null||reason.isBlank()))throw bad("Vui lòng nhập lý do từ chối hoặc yêu cầu bổ sung.");
        switch(input.getDecision()){
            case APPROVE->{d.setStatus(PropertyDossier.Status.APPROVED);p.setApprovalStatus(Property.ApprovalStatus.APPROVED);}
            case REJECT->{d.setStatus(PropertyDossier.Status.REJECTED);p.setApprovalStatus(Property.ApprovalStatus.REJECTED);}
            case REQUEST_ADDITIONAL_INFORMATION->{d.setStatus(PropertyDossier.Status.NEEDS_INFORMATION);p.setApprovalStatus(Property.ApprovalStatus.NEEDS_INFORMATION);}
        }
        d.setReviewer(reviewer);d.setReviewedAt(Instant.now());d.setReviewReason(reason==null||reason.isBlank()?null:reason);dossiers.flush();return response(d);
    }
    private PropertyDossierResponse response(PropertyDossier d){var p=d.getProperty();return new PropertyDossierResponse(d.getId(),p.getId(),p.getName(),p.getAddress(),d.getApplicantName(),d.getRightType().name(),d.getBank(),d.getAccountNumber(),d.getAccountHolderName(),d.getStatus().name(),d.getFiles().stream().map(PropertyEvidenceService::response).toList(),d.getSubmittedAt(),d.getReviewedAt(),d.getReviewReason(),d.getVersion());}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hồ sơ hoặc chứng từ thuộc quyền truy cập.");}
    private static ApiException conflict(String code,String text){return new ApiException(HttpStatus.CONFLICT,code,text);}
    private static ApiException bad(String text){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",text);}
}
