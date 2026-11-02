package com.ancu.proptech.service.property;
import com.ancu.proptech.model.auth.AuthAccount;
import com.ancu.proptech.service.auth.AccountAccessService;
import com.ancu.proptech.service.auth.AccountVerificationPolicy;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class AssetManagementAccess {
    private final AccountAccessService access;private final AccountVerificationPolicy verification;
    private final PropertyApplicantAccess applicants;private final ExternalIdentityRepository identities;
    public AuthAccount read(Jwt jwt){var a=access.account(jwt);if(a.getRole()!=AuthAccount.Role.CUSTOMER&&a.getRole()!=AuthAccount.Role.OWNER)throw error(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ tài khoản thuê/cho thuê có kho tài sản cá nhân.");return a;}
    public AuthAccount write(Jwt jwt){var a=read(jwt);return a.getRole()==AuthAccount.Role.OWNER?access.owner(jwt):applicants.verified(jwt);}
    public boolean editable(AuthAccount a){return a.getStatus()==AuthAccount.Status.ACTIVE&&(a.getRole()==AuthAccount.Role.OWNER?verification.isVerified(a):a.getRole()==AuthAccount.Role.CUSTOMER&&identities.existsByAccountIdAndVerificationStatus(a.getId(),"VERIFIED"));}
}
