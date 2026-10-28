package com.ancu.proptech.repository.auth;

import com.ancu.proptech.model.auth.RefreshCredential;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;


public interface RefreshCredentialRepository extends JpaRepository<RefreshCredential, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from RefreshCredential t join fetch t.session s join fetch s.account where t.tokenHash = :hash")
    Optional<RefreshCredential> findForRotation(@Param("hash") String hash);
}
