package com.ancu.proptech.repository.auth;
import com.ancu.proptech.model.auth.AccountReauthentication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.Optional;
public interface AccountReauthenticationRepository extends JpaRepository<AccountReauthentication,Long> {
    long countByAccountIdAndCreatedAtAfter(Long accountId,Instant after);
    Optional<AccountReauthentication> findByProofHash(String hash);
    boolean existsByCredentialHash(String hash);
}
