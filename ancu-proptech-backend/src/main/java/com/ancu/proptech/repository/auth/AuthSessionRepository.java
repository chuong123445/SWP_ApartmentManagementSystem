package com.ancu.proptech.repository.auth;

import com.ancu.proptech.model.auth.AuthSession;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically=true,clearAutomatically=true)
    @org.springframework.data.jpa.repository.Query("update AuthSession s set s.revokedAt=:now where s.account.id=:accountId and s.revokedAt is null")
    int revokeAll(@org.springframework.data.repository.query.Param("accountId") UUID accountId,
                  @org.springframework.data.repository.query.Param("now") java.time.Instant now);
}
