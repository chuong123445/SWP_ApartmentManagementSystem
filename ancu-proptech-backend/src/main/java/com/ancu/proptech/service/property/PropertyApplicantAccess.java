package com.ancu.proptech.service.property;

import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.model.property.Property;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import com.ancu.proptech.repository.property.PropertyRepository;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.exception.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

/** Quyền nộp hồ sơ độc lập với quyền quản lý Owner; tuyệt đối không cấp Owner từ client. */
@Service @RequiredArgsConstructor
public class PropertyApplicantAccess {
    private final AccountAccessService access;
    private final ExternalIdentityRepository identities;
    private final PropertyRepository properties;
    public AuthAccount verified(Jwt jwt) {
        var a=access.account(jwt);
        if(a.getStatus()!=AuthAccount.Status.ACTIVE || (a.getRole()!=AuthAccount.Role.CUSTOMER && a.getRole()!=AuthAccount.Role.OWNER))
            throw new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","Tài khoản không đủ điều kiện nộp hồ sơ.");
        if(!identities.existsByAccountIdAndVerificationStatus(a.getId(),"VERIFIED"))
            throw new ApiException(HttpStatus.FORBIDDEN,"VNEID_REQUIRED","Cần xác thực CCCD qua VNeID trước khi gửi yêu cầu hoặc hồ sơ cho thuê.");
        return a;
    }
    public Property write(Jwt jwt,java.util.UUID id) {
        var a=verified(jwt);
        return properties.findOwnedForCreation(id,a.getId()).filter(p->a.getRole()==AuthAccount.Role.OWNER || p.isOnboardingApplication()).orElseThrow(PropertyApplicantAccess::missing);
    }
    public Property read(Jwt jwt,java.util.UUID id) {
        var a=access.account(jwt);
        if(a.getRole()==AuthAccount.Role.OWNER)access.owner(jwt);else verified(jwt);
        return properties.findById(id).filter(p->p.getOwner().getId().equals(a.getId()) && (a.getRole()==AuthAccount.Role.OWNER || p.isOnboardingApplication())).orElseThrow(PropertyApplicantAccess::missing);
    }
    private static ApiException missing(){return new ApiException(HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND","Không tìm thấy hồ sơ tài sản thuộc tài khoản của bạn.");}
}
