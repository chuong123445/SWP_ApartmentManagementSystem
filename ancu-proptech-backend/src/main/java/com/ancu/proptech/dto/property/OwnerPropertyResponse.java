package com.ancu.proptech.dto.property;

public record OwnerPropertyResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, String name, String address, String approvalStatus,
        String rentalMode, String city, String district, String ward, long version,String verificationSource,
        boolean onboardingApplication,String rightType,java.time.LocalDate rightsValidFrom,java.time.LocalDate rightsValidUntil) {}
