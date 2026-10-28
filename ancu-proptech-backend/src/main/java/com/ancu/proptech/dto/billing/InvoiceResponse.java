package com.ancu.proptech.dto.billing;
import java.time.*;

public record InvoiceResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long contractId,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long apartmentId,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long customerId,String roomNumber,String apartmentTitle,
        String tenantName,String period,LocalDate dueDate,String monthlyRent,
        String electricityStartReading,String electricityEndReading,String electricityQuantity,String electricityUnitPrice,String electricityAmount,
        String waterStartReading,String waterEndReading,String waterQuantity,String waterUnitPrice,String waterAmount,
        String totalAmount,String status,Instant createdAt,Instant sentAt,long version,String paymentStatus,Instant paidAt) {}
