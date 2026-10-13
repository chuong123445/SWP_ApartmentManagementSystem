package com.ancu.proptech.dto.rental;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record RentalDecision(
        @NotNull Decision decision,
        String reason,
        @PositiveOrZero long version
) {
    public enum Decision { ACCEPT, REJECT }
}
