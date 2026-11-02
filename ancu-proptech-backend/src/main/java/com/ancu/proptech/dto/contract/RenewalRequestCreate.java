package com.ancu.proptech.dto.contract;
import jakarta.validation.constraints.*;
public record RenewalRequestCreate(@NotNull @PositiveOrZero Long version, boolean consent, @Size(max=1000) String message) {}
