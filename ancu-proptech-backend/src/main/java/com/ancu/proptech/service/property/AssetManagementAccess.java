package com.ancu.proptech.service.property;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.auth.AccountVerificationPolicy;
import com.ancu.proptech.service.auth.VerifiedIdentityPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class AssetManagementAccess {
    private final AccountAccessService access;private final AccountVerificationPolicy verification;
    private final PropertyApplicantAccess applicants;private final VerifiedIdentityPolicy identities;
    public AuthAccount read(Jwt jwt){var a=access.account(jwt);if(!a.hasRole(AuthAccount.Role.CUSTOMER)&&!a.hasRole(AuthAccount.Role.OWNER))throw error(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ tài khoản thuê/cho thuê có kho tài sản cá nhân.");return a;}
    public AuthAccount write(Jwt jwt){var a=read(jwt);return a.hasRole(AuthAccount.Role.OWNER)?access.owner(jwt):applicants.verified(jwt);}
    public boolean editable(AuthAccount a){return a.getStatus()==AuthAccount.Status.ACTIVE&&(a.hasRole(AuthAccount.Role.OWNER)?verification.isVerified(a):a.hasRole(AuthAccount.Role.CUSTOMER)&&identities.isVerified(a.getId()));}
}
