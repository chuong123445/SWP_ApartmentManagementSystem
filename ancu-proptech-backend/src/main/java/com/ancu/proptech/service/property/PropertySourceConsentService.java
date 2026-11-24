package com.ancu.proptech.service.property;
import com.ancu.proptech.dto.auth.OwnerUpgradeRequest;
import com.ancu.proptech.model.auth.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
/** Consent records remain historical; they no longer authorize asset access. */
@Service @RequiredArgsConstructor
public class PropertySourceConsentService {
    private final AssetManagementAccess access;
    public record Status(boolean consented,boolean assetServiceAvailable,long version) {}
    @Transactional(readOnly=true) public Status status(Jwt jwt) { return new Status(false,false,access.read(jwt).getVersion()); }
    public Status consent(Jwt jwt,OwnerUpgradeRequest input) { throw VneidPropertyImportService.retired(); }
    public void require(AuthAccount account,ExternalIdentity identity) { throw VneidPropertyImportService.retired(); }
}
