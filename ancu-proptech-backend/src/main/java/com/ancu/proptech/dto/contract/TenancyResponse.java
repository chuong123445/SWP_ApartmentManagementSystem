package com.ancu.proptech.dto.contract;
import java.time.LocalDate;
import java.util.UUID;
public record TenancyResponse(UUID id,UUID apartmentId,String roomNumber,String apartmentTitle,String propertyName,
        UUID customerId,String customerName,String customerEmail,String status,LocalDate startDate,LocalDate endDate,
        String monthlyRent,long version) {}
