package com.ancu.proptech.dto.billing;

public record BillingContext(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long contractId,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long apartmentId,String roomNumber,String tenantName,String period,
        String monthlyRent,String electricityStartReading,String electricityUnitPrice,
        String waterStartReading,String waterUnitPrice,long baselineVersion) {}
