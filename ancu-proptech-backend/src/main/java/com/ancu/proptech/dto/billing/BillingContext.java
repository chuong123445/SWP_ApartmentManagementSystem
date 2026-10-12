package com.ancu.proptech.dto.billing;
import java.util.UUID;
public record BillingContext(UUID contractId,UUID apartmentId,String roomNumber,String tenantName,String period,
        String monthlyRent,String electricityStartReading,String electricityUnitPrice,
        String waterStartReading,String waterUnitPrice,long baselineVersion) {}
