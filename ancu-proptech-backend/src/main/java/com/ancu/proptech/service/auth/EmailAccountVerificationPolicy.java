package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;

@Component @RequiredArgsConstructor
public class EmailAccountVerificationPolicy implements AccountVerificationPolicy {
    private final VerifiedIdentityPolicy identities;
    @Override public boolean isRentalVerified(AuthAccount account) {
        return account.isEmailVerified() || identities.isVerified(account.getId());
    }
    @Override public boolean isVerified(AuthAccount account) {
        // Evidence do Backend ghi nhận; không tin contactVerified hoặc cờ của client.
        return account.isEmailVerified()
                || ((account.hasRole(AuthAccount.Role.OWNER)||account.hasRole(AuthAccount.Role.ADMIN)) && account.isPhoneVerified())
                || identities.isVerified(account.getId());
    }
}
