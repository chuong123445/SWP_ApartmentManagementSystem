package com.ancu.proptech.repository.auth;
import com.ancu.proptech.model.auth.EmailChangeChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface EmailChangeChallengeRepository extends JpaRepository<EmailChangeChallenge,Long> {
    Optional<EmailChangeChallenge> findByIdAndAccountId(Long id,Long accountId);
    Optional<EmailChangeChallenge> findFirstByAccountIdOrderByCreatedAtDescIdDesc(Long accountId);
    List<EmailChangeChallenge> findByAccountIdAndUsedAtIsNullAndInvalidatedAtIsNull(Long accountId);
    long countByAccountIdAndCreatedAtAfter(Long accountId,Instant since);
}
