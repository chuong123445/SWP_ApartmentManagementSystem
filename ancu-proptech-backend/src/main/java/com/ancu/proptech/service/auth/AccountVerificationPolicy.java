package com.ancu.proptech.service.auth;

import com.ancu.proptech.model.auth.AuthAccount;

/** Business eligibility policy; contact possession is not legal identity verification. */
public interface AccountVerificationPolicy {
    boolean isVerified(AuthAccount account);
}
