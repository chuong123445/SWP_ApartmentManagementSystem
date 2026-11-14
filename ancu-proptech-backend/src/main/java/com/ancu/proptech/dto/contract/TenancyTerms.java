package com.ancu.proptech.dto.contract;

import java.math.BigDecimal;
import java.time.Instant;

/** Internal projection: deliberately excludes snapshots and signature image bytes. */
public record TenancyTerms(Long contractId, BigDecimal deposit, Instant ownerSignedAt, Instant customerSignedAt) {
    public String signingStatus() {
        if (ownerSignedAt != null && customerSignedAt != null) return "BOTH_SIGNED";
        if (ownerSignedAt != null) return "OWNER_SIGNED";
        if (customerSignedAt != null) return "CUSTOMER_SIGNED";
        return "UNSIGNED";
    }
}
