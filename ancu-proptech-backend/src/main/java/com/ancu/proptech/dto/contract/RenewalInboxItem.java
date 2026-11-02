package com.ancu.proptech.dto.contract;
import java.time.*;
public record RenewalInboxItem(String id,String contractId,String contractNumber,String apartmentId,String apartmentTitle,String roomNumber,String propertyId,String propertyName,String customerName,String customerEmail,
    LocalDate startDate,LocalDate endDate,String monthlyRent,String status,String message,String decisionReason,Instant createdAt,Instant decidedAt,long version,String nextContractId,String nextContractStatus) {}
