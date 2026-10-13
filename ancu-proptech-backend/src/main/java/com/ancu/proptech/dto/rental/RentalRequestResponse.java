package com.ancu.proptech.dto.rental;
import java.time.Instant;
import java.util.UUID;
public record RentalRequestResponse(UUID id, UUID apartmentId, String apartmentTitle, String address,
                                    String advertisedMonthlyRent, UUID customerId, String customerName,
                                    String customerEmail, String message, String status, Instant createdAt, long version, String decisionReason) {}
