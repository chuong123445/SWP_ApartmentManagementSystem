package com.ancu.proptech.service.auth;
import com.ancu.proptech.dto.auth.*;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.repository.auth.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.UUID;
import static com.ancu.proptech.service.auth.AccountService.error;

@Service @RequiredArgsConstructor
public class OwnerUpgradeService {
    private final AuthService auth;private final AuthAccountRepository accounts;
    private final ExternalIdentityRepository identities;private final OwnerUpgradeRepository upgrades;
    private final Auth0AssetReader assets;private final TransactionTemplate transactions;private final EntityManager em;
    public record Context(String role,boolean identityVerified,boolean assetServiceAvailable,long version){}
    private record Binding(UUID accountId,String issuer,String subject){}
    @Transactional(readOnly=true) public Context context(Jwt jwt){var account=auth.authenticate(jwt);return new Context(account.getRole().name(),identities.existsByAccountIdAndVerificationStatus(account.getId(),"VERIFIED"),assets.isConfigured(),account.getVersion());}
    public AuthUserResponse upgrade(Jwt jwt,OwnerUpgradeRequest input){
        Binding binding=transactions.execute(status->{
            var account=auth.authenticate(jwt);requireUsable(account);
            if(account.getRole()==AuthAccount.Role.OWNER)return null;
            requireCustomer(account);
            var identity=identities.findById(account.getId()).filter(i->"VERIFIED".equals(i.getVerificationStatus())).orElseThrow(()->error(HttpStatus.FORBIDDEN,"VNEID_REQUIRED","Cần xác thực CCCD qua VNeID trước khi nâng cấp thành chủ cho thuê."));
            return new Binding(account.getId(),identity.getIssuer(),identity.getSubject());
        });
        if(binding==null)return auth.user(auth.authenticate(jwt));
        // Đọc provider ngoài transaction/row lock; không tin assetCount từ trình duyệt.
        int count=assets.rentableAssets(binding.issuer(),binding.subject()).size();
        if(count<1)throw error(HttpStatus.FORBIDDEN,"OWNER_ASSET_REQUIRED","VNeID chưa có tài sản cho thuê hợp lệ. Tài khoản chưa được nâng cấp.");
        return transactions.execute(status->{
            em.clear();var account=auth.authenticate(jwt);em.refresh(account,LockModeType.PESSIMISTIC_WRITE);requireUsable(account);
            if(account.getRole()==AuthAccount.Role.OWNER)return auth.user(account);
            requireCustomer(account);
            if(account.getVersion()!=input.getVersion())throw error(HttpStatus.CONFLICT,"VERSION_CONFLICT","Tài khoản đã thay đổi. Hãy tải lại trang.");
            var current=identities.findById(account.getId()).orElseThrow();
            if(!"VERIFIED".equals(current.getVerificationStatus())||!current.getIssuer().equals(binding.issuer())||!current.getSubject().equals(binding.subject()))throw error(HttpStatus.CONFLICT,"VNEID_LINK_CHANGED","Liên kết VNeID đã thay đổi. Hãy tải lại trang.");
            var evidence=new OwnerUpgrade();evidence.setAccountId(account.getId());evidence.setConsentedAt(Instant.now());evidence.setCheckedAt(Instant.now());
            evidence.setEligibleAssetCount(count);evidence.setConsentVersion("owner-upgrade-v1");evidence.setSource(VneidTokenVerifier.SOURCE);upgrades.saveAndFlush(evidence);
            account.setRole(AuthAccount.Role.OWNER);accounts.flush();return auth.user(account);
        });
    }
    private static void requireUsable(AuthAccount a){if(a.getStatus()!=AuthAccount.Status.ACTIVE)throw error(HttpStatus.FORBIDDEN,"ACCOUNT_UNAVAILABLE","Tài khoản cần hoạt động trước khi nâng cấp.");}
    private static void requireCustomer(AuthAccount a){if(a.getRole()!=AuthAccount.Role.CUSTOMER)throw error(HttpStatus.FORBIDDEN,"FORBIDDEN","Chỉ tài khoản thông thường được yêu cầu nâng cấp thành chủ cho thuê.");}
}
