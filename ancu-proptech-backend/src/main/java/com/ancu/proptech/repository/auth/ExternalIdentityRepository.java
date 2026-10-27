package com.ancu.proptech.repository.auth;

import com.ancu.proptech.model.auth.ExternalIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, Long> {
    Optional<ExternalIdentity> findByIssuerAndSubject(String issuer, String subject);
    boolean existsByDocumentNumber(String documentNumber);
    boolean existsByAccountIdAndVerificationStatus(Long accountId, String verificationStatus);
}
