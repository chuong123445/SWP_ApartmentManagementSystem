package com.ancu.proptech.dto.property;
import java.util.UUID;
public record OwnerPropertyResponse(UUID id, String name, String address, String approvalStatus,
        String rentalMode, String city, String district, String ward, long version,String verificationSource) {}
