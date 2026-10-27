package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import com.ancu.proptech.repository.auth.ExternalIdentityRepository;

@Component @RequiredArgsConstructor
public class EmailAccountVerificationPolicy implements AccountVerificationPolicy {
    private final ExternalIdentityRepository identities;
    @Override public boolean isVerified(AuthAccount account) {
        // Evidence do Backend ghi nhận; không tin contactVerified hoặc cờ của client.
        return account.isEmailVerified()
                || (account.getRole() != AuthAccount.Role.CUSTOMER && account.isPhoneVerified())
                || identities.existsByAccountIdAndVerificationStatus(account.getId(), "VERIFIED");
    }
}
