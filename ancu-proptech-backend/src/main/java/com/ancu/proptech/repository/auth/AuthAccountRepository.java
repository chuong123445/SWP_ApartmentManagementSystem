package com.ancu.proptech.repository.auth;

import com.ancu.proptech.model.auth.AuthAccount;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;


public interface AuthAccountRepository extends JpaRepository<AuthAccount, Long> {
    Optional<AuthAccount> findByEmail(String email);
    Optional<AuthAccount> findByGoogleSubject(String googleSubject);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from AuthAccount a where a.id=:id")
    Optional<AuthAccount> findForIdentityUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
