package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.ExternalIdentity;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service @RequiredArgsConstructor
public class VerifiedIdentityPolicy {
    public static final String LOCAL_DEMO = "LOCAL_DEMO";
    private final ExternalIdentityRepository identities;
    private final Environment environment;

    public Optional<ExternalIdentity> verified(Long accountId) {
        return identities.findById(accountId).filter(this::accepted);
    }

    public boolean isVerified(Long accountId) { return verified(accountId).isPresent(); }

    private boolean accepted(ExternalIdentity identity) {
        if (!"VERIFIED".equals(identity.getVerificationStatus())) return false;
        if (VneidTokenVerifier.SOURCE.equals(identity.getSource())) return true;
        if ("ADMIN_REVIEW".equals(identity.getSource())) return "urn:ancu:admin-review".equals(identity.getIssuer())
                && identity.getAccountId().toString().equals(identity.getSubject());
        return LOCAL_DEMO.equals(identity.getSource()) && environment.acceptsProfiles(Profiles.of("local"))
                && !environment.acceptsProfiles(Profiles.of("prod"))
                && "urn:ancu:local-demo".equals(identity.getIssuer())
                && identity.getAccountId().toString().equals(identity.getSubject());
    }
}
