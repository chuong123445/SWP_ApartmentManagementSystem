package com.ancu.proptech.service.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @RequiredArgsConstructor
public class OwnerUpgradeService {
    private final AuthService auth;private final ExternalIdentityRepository identities;private final Auth0AssetReader assets;
    public record Context(String role,boolean identityVerified,boolean assetServiceAvailable,long version){}
    @Transactional(readOnly=true) public Context context(Jwt jwt){var a=auth.authenticate(jwt);return new Context(a.getRole().name(),identities.existsByAccountIdAndVerificationStatus(a.getId(),"VERIFIED"),assets.isConfigured(),a.getVersion());}
    /** Giữ route cũ để client cũ nhận lỗi rõ ràng; không cấp Owner chỉ vì đồng ý đọc nguồn. */
    @Transactional(readOnly=true) public AuthUserResponse upgrade(Jwt jwt,OwnerUpgradeRequest input){
        var a=auth.authenticate(jwt);if(a.getRole()==AuthAccount.Role.OWNER)return auth.user(a);
        throw AccountService.error(HttpStatus.CONFLICT,"PROPERTY_ONBOARDING_REQUIRED","Hãy chọn hình thức cho thuê và hoàn tất tài sản đầu tiên. Quyền chủ cho thuê được cấp sau khi tài sản hợp lệ.");
    }
}
