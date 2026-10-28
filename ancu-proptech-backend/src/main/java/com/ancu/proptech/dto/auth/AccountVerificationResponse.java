package com.ancu.proptech.dto.auth;

import java.time.*;

/** Thông tin self-only; không trả entity, token hoặc external subject. */
public record AccountVerificationResponse(boolean emailVerified, Vneid vneid) {
    public record Vneid(String status, Instant verifiedAt, Citizen identity) {}
    public record Citizen(String documentNumber, String legalName, LocalDate dateOfBirth, String gender, String address) {}
}
