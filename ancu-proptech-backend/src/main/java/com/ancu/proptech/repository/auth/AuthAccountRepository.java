package com.ancu.proptech.repository.auth;

import com.ancu.proptech.model.auth.AuthAccount;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AuthAccountRepository extends JpaRepository<AuthAccount, UUID> {
    Optional<AuthAccount> findByEmail(String email);
}
