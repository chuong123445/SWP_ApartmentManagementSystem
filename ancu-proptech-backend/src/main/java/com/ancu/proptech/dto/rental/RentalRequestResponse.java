package com.ancu.proptech.dto.rental;
import java.time.Instant;

public record RentalRequestResponse(@com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long id, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long apartmentId, String apartmentTitle, String address,
                                    String advertisedMonthlyRent, @com.fasterxml.jackson.annotation.JsonFormat(shape=com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING) Long customerId, String customerName,
                                    String customerEmail, String message, String status, Instant createdAt, long version, String decisionReason,
                                    String contractId, boolean contractCompleted) {}
