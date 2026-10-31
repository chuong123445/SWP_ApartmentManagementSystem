package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.auth.OwnerUpgradeRequest;
import com.ancu.proptech.model.auth.*;
import com.ancu.proptech.model.property.PropertySourceConsent;
import com.ancu.proptech.repository.auth.*;
import com.ancu.proptech.repository.property.PropertySourceConsentRepository;
import com.ancu.proptech.service.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static com.ancu.proptech.service.auth.AccountService.error;
@Service @RequiredArgsConstructor
public class PropertySourceConsentService {
    private final PropertyApplicantAccess applicants;
    private final jakarta.persistence.EntityManager em;
    private final AuthAccountRepository accounts;
    private final ExternalIdentityRepository identities;
    private final PropertySourceConsentRepository consents;
    private final Auth0AssetReader assets;
    public record Status(boolean consented,boolean assetServiceAvailable,long version) {}
    @Transactional(readOnly=true) public Status status(Jwt jwt){var a=applicants.verified(jwt);var i=identities.findById(a.getId()).orElseThrow();return new Status(matches(a,i),assets.isConfigured(),a.getVersion());}
    @Transactional public Status consent(Jwt jwt,OwnerUpgradeRequest input){
        var a=applicants.verified(jwt);accounts.findForIdentityUpdate(a.getId()).orElseThrow();em.refresh(a,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if(a.getVersion()!=input.getVersion())throw error(HttpStatus.CONFLICT,"VERSION_CONFLICT","Tài khoản đã thay đổi. Hãy tải lại.");
        var i=identities.findById(a.getId()).orElseThrow();var row=consents.findById(a.getId()).orElseGet(PropertySourceConsent::new);
        row.setAccountId(a.getId());row.setIssuer(i.getIssuer());row.setSubject(i.getSubject());row.setConsentedAt(Instant.now());row.setConsentVersion("property-selection-v2");consents.saveAndFlush(row);
        return new Status(true,assets.isConfigured(),a.getVersion());
    }
    public void require(AuthAccount account,ExternalIdentity identity){if(!matches(account,identity))throw error(HttpStatus.FORBIDDEN,"ASSET_CONSENT_REQUIRED","Cần đồng ý đọc dữ liệu tài sản sau khi chọn hình thức chính chủ.");}
    private boolean matches(AuthAccount a,ExternalIdentity i){return consents.findById(a.getId()).filter(c->c.getIssuer().equals(i.getIssuer())&&c.getSubject().equals(i.getSubject())).isPresent();}
}
