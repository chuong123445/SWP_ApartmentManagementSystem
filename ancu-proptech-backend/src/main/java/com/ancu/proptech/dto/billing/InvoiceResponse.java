package com.ancu.proptech.dto.billing;
import java.time.*;

@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
public record InvoiceResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long contractId,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long apartmentId,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long customerId,String roomNumber,String apartmentTitle,
        String tenantName,String period,LocalDate dueDate,String monthlyRent,
        String electricityStartReading,String electricityEndReading,String electricityQuantity,String electricityUnitPrice,String electricityAmount,
        String waterStartReading,String waterEndReading,String waterQuantity,String waterUnitPrice,String waterAmount,
        String totalAmount,String status,Instant createdAt,Instant sentAt,long version,String paymentStatus,Instant paidAt,String waterBillingMode,int occupantCount,String internetFee,String garbageFee,long billingVersion,String kind,LocalDate coverageStart,LocalDate coverageEnd,int rentMonths,String rentUnitPrice,boolean cancellable,String cancellationBlockReason,String rentCalculation) {
    public InvoiceResponse {
        if (monthlyRent == null) monthlyRent = "0";
        if (electricityStartReading == null) electricityStartReading = "0";
        if (electricityEndReading == null) electricityEndReading = "0";
        if (electricityQuantity == null) electricityQuantity = "0";
        if (electricityUnitPrice == null) electricityUnitPrice = "0";
        if (electricityAmount == null) electricityAmount = "0";
        if (waterStartReading == null) waterStartReading = "0";
        if (waterEndReading == null) waterEndReading = "0";
        if (waterQuantity == null) waterQuantity = "0";
        if (waterUnitPrice == null) waterUnitPrice = "0";
        if (waterAmount == null) waterAmount = "0";
        if (totalAmount == null) totalAmount = "0";
        if (paymentStatus == null) paymentStatus = "UNPAID";
        if (waterBillingMode == null) waterBillingMode = "METERED";
        if (internetFee == null) internetFee = "0";
        if (garbageFee == null) garbageFee = "0";
        if (kind == null) kind = "UTILITY";
        if (rentUnitPrice == null) rentUnitPrice = "0";
    }
}
