package com.ancu.proptech.dto.billing;
import java.time.*;
import java.util.UUID;
public record InvoiceResponse(UUID id,UUID contractId,UUID apartmentId,UUID customerId,String roomNumber,String apartmentTitle,
        String tenantName,String period,LocalDate dueDate,String monthlyRent,
        String electricityStartReading,String electricityEndReading,String electricityQuantity,String electricityUnitPrice,String electricityAmount,
        String waterStartReading,String waterEndReading,String waterQuantity,String waterUnitPrice,String waterAmount,
        String totalAmount,String status,Instant createdAt,Instant sentAt,long version) {}
