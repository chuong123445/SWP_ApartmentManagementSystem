package com.ancu.proptech.repository.auth;

import com.ancu.proptech.model.auth.AuthAccount;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;


public interface AuthAccountRepository extends JpaRepository<AuthAccount, Long> {
    @org.springframework.data.jpa.repository.Query("""
        select a from AuthAccount a
        where (lower(a.email) like :pattern or lower(a.fullName) like :pattern)
          and ((:deletedOnly = true and a.deletedAt is not null)
               or (:deletedOnly = false and a.deletedAt is null and (:status is null or a.status = :status)))
        """)
    org.springframework.data.domain.Page<AuthAccount> searchForAdmin(
        @org.springframework.data.repository.query.Param("pattern") String pattern,
        @org.springframework.data.repository.query.Param("status") AuthAccount.Status status,
        @org.springframework.data.repository.query.Param("deletedOnly") boolean deletedOnly,
        org.springframework.data.domain.Pageable pageable);
    Optional<AuthAccount> findByEmail(String email);
    Optional<AuthAccount> findByGoogleSubject(String googleSubject);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from AuthAccount a where a.id=:id")
    Optional<AuthAccount> findForIdentityUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
