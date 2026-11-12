package com.ancu.proptech.repository.auth;
import com.ancu.proptech.model.auth.ActionOtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface ActionOtpChallengeRepository extends JpaRepository<ActionOtpChallenge,String> {
    Optional<ActionOtpChallenge> findFirstByAccountIdAndPurposeOrderByCreatedAtDesc(Long accountId,String purpose);
    long countByAccountIdAndPurposeAndCreatedAtAfter(Long accountId,String purpose,Instant after);
    List<ActionOtpChallenge> findByAccountIdAndPurposeAndUsedAtIsNullAndInvalidatedAtIsNull(Long accountId,String purpose);
}
