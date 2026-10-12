package com.ancu.proptech.repository.auth;
import com.ancu.proptech.model.auth.EmailChangeChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface EmailChangeChallengeRepository extends JpaRepository<EmailChangeChallenge,UUID> {
    Optional<EmailChangeChallenge> findByIdAndAccountId(UUID id,UUID accountId);
    Optional<EmailChangeChallenge> findFirstByAccountIdOrderByCreatedAtDescIdDesc(UUID accountId);
    List<EmailChangeChallenge> findByAccountIdAndUsedAtIsNullAndInvalidatedAtIsNull(UUID accountId);
    long countByAccountIdAndCreatedAtAfter(UUID accountId,Instant since);
}
