package com.ancu.proptech.dto.contract;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
public record HandoverCreate(@NotNull @PositiveOrZero Long version,
    @NotNull LocalDate returnDate,
    @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer=10,fraction=0) BigDecimal electricityReading,
    @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer=10,fraction=0) BigDecimal waterReading,
    @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer=10,fraction=0) BigDecimal electricityStartReading,
    @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer=10,fraction=0) BigDecimal waterStartReading,
    @AssertTrue(message="Cần xác nhận đủ chìa khóa và tài sản bàn giao.") boolean keysReturned,
    @NotBlank @Size(max=3000) String conditionNotes,
    @NotNull @DecimalMin("0") @Digits(integer=13,fraction=2) BigDecimal deductionAmount,
    @AssertTrue(message="Cần xác nhận đã rà soát thông tin bàn giao.") boolean consent) {}
