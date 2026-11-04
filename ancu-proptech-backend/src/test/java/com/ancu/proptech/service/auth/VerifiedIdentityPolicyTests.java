package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.ExternalIdentity;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VerifiedIdentityPolicyTests {
    private ExternalIdentity identity(String source) {
        var i=new ExternalIdentity();i.setAccountId(3L);i.setSource(source);i.setVerificationStatus("VERIFIED");
        i.setIssuer("urn:ancu:local-demo");i.setSubject("3");return i;
    }
    private VerifiedIdentityPolicy policy(ExternalIdentity i,String... profile) {
        var repository=mock(ExternalIdentityRepository.class);when(repository.findById(3L)).thenReturn(Optional.of(i));
        var environment=new MockEnvironment();environment.setActiveProfiles(profile);
        return new VerifiedIdentityPolicy(repository,environment);
    }
    @Test void localEvidenceIsOnlyAcceptedInLocalProfileAndWithExactBinding() {
        var i=identity("LOCAL_DEMO");assertTrue(policy(i,"local").isVerified(3L));
        assertFalse(policy(i,"prod").isVerified(3L));assertFalse(policy(i,"test").isVerified(3L));
        assertFalse(policy(i,"local","prod").isVerified(3L));
        i.setSubject("4");assertFalse(policy(i,"local").isVerified(3L));
        i.setSubject("3");i.setIssuer("https://other.example.invalid/");assertFalse(policy(i,"local").isVerified(3L));
    }
    @Test void unknownAndUnverifiedSourcesNeverQualify() {
        var i=identity("UNKNOWN");assertFalse(policy(i,"local").isVerified(3L));
        i.setSource("AUTH0_VNEID_SIMULATION");assertTrue(policy(i,"prod").isVerified(3L));
        i.setVerificationStatus("NOT_VERIFIED");assertFalse(policy(i,"local").isVerified(3L));
    }
}
