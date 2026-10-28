package com.ancu.proptech.dto.identity;
import java.time.*;
public record IdentityProfileResponse(String legalName,String documentNumber,LocalDate dateOfBirth,
        LocalDate issueDate,String issuePlace,String permanentAddress,String currentAddress,
        String verificationStatus,Instant updatedAt,long version,boolean localFixture) {}
