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

    public record Result(String id, String outcome) {}
}
