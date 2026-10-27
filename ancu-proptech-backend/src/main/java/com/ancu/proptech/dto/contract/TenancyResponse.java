package com.ancu.proptech.dto.contract;
import java.time.LocalDate;

public record TenancyResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id,@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long apartmentId,String roomNumber,String apartmentTitle,String propertyName,
        @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long customerId,String customerName,String customerEmail,String status,LocalDate startDate,LocalDate endDate,
        String monthlyRent,long version) {}
