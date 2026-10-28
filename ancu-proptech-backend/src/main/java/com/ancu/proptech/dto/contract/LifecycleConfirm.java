package com.ancu.proptech.dto.contract;
import jakarta.validation.constraints.*;
public record LifecycleConfirm(@NotNull @PositiveOrZero Long version,
    @AssertTrue(message="Cần xác nhận đồng ý trước khi thực hiện.") boolean consent) {}
