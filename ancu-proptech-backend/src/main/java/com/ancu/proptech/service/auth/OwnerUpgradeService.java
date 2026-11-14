package com.ancu.proptech.service.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.model.auth.AuthAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @RequiredArgsConstructor
public class OwnerUpgradeService {
    private final AuthService auth;private final VerifiedIdentityPolicy identities;private final Auth0AssetReader assets;
    public record Context(String role,java.util.List<String> roles,boolean identityVerified,boolean assetServiceAvailable,long version){}
    @Transactional(readOnly=true) public Context context(Jwt jwt){var a=auth.authenticate(jwt);return new Context(a.getRole().name(),a.roleNames(),identities.isVerified(a.getId()),assets.isConfigured(),a.getVersion());}
    /** Giữ route cũ để client cũ nhận lỗi rõ ràng; không cấp Owner chỉ vì đồng ý đọc nguồn. */
    @Transactional(readOnly=true) public AuthUserResponse upgrade(Jwt jwt,OwnerUpgradeRequest input){
        var a=auth.authenticate(jwt);if(a.hasRole(AuthAccount.Role.OWNER))return auth.user(a);
        throw AccountService.error(HttpStatus.CONFLICT,"PROPERTY_ONBOARDING_REQUIRED","Hãy chọn hình thức cho thuê và hoàn tất tài sản đầu tiên. Quyền chủ cho thuê được cấp sau khi tài sản hợp lệ.");
    }
}
