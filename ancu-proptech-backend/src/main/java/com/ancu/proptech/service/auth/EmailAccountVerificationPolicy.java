package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import org.springframework.stereotype.Component;

@Component
public class EmailAccountVerificationPolicy implements AccountVerificationPolicy {
    @Override public boolean isVerified(AuthAccount account) {
        // Customer onboarding currently requires email OTP. Replace this policy when
        // an approved identity verification method is implemented; never trust a client flag.
        return account.getRole() == AuthAccount.Role.CUSTOMER
                ? account.isEmailVerified() : account.isEmailVerified() || account.isPhoneVerified();
    }
}
