package com.ancu.proptech.dto.auth;

import java.time.Instant;

/** Private self-only preview; no token, CCCD, issuer or subject is exposed. */
public record VneidNameConfirmation(String status, String confirmationId, String displayName,
                                    String legalName, Instant expiresAt) {
    @Override public String toString() { return "VneidNameConfirmation[redacted]"; }
}
