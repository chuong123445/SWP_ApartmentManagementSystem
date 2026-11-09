package com.ancu.proptech.service.property;

import static com.ancu.proptech.dto.property.PropertyListingDtos.*;
import com.ancu.proptech.model.property.*;
import com.ancu.proptech.repository.property.*;
import com.ancu.proptech.repository.auth.AuthAccountRepository;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class PropertyListingService {
    private final PropertyApplicantAccess access;
    private final AuthAccountRepository accounts;
    private final PropertyRepository properties;
    private final PropertyListingDraftRepository drafts;
    private final PropertyEvidenceFileRepository files;
    private final OwnerPropertyService creation;
    private final PropertyDossierService dossiers;
    private final ObjectMapper json;

    @Transactional public View start(Jwt jwt,Start input){
        var actor=access.verified(jwt);
        accounts.findForIdentityUpdate(actor.getId()).orElseThrow(PropertyListingService::missing);
        String key;
        try {key=UUID.fromString(input.requestKey()).toString();}catch(IllegalArgumentException e){throw bad("Mã bản nháp không hợp lệ.");}
        var previous=drafts.findByRequestKey(key);
        if(previous.isPresent()){
            var d=previous.get();if(!d.getAccountId().equals(actor.getId()))throw missing();
            var p=properties.findById(d.getPropertyId()).orElseThrow(PropertyListingService::missing);
            if(p.getRightType()!=input.rightType())throw bad("Loại quyền không khớp bản nháp.");
            return view(d,p);
        }
        if(drafts.findByAccountIdAndCompletedFalseOrderByUpdatedAtDesc(actor.getId()).size()>=20)throw bad("Bạn có tối đa 20 bản nháp đang chuẩn bị.");
        var p=new Property();p.setOwner(actor);p.setName("Hồ sơ đang chuẩn bị");p.setAddress("");p.setCity("");p.setDistrict("");
        p.setApprovalStatus(Property.ApprovalStatus.DRAFT);p.setRentalMode(Property.RentalMode.SINGLE_UNIT);p.setRightType(input.rightType());p.setOnboardingApplication(true);
        properties.saveAndFlush(p);
        var d=new PropertyListingDraft();d.setPropertyId(p.getId());d.setAccountId(actor.getId());d.setRequestKey(key);d.setPayload("{}");d.setUpdatedAt(Instant.now());
        drafts.saveAndFlush(d);return view(d,p);
    }
    @Transactional(readOnly=true) public List<View> list(Jwt jwt){
        var actor=access.verified(jwt);
        return drafts.findByAccountIdAndCompletedFalseOrderByUpdatedAtDesc(actor.getId()).stream().map(d->view(d,properties.findById(d.getPropertyId()).orElseThrow(PropertyListingService::missing))).toList();
    }
    @Transactional(readOnly=true) public View get(Jwt jwt,Long id){var p=access.read(jwt,id);return view(owned(p),p);}
    @Transactional public View save(Jwt jwt,Long id,Save input){
        var p=access.write(jwt,id);var d=owned(p);editable(d,p,input.version());
        if(input.payload()==null||!input.payload().isObject())throw bad("Bản nháp phải là một đối tượng JSON.");
        String payload=json.writeValueAsString(input.payload());
        if(payload.length()>150_000)throw bad("Bản nháp quá lớn hoặc không hợp lệ.");
        var units=input.payload().path("units");
        if(!units.isMissingNode()&&(!units.isArray()||units.size()>50))throw bad("Bản nháp có tối đa 50 căn/phòng.");
        var step=input.payload().path("step");
        if(!step.isMissingNode()&&(!step.isIntegralNumber()||!step.canConvertToInt()||step.asInt()<0||step.asInt()>4))throw bad("Bước đăng tải không hợp lệ.");
        d.setPayload(payload);d.setUpdatedAt(Instant.now());drafts.flush();return view(d,p);
    }
    @Transactional public View finish(Jwt jwt,Long id,Finish input){
        var p=access.write(jwt,id);var d=owned(p);
        if(d.isCompleted())return view(d,p); // Retried completion never creates duplicate rooms/submissions.
        editable(d,p,input.version());
        if(input.dossier().getRightType()!=p.getRightType())throw bad("Loại quyền không khớp bản nháp.");
        if(!Objects.equals(input.dossier().getPropertyVersion(),p.getVersion()))
            throw new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Thông tin tài sản đã thay đổi. Hãy tải lại.");
        creation.completeListing(jwt,p,input.property());
        d.setCompleted(true);drafts.flush();
        if(Boolean.TRUE.equals(input.submit())){
            input.dossier().setPropertyVersion(p.getVersion());
            dossiers.submit(jwt,id,input.dossier());
        }
        d.setPayload("{}");d.setUpdatedAt(Instant.now());drafts.flush();return view(d,p);
    }
    private PropertyListingDraft owned(Property p){return drafts.findById(p.getId()).filter(d->d.getAccountId().equals(p.getOwner().getId())).orElseThrow(PropertyListingService::missing);}
    private void editable(PropertyListingDraft d,Property p,long version){
        if(d.isCompleted()||p.getApprovalStatus()!=Property.ApprovalStatus.DRAFT)throw new ApiException(HttpStatus.CONFLICT,"LISTING_NOT_EDITABLE","Bản nháp đã hoàn tất hoặc đã gửi duyệt.");
        if(d.getVersion()!=version)throw new ApiException(HttpStatus.CONFLICT,"STALE_VERSION","Bản nháp đã được sửa ở nơi khác. Tải lại trước khi tiếp tục.");
    }
    private View view(PropertyListingDraft d,Property p){return new View(p.getId().toString(),d.getVersion(),p.getVersion(),p.getRightType().name(),d.isCompleted(),json.readTree(d.getPayload()),files.findByPropertyIdOrderByIdAsc(p.getId()).stream().map(PropertyEvidenceService::response).toList());}
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy bản nháp của bạn.");}
    private static ApiException bad(String message){return new ApiException(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",message);}
}
