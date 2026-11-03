package com.ancu.proptech.dto.auth;

import com.ancu.proptech.model.auth.AuthAccount;
import jakarta.validation.constraints.*;
import java.time.Instant;

public final class AdminAccountDtos {
    private AdminAccountDtos() {}

    public enum Filter { ALL, ACTIVE, PENDING_VERIFICATION, LOCKED, INACTIVE, DELETED }
    public enum Action { LOCK, UNLOCK, DELETE }

    public record Command(@NotNull Action action, @NotNull @PositiveOrZero Long version,
                          @NotBlank @Size(max = 500) String reason) {}

    public record Account(String id, String email, String fullName, String role,
                          AuthAccount.Status status, Instant deletedAt, long version, boolean canManage,
                          boolean canUnlock) {}

    public record Profile(Account account, String phone, String address, String bio, java.time.LocalDate dateOfBirth,
                          boolean emailVerified, boolean phoneVerified) {}

    public record Contract(String id, String relationship, String roomNumber, String propertyName, String ownerName,
                           String tenantName, String status, java.time.LocalDate startDate, java.time.LocalDate endDate,
                           String monthlyRent) {}

    public record PaidInvoice(String id, String source, String contractId, String period, String roomNumber,
                              String ownerName, String tenantName, String amount, Instant paidAt) {}

    public record Result(String id, String outcome) {}
}
