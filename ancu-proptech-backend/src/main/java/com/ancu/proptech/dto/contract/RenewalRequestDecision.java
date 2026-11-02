package com.ancu.proptech.dto.contract;
import jakarta.validation.constraints.*;
public record RenewalRequestDecision(@NotNull @PositiveOrZero Long version, @NotNull Decision decision, @Size(max=1000) String reason) {
    public enum Decision { ACCEPT, REJECT }
}
